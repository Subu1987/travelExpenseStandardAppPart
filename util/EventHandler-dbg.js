/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/Context",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	"sap/fin/travel/lib/reuse/util/AppComponent",
	"sap/fin/travel/lib/reuse/util/ODataModelUtil",
	"sap/m/MessageBox",
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/m/PDFViewer",
	"sap/m/MessageToast",
	"sap/fin/travel/lib/reuse/util/ActionUtil",
	"sap/fin/travel/lib/reuse/util/NavigationUtil",
	"sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/fin/travel/lib/reuse/util/TravelUtil",
	"sap/fin/travel/lib/reuse/util/PersistenceHelper",
	"sap/fin/travel/lib/reuse/util/FCLayoutUtil",
	"sap/fin/travel/lib/reuse/util/CustomDataUtil",
	"sap/fin/travel/lib/reuse/util/PaginatorHelper",
	"sap/fin/travel/lib/reuse/util/AnnotationHelper",
	"sap/m/PlacementType",
	"sap/ui/core/routing/HashChanger",
	"sap/ui/model/json/JSONModel",
	"sap/ui/base/Event",
	"sap/fin/travel/lib/reuse/util/ShareHelper",
	"sap/fin/travel/lib/reuse/util/FragmentHelper",
	"sap/ui/core/MessageType",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/ControlUtil",
	"sap/fin/travel/lib/reuse/util/ConfigurationUtil",
	"sap/fin/travel/lib/reuse/util/AppDescriptorUtil",
	"sap/fin/travel/lib/reuse/util/MessageParser"
], function (BaseObject, Context, XMLTemplateProcessor, XMLPreprocessor, AppComponent, ODataModelUtil, MessageBox, I18n, PDFViewer,
	MessageToast, ActionUtil, NavigationUtil, MessageUtil, TravelUtil, PersistenceHelper, FCLayoutUtil, CustomDataUtil, PaginatorHelper,
	AnnotationHelper, PlacementType, HashChanger, JSONModel, Event, ShareHelper, FragmentHelper, MessageType, Utils, ControlUtil,
	ConfigurationUtil, AppDescriptorUtil, MessageParser) {
	"use strict";

	function getMethods(oController) {

		oController._lastCreatedItem = new Map();

		/**
		 * Retrieve smart form and perform the regular check on them
		 * In addition, it manually verifies if mandatory fields are filled or not (the default check allows mandatory values to be null if the underlying type is nullable)
		 *
		 * @param bAll: default false. If the bAll is set, all the smart form are checked. Otherwise, only the smart forms contained in the current controller's view are checked
		 * @param fnSuccess: success function to execute. If not provided, we remain on a synchronous process. Otherwise, the success function is called if there are no errors on the fields
		 * @return true if the check is consistent. False otherwise
		 *
		 */
		function checkAppForms(oEvent, bAll, fnSuccess) {

			//determine which process we should take: synchronous with checkClientError or async with checkValuesValidity
			var bCheckOldFashion = true;
			if (fnSuccess && typeof fnSuccess === "function" && ConfigurationUtil.compareVersion(ConfigurationUtil.global.smartFieldCheckValuesValidity,
					sap.ui.version)) { // if smartFieldCheckValuesValidity available

				bCheckOldFashion = false;
			}

			MessageUtil.get().cleanValidationMessages();
			var fnById = oController.getView().byId.bind(oController);
			if (true === bAll) {
				fnById = sap.ui.getCore().byId;
			}
			var aTravelForm = $("[id*=TravelForm]").toArray();
			var aErrors = [];
			var aCheckPromises = [];
			var sErrorMessage = "";

			// return field error message if exists or create one using default i18n key
			var _fnGetErrorMessage = function (oField, sKey) {
				var sFieldError = oField.getValueStateText();
				if (Utils.isEmptyObjectOrString(sFieldError)) {
					var sMessage = I18n.get().getText(oController, sKey, [oField.getTextLabel()]);
					oField.setValueStateText(sMessage);
					return sMessage;
				} else {
					return sFieldError;
				}
			};
			// add error in message popover, called after all Promises has been resovled.
			var _fnFillError = function () {
				if (aErrors && aErrors.length > 0) {
					//should aggregate all the errors
					MessageUtil.get().updateMessageManager(aErrors);
					return false;
				}
				return true;
			};

			for (var i = 0; i < aTravelForm.length; i++) {
				var sf = fnById(aTravelForm[i].id);
				if (sf && sf.getMetadata && sf.getMetadata().getName() ===
					"sap.ui.comp.smartform.SmartForm" && sf.getBindingContext()) {
					//if the entity has been deleted, it should not be checked
					var bContextDeleted = Utils.isEmptyObjectOrString(sf.getBindingContext()) || Utils.isEmptyObjectOrString(oController.getView().getModel()
						.getObject(sf.getBindingContext()
							.getPath()));
					if (bContextDeleted) {
						continue;
					}
					// set Input field in error and add error message to be displayed in popover
					var _fnHandleInvalidField = function (oField) {
						oField.setValueState("Error");
						aErrors.push({
							message: _fnGetErrorMessage(oField, "FIELD_ERROR"),
							target: oField.getBindingContext().getPath() + "/" + oField.getDataProperty().typePath
						});
					};

					sf.getSmartFields().forEach(function (e) {
						var bValidity = false;
						var sMessage = "";
						var bMandatory = e.getMandatory() && e.getEditable() && e.getVisible() && "string" === typeof e.getValue() && Utils.isEmptyObjectOrString(
							e.getValue());
						// Handle error for mandatory fields
						if (bMandatory) {
							e.setValueState("Error");
							aErrors.push({
								message: _fnGetErrorMessage(e, "MANDATORY_FIELD_ERROR"),
								target: e.getBindingContext().getPath() + "/" + e.getDataProperty().typePath
							});
						} else {
							// Handle error for other fields
							e.setValueState(e.getValueState()); // reset oError state to avoid unwanted errors.
							if (false === bCheckOldFashion) { // if smartFieldCheckValuesValidity available
								aCheckPromises.push(e.checkValuesValidity().catch(function () {
									_fnHandleInvalidField(e);
								}));
							} else {
								if (e.checkClientError()) {
									_fnHandleInvalidField(e);
								}
							}
						}
					});
					if (bAll !== true && !Utils.isEmptyObjectOrString(sf.check())) {
						break;
					}
				}
			}

			if (true === bCheckOldFashion) {
				var bFormOk = _fnFillError();
				if (bFormOk && fnSuccess && typeof fnSuccess === "function") {
					fnSuccess();
				}
				return bFormOk;
			} else {
				if (0 === aCheckPromises.length) {
					fnSuccess();
					return;
				}

				//at the end, check errors!
				Promise.all(aCheckPromises).then(function (aCheck) {
					if (_fnFillError()) {
						fnSuccess();
					}
				});
			}
		}

		function _getManifestControllerExtensions() {
			var sControllerName = oController.getMetadata().getName();
			var oManifest = oController.getOwnerComponent().getManifest();
			var oEntitySetControllerExtensions = oManifest && oManifest["sap.ui5"] && oManifest["sap.ui5"]["extends"] && oManifest["sap.ui5"][
				"extends"
			]["extensions"] && oManifest["sap.ui5"]["extends"]["extensions"]["sap.ui.controllerExtensions"] && oManifest["sap.ui5"]["extends"][
				"extensions"
			]["sap.ui.controllerExtensions"][sControllerName] && oManifest["sap.ui5"]["extends"]["extensions"]["sap.ui.controllerExtensions"][
				sControllerName
			]["sap.ui.generic.app"];

			return oEntitySetControllerExtensions;
		}

		function initListPageFilterBar() {
			var fnProfilesLoaded = function (oData) {
				//profile contains Pernr and Travelername as well as other field to detect draft trips
				var profile;
				if (oData && oData.results) {
					$.each(oData.results, function (i, e) {
						if (e.Isself === true) {
							profile = oData.results[0];
							return false;
						}
					});
				} else { //single profile
					profile = oData;
				}

				var oFilterBar = oController.getView().byId("listPageFilterBar");
				
				var fnFilterBarInitialized = function () {
					if (undefined === profile) {
						//make sure that no cache remains
						oFilterBar.getControlByKey("Pernr").setValue("");
						oFilterBar.getControlByKey("Travelername").setValue("");
						AppComponent.get().updateGlobalModel("/userprofile", oData.results.shift());
						return;
					}
					// Check that filter bar is ready.
					if (oFilterBar.getControlByKey("Pernr") && oFilterBar.getControlByKey("Travelername") && oFilterBar.getConditionTypeByKey(
							"Datedep")) {

						
						//Default Date - Last 6 months
						var sOperation = "FROM";
						var d = new Date(); // today date
						d.setMonth(d.getMonth() - 6);
						var sDate = sap.ui.core.format.DateFormat.getDateInstance().format(d);
						//Default Pernr & Employee & Features
						if (oFilterBar.getConditionTypeByKey("Datedep")) {
							oFilterBar.getConditionTypeByKey("Datedep").setOperation(sOperation);
							oFilterBar.getConditionTypeByKey("Datedep").setDefaultValues(sDate, sDate);
						}
						if (oFilterBar.getControlByKey("Pernr")) {
							oFilterBar.getControlByKey("Pernr").setValue(profile.Pernr);
							
						}
						if (oFilterBar.getControlByKey("Travelername")) {
							oFilterBar.getControlByKey("Travelername").setValue(profile.Fullname);
						}
						
						var bIsFilterBarData = ConfigurationUtil.compareVersion(ConfigurationUtil.global.smartFilterBarFilterData,
							sap.ui.version);
						if (bIsFilterBarData){
							oFilterBar.setFilterData({
								Pernr: profile.Pernr,
								Travelername: profile.Fullname
							});
						}

						// Default value is not properly handled by SmartFilterBar in case of DateRange Control.
						// Event if we change filter data with oFilterBar.getConditionTypeByKey changes are propagated by DateRangeType which is to late
						// Value will not be handled by the FilterProvider and parameter wont be part of the OData request
						// As a workaround to do change Filter OData model manually accessing the private _oFilterProvider
						var oFilterData = undefined;
						if (oFilterBar.hasOwnProperty("_oFilterProvider") && oFilterBar._oFilterProvider.getModel() && oFilterBar._oFilterProvider.getModel()
							.getData()) {
							oFilterData = oFilterBar._oFilterProvider.getModel().getData();
						}
						if (oFilterData && oFilterData.hasOwnProperty("Datedep") && oFilterData["Datedep"].hasOwnProperty("conditionTypeInfo") &&
							oFilterData["Datedep"].conditionTypeInfo.hasOwnProperty("data")) {
							oFilterData["Datedep"].conditionTypeInfo.data.operation = sOperation;
							oFilterData["Datedep"].conditionTypeInfo.data.value1 = d;
							oFilterBar.setFilterData(oFilterData, false);
						}

						ODataModelUtil
							.get().saveCurrentTripContext({
								Pernr: profile.Pernr,
								Tripno: profile.Unsavedtripnumber
							});

						AppComponent.get().updateGlobalModel("/userprofile", profile);
						// oController.XXXsUnsavedtripnumber = profile.Unsavedtripnumber;
						oController.byId("template::FilterText").setText(oFilterBar.retrieveFiltersWithValuesAsText());

						var oSmartTable = oController.getView().byId("listPageSmartTableID");
						oSmartTable.setEnableAutoBinding(true);
						oSmartTable.rebindTable();

						//restore state as it was at application start-up
						oFilterBar.attachReset(function () {
							if (oFilterBar.getConditionTypeByKey("Datedep")) {
								oFilterBar.getConditionTypeByKey("Datedep").setDefaultValues(this.date, this.date);
							}
							oFilterBar.getControlByKey("Pernr").setValue(this.pernr);
							oFilterBar.getControlByKey("Travelername").setValue(this.travelername);
						}.bind({
							operation: sOperation,
							date: sDate,
							pernr: profile.Pernr,
							travelername: profile.Fullname
						}));
					}
				};

				if (oFilterBar) {
					//in some cases, the filter bar is not yet initialized. But the API does not allow us to know
					//if the filter bar was initialized or not already. And the attacheInitialized only trigger
					//the callback when initialization completes (not after)
					oFilterBar.attachInitialized(fnFilterBarInitialized);
					fnFilterBarInitialized();
				}

			};

			var urlParameters = {
				$skip: 0,
				$top: 1
			};

			var oCtxt = ODataModelUtil.get().getCurrentTripContext();
			if (!Utils.isEmptyObjectOrString(oCtxt) && oCtxt.Pernr) { //Pernr already in the ctxt at initialization
				PersistenceHelper.read(oController.getView().getModel(), "/UserProfiles(Pernr='" + oCtxt.Pernr + "')", {
					success: fnProfilesLoaded
				});
			} else {
				PersistenceHelper.read(oController.getView().getModel(), "/UserProfiles", {
					success: fnProfilesLoaded,
					urlParameters: urlParameters
				});
			}

			//Register to the propertyChange-event of the OData model of the app
			var fnPropertyChanged = function (oEvent) {
				var oEventSource = oEvent.getSource();
				var oContext = oEvent.getParameter("context");
				
				//isTransient on the context appears in 1.94. It indicates whether entity is frontend-created.
				//we do want to bypass side effects on frontend-created entities
				var bIsTransient = ConfigurationUtil.compareVersion(ConfigurationUtil.global.isTransient,
					sap.ui.version);
				var bByPassSideEffectOnCreatedEntity = bIsTransient ? true === oContext.isTransient() : oContext.bCreated === true;
				if (bByPassSideEffectOnCreatedEntity) {
					//entity is just created, not synced with the backend. Side effect should not be taken place
					//XXX attention, this is assumption so far. We should check for potential misunderstanding of this bCreated property
					return;
				}
				var oModel = oController.getView().getModel();
				var oMetaModel = oModel.getMetaModel();
				var oEntitySetMetaModel = oMetaModel.getODataEntitySet(oContext.getPath().split("(")[0].substring(1));
				if (!oEntitySetMetaModel) {
					return;
				}

				var submitChangeOrigin = PersistenceHelper.SUBMIT_CHANGE_ORIGIN.UNKNOWN;

				//var oEntityType = oMetaModel.getODataEntityType(oEntitySetMetaModel.entityType);
				//var sEntityTypeName = oEntityType.name;

				//If the below manifest search is too power-consuming, we might cache the mButtonsId set result.
				//lookup for struct containing EntitySet == sMainEntitySet. Using getOwnProeprtyNames instead of Object.entries/values/keys :S
				//also, for es5 compatibility reason, we are not using for (var e of Iterable) :S
				var bNotSideEffectable = false;
				var oEntitySetControllerExtensions = _getManifestControllerExtensions();
				oEntitySetControllerExtensions = oEntitySetControllerExtensions || [];
				Object.getOwnPropertyNames(oEntitySetControllerExtensions).forEach(function (e, index, array) {
					if (oEntitySetControllerExtensions[e].EntitySet === oEntitySetMetaModel.name) {
						// Look at Object Page Side-Effect configuration
						if (oEntitySetControllerExtensions[e].hasOwnProperty("Side-Effect") && false === oEntitySetControllerExtensions[e]["Side-Effect"]) {
							bNotSideEffectable = true;
						}
					}

				});
				if (bNotSideEffectable) {
					jQuery.sap.log.info("Side-effect is prevented: manifest configuration indicates a by-pass");
					return;
				}

				//do not trigger side effect in case of entity in display mode
				var bDisplayMode = oContext.getProperty("DisplayMode");
				if (bDisplayMode && bDisplayMode === true) {
					return;
				}

				if (ODataModelUtil.get().hasPendingChanges(oModel)) {
					var oPendingChanges;
					oPendingChanges = oModel.getPendingChanges();
					if (oPendingChanges !== undefined) {
						if (oContext && oContext instanceof sap.ui.model.Context) {
							var sEntitySet = _getEntitySetFromContext(oContext);
							var oMetaModel = oContext.getModel().getMetaModel();
							var sEntityType = oMetaModel.getODataEntitySet(sEntitySet).entityType;
							var oEntityType = oMetaModel.getODataEntityType(sEntityType);

							var aPendingChanges = Object.keys(oPendingChanges) || [];
							/*	The OData model returns also a __metadata object with the canonical URL and further
								information. As we don't want to check if sideEffects are annotated for this
								property we remove it from the pending changes
							*/
							var iMetaDataIndex = aPendingChanges.indexOf("__metadata");
							if (iMetaDataIndex > -1) {
								aPendingChanges.splice(iMetaDataIndex, 1);
							}

							// Force submitChanges for Mandatory fields to update messages
							var bSubmitChanges = false;
							//Refresh after change should not be triggered when the side effect is triggered on a main entity (TravelExpenses or TravelRequests)
							var bRefreshAfterChange = "TravelExpenses" !== sEntitySet && "TravelRequests" !== sEntitySet;
							var sPathProperty = oEvent.getParameter("path");
							// Check if this feature is enabled
							var oComponentData = oController.getOwnerComponent().getComponentData();
							if (!oComponentData.hasOwnProperty("oAppDescriptor") || AppDescriptorUtil.getFeature(oComponentData.oAppDescriptor[
									"sap.ui.generic.app"], TravelUtil.Features.CheckMandatoryField) !== false) {
								for (var k = 0; k < oEntityType.property.length; k++) {
									if (oEntityType.property[k].name === sPathProperty) {
										// Look for sap:field-control inline annotation
										if (oEntityType.property[k].hasOwnProperty("sap:field-control")) {
											// Read FC property
											var sPathFcProperty = oEntityType.property[k]["sap:field-control"];
											var iFcValue = oModel.getProperty(oContext.getPath())[sPathFcProperty];
											var oldValue = oModel.getOriginalProperty(oContext.getPath())[sPathProperty];
											var newValue = oModel.getProperty(oContext.getPath())[sPathProperty];
											if (iFcValue === 7 && (Utils.isEmptyObjectOrString(oldValue) || Utils.isEmptyObjectOrString(newValue))) {
												// The old value was empty or the new value is empty
												bSubmitChanges = true;
												submitChangeOrigin = PersistenceHelper.SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_MANDATORY;
												break;
											}
										}
										break;
									}
								}
							}

							///Read Side-effects in annotations
							var aNavPropertyPath = [];
							var aAnnocations = oContext.getModel().getServiceAnnotations();
							for (var sAnnotationProp in aAnnocations) {
								if (sAnnotationProp === sEntityType) { // e.g. target:"TRV_MTR_SRV.CostAssignment"
									for (var sEntityProp in aAnnocations[sEntityType]) {
										if (sEntityProp === "com.sap.vocabularies.Common.v1.SideEffects#SideEffects") {
											var oSideEffect = aAnnocations[sEntityType]["com.sap.vocabularies.Common.v1.SideEffects#SideEffects"];
											if (oSideEffect.hasOwnProperty("SourceProperties")) {
												if (oSideEffect.SourceProperties.length == 0) {
													//Side Effects defined for the complete entity - no need to check properties changed
													bSubmitChanges = true;
													submitChangeOrigin = PersistenceHelper.SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION; //annotation side effet is more imporatant than mandatory
												} else {
													for (var k = 0; k < oSideEffect.SourceProperties.length; k++) {
														for (var l = 0; l < aPendingChanges.length; l++) {
															if (oPendingChanges[aPendingChanges[l]].hasOwnProperty(oSideEffect.SourceProperties[k].PropertyPath)) {
																//Pending Changes contains at least one property defined as Source Properties in Side-effects
																bSubmitChanges = true;
																submitChangeOrigin = PersistenceHelper.SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION; //annotation side effet is more imporatant than mandatory
															}
														}
													}
												}
												if (oSideEffect.hasOwnProperty("TargetEntities")) {
													if (oSideEffect.TargetEntities.length > 0) {
														// Read Navigation Properties to refresh corresponding sub-entities
														for (var k = 0; k < oSideEffect.TargetEntities.length; k++) {
															var sNavPropertyPath = oSideEffect.TargetEntities[k].NavigationPropertyPath;
															var sPath = oContext.getPath();
															var mParameters = {};

															if (0 !== sPath.indexOf("/")) {
																sPath = "/" + sPath;
															}

															//optimization to apply side effect only if the model is properly loaded for the target entity. It might happens when main entity triggers side effects on sub entity that is not yet loaded (entity set loaded by a smart table for example).
															//We currently deactivate this behaviour as we can not rely on the context to get key's values (pernr, tripno) that are not necesseraly selected.
															//Furthermore, in presence of deep entities, the key is not only pernr and tripno, but also other attributes that we should fetch and check.
															var bConcerned = true;
															if (bConcerned) {
																if (sNavPropertyPath == undefined) {
																	aNavPropertyPath.push(undefined);
																} else {
																	aNavPropertyPath.push(sNavPropertyPath);
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}

							var fnReadEntities = function () {
								if (false === bRefreshAfterChange) {
									PersistenceHelper.read(oModel, sPath); // Refresh Entity
								}
								for (var i = 0; i < aNavPropertyPath.length; i++) {
									sNavPropertyPath = aNavPropertyPath[i];
									PersistenceHelper.read(oModel, sPath + "/" + sNavPropertyPath, mParameters); // Refresh associations
								}
							};
							var fnFunctionalError = function(oResponse, oRequest){
								//in case of functionalError, we trigger the side effect if there are only warnings.
								if (MessageUtil.get().handleMessageResponse(oResponse)) {
									var errors = MessageUtil.get().getErrorMessagesResponse(oResponse);
									 
									 var areAllWarnings = errors.every(function (item){
										return MessageParser.ErrorType.toMessageType(item.type) === MessageType.Warning;
									});

									if (areAllWarnings){
										fnReadEntities();
									}
								}
								
							};
							if (bSubmitChanges) {
								PersistenceHelper.submitChanges(oModel, {
									success: fnReadEntities, //Refresh target Entities
									functionalError: fnFunctionalError,
									source: oEventSource,
									settings: {
										refreshAfterChange: bRefreshAfterChange
									},
									submitChangeOrigin: submitChangeOrigin,
									draftIndicator: true
								});
							}
						}
					}
				}
			};
			var oModel = oController.getView().getModel();
			oModel.attachPropertyChange(fnPropertyChanged); // ensure that the handler is called whenever a user input (affecting the OData model) is performed
		}

		function onFilterBarDataReceived(oEvent) {
			// Read backend message and look for error raised
			var oMsgModel = sap.ui.getCore().getMessageManager().getMessageModel();
			if (oMsgModel && oMsgModel.getData() && oMsgModel.getData()[0]) {
				var type = oMsgModel.getData()[0].type;
				var msg = oMsgModel.getData()[0].message;
				if (type === "Error") {
					MessageUtil.get().showMessage({
						error: msg
					});
				}
			}
		}

		function handleFilterBarSearchPressed(oEvent) {
			var oFilterBar = oController.getView().byId("listPageFilterBar");
			var filterPernr = oFilterBar.getControlByKey("Pernr").getValue();
			var sOldSelectedPernr = ODataModelUtil.get().getCurrentTripContext().Pernr;
			if (!Utils.isEmptyObjectOrString(filterPernr) && filterPernr !== sOldSelectedPernr) {
				//Function Import Call - ExitApplication - Unlock Employee Number
				var oModel = oController.getView().getModel();
				ODataModelUtil.get().saveCurrentTripContext({
					Pernr: filterPernr,
					BindingPath: "" //reset bindingPath when changing user
				});
				var fnSuccess = function (oData) {
					//successfully exited the app with the old pernr.
					//We now set back the unsaved trip number in the context
					if (oData && oData.Pernr === filterPernr) {
						ODataModelUtil.get().saveCurrentTripContext({
							Tripno: oData.Unsavedtripnumber
						});
					}

					NavigationUtil.navigateToRoot();
				};

				if (!Utils.isEmptyObjectOrString(sOldSelectedPernr)) {
					PersistenceHelper.callFunction(oModel, {
						name: "/ExitApplication",
						success: fnSuccess,
						urlParameters: {
							Pernr: sOldSelectedPernr,
							NewPernr: filterPernr
						}
					});
				} else {
					PersistenceHelper.read(oController.getView().getModel(), "/UserProfiles(Pernr='" + filterPernr + "')", {
						success: fnSuccess
					});
				}
			}
		}

		function handleListPageItemPress(oEvent) {
			var oEventSource = oEvent.getSource();
			var sTripPath = oEventSource.getBindingContext().getPath();
			var oTargetTrip = new Context(oController.getView().getModel(), sTripPath);
			var oDraftItem = ODataModelUtil.get().getDraftItem(oEventSource);
			FragmentHelper.get().loadFragment({
				id: "TravelMessagePopoverFragmentID",
				name: "sap.fin.travel.lib.reuse.view.fragments.MessagePopover",
				controller: oController,
				models: {
					i18n: oController.getView().getModel("i18n"),
					message: oController.getView().getModel("message")
				}
			}).then(function () {
				//var bAlreadyDisplayed = NavigationUtil.isBindingPathDisplayed(oEvent.getSource().getBindingContext().getPath());

				var onDialogConfirmEdit = function () {
					//get context of trip to cancel/delete before changing the selection
					var mCurrentTripContext = ODataModelUtil.get().getCurrentTripContext();
					//in some cases (deep link, hence not navigating through the internal navigation API), the binding context needs to be determined at runtime
					//in this case, we are working on the same binding context object, we'd just like to replace the Tripno to the previously selected item
					var bindingPath = mCurrentTripContext.BindingPath || oEventSource.getBindingContext().getPath().replace(/Tripno='\d+'/,
						"Tripno='" +
						mCurrentTripContext.Tripno + "'");

					var oList = oEventSource.getParent();
					//Cancel previous trip and Trigger navigation
					_setSelectedItemAndFire(oEventSource.getParent(), oEventSource);
					var oModel = oController.getOwnerComponent().getModel();
					ODataModelUtil.get().resetChanges(oModel);

					//Trip previously selected is properly cancelled. We can now navigate to the new selected entity.
					//We make sure that the new selected entity is marked as invalid to be later refreshed from the server
					var fnSuccess = function () { //Navigation
						oModel.invalidateEntry(sTripPath); // Mark the selected entry in the model cache as invalid. It will be refreshed from the server to force a GET
						var sPath = sTripPath.split("/").slice(-1).pop(); //remove heading slash for the navigation
						NavigationUtil.navigate(sPath, oController.getView().getModel("view").getProperty("/level"));
					};

					fnCancelTrip(oList, fnSuccess, undefined, mCurrentTripContext.Pernr, mCurrentTripContext.Tripno,
						bindingPath, false, true);
				};

				var fnOtherwise = function () {
					//in all other cases, trigger Navigation - Nothing will be lost
					_setSelectedItemAndFire(oEventSource.getParent(), oEventSource);

					var oModel = oController.getOwnerComponent().getModel();
					oModel.invalidateEntry(sTripPath); // Mark the selected entry in the model cache as invalid. It will be refreshed from the server to force a GET

					var navPath = sTripPath;
					NavigationUtil.navigate(navPath, oController.getView().getModel("view").getProperty("/level"));
				};

				fnDraftOrUnsavedByDialog(onDialogConfirmEdit, fnOtherwise, oDraftItem, oTargetTrip);
			});

		}

		/**
		 * if the draft item === target item, we can safely enter into the target item (calling fnOtherwise)
		 * if the draft item !== target item, we need to request user confirmation for data loss (and in case of confirmation calling fnOnConfirm)
		 * if the unsaved by item === target item, we can safely enter into the target item -> it will be in display mode only (calling fnOtherwise)
		 * if the unsaved by item !== target item, we need to request user confirmation with unsaved by details (and in case of confirmation calling fnOnConfirm)
		 * in all other case, we can safely enter into the target item (calling fnOtherwise)
		 *
		 * @param {function} fnOnConfirm function is called when user confirms the dialog.
		 * @param {function} fnOtherwise function is called if there is no dialog to be displayed. it simply calls the function
		 * @param {object} object containing the draft item
		 * @param {object} object containg the item in which we'd like to go to
		 */
		function fnDraftOrUnsavedByDialog(fnOnConfirm, fnOtherwise, oDraftItem, oTargetTrip) {

			var bIsDraft = oDraftItem && oDraftItem.getProperty("DraftLinkType") === "Draft";
			var bIsUnsavedBy = oDraftItem && oDraftItem.getProperty("DraftLinkType") === "UnsavedBy";
			var sTargetTripNumber = oTargetTrip && oTargetTrip.getProperty("Tripno");
			var sDraftTripNumber = oDraftItem && oDraftItem.getProperty("Tripno");

			if (bIsDraft && sDraftTripNumber !== sTargetTripNumber) {
				//trip in draft, warn that data loss can happen

				var sAction = I18n.get().getText(oController, "LEAVE_PAGE");
				MessageBox.show(I18n.get().getText(oController, "BACK_WARNING"), {
					icon: MessageBox.Icon.WARNING,
					title: I18n.get().getText(oController, "WARNING"),
					actions: [sAction, MessageBox.Action.CANCEL],
					onClose: function (oAction) {
						if (oAction === sAction && fnOnConfirm && "function" === typeof fnOnConfirm) {
							fnOnConfirm();
						}
					}
				});
			} else if (bIsUnsavedBy && sDraftTripNumber !== sTargetTripNumber) {
				//trip in unsaved by mode, warn that we would take over existing changes by the other user
				//we display the popup in case of target !== unsavedBy item only, as otherwise the backend provides a display-only item
				var sDraftUser = oDraftItem.getProperty("DraftUserId");
				var sFragmentId = oController.getView().getId() + "UnsavedChangesDialogFragment";
				FragmentHelper.get().getUnsavedDialog(oController, sFragmentId, sDraftTripNumber, sDraftUser).then(fnOnConfirm);
			} else if (fnOtherwise && "function" === typeof fnOtherwise) {
				fnOtherwise();
			}

		}

		/**
		 * Handle item press default behavior for ObjectPage.
		 * When an item in a table is pressed, the default behaviour is to select the item and trigger the navigation to the element
		 */
		function handleItemPress(oEvent) {
			var oEventSource = oEvent.getSource();
			//1-select the item
			_setSelectedItemAndFire(oEvent.getSource().getParent(), oEvent.getSource());

			var sHash = HashChanger.getInstance().getHash();
			var sContextPath = oController.getView().getBindingContext() && oController.getView().getBindingContext().getPath();
			var sDestinationPath = oEvent.getSource().getBindingContext().getPath();
			var navPath = sContextPath + sDestinationPath;
			if (sHash.endsWith(sContextPath)) {
				navPath = sHash + sDestinationPath;
			}

			//2-build paginator model
			PaginatorHelper.get().updateEntry(oController.getView().getModel("view").getProperty("/level") + 1, sDestinationPath, oEvent.getSource()
				.getParent()
				.getBindingInfo(
					"items").binding
				.aKeys);

			//3-trigger navigation after a sbmit Changes
			var fnSuccessSubmit = function () {
				NavigationUtil.navigate(navPath, oController.getView().getModel("view").getProperty("/level"));
			};

			//
			PersistenceHelper.submitChanges(oController.getView().getModel(), {
				source: oEventSource,
				success: fnSuccessSubmit,
				functionalError: fnSuccessSubmit,
				submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ITEM_PRESS,

			});

		}

		function closeDraftAdminPopover() {
			if (FragmentHelper.get().getFragment(oController.sDraftDialogId)) {
				FragmentHelper.get().getFragment(oController.sDraftDialogId).close();
			}
		}

		function closeDiscardPopover(oEvent, oSourceObj) {
			var oModel = oController.getView().getModel();
			var oSource = oSourceObj ? oSourceObj : CustomDataUtil.getCustomData(oEvent.getSource(), "source");

			if (oSource === "cancel") {
				// Reset All Pending Changes
				ODataModelUtil.get().resetChanges(oModel);
				if (oController.getView().getModel("view").getProperty("/level") === FCLayoutUtil.layout.midColumn.level) { // in case of first level navigation.
					// Get Travel Request Entity with URL Parameters
					var tripno = oController.getView().getBindingContext().getProperty("Tripno");
					var pernr = oController.getView().getBindingContext().getProperty("Pernr");
					//If the trip is new, there is no cancelation to perform on the backend. We can safely delete it.
					//otherwise it cancels the trip
					fnCancelTrip(oSource, undefined, undefined, pernr, tripno);
				} else {
					oController._fclHandler.handleClose();
				}
			} else if (oSource === "close") {
				// Reset Specific Pending Changes if a binding context exists.
				//Otherwise, we just close the column
				var oBindingContext = oController.getView().getBindingContext();
				if (!Utils.isEmptyObjectOrString(oBindingContext) && oModel.getProperty(oBindingContext.getPath())) {
					ODataModelUtil.get().resetChanges(oModel, [oBindingContext.getPath()]);
				}
				oController._fclHandler.handleClose();
			} else if (oSource === "paginator") {
				// Reset Specific Pending Changes
				var oBindingContext = oController.getView().getBindingContext();
				if (!Utils.isEmptyObjectOrString(oBindingContext) && oModel.getProperty(oBindingContext.getPath())) {
					ODataModelUtil.get().resetChanges(oModel, [oBindingContext.getPath()]);
				}
				var sNavObjectPath = oEvent.getParameter("navObjectPath") ? oEvent.getParameter("navObjectPath") : CustomDataUtil.getCustomData(
					oEvent.getSource(), "navObjectPath");
				var sParentPath = oEvent.getParameter("parentPath") ? oEvent.getParameter("parentPath") : CustomDataUtil.getCustomData(oEvent.getSource(),
					"parentPath");
				PaginatorHelper.get().updateEntry(oController.getView().getModel("view").getProperty("/level"), sNavObjectPath);
				NavigationUtil.navigate(sParentPath + sNavObjectPath, oController.getView().getModel("view").getProperty("/level"), true);
			}
			MessageUtil.get().refreshValidationMessages(oController.getView().getBindingContext().getPath());

			if (oController.oDiscardDialog && oController.oDiscardDialog.isOpen()) {
				oController.oDiscardDialog.close();
			}
		}

		/**
		 * Helper to wrap the cancel behaviour in presence of new trip.
		 * A new trip Persistencestatus = 0 is not saved in the backend cluster, thus the regular cancellation does not work as there is nothing to cancel.
		 * In this case, it's wiser to trigger the delete call for the given object to be sure to remove any instances.
		 *
		 * @param {object} the source to determine the context. Optional (if undefined, it's considered as a cancel from an object)
		 * @param {fnSuccess} Success function to be called upon successful cancelation or deletion
		 * @param {fnError} Error function to be called upon error during cancelation or deletion
		 * @param {sPernr} Pernr
		 * @param {sTripno} Tripno
		 * @param {sEntityPath} This param is provided to control which entity path is getting deleted. It's usefull when it's not possible to infer entity path from the context (for example, when a list item is changed, we have difficulties retrieving the previously selected context)
		 * @param {bTriggerNavigation} In some cases, we do not want to control the navigation. For isntance, when the deletion is immediately followed by another navigation (in the success functino for example). This is used for deletion when PersistenceStatus.New
		 * @param {bInvalidateOnCancelNotNecessary} This flags indicates whether the cancelTrip should invalidate or not the entries. For instance, it is not necessary to invalidate trip if the fnSuccess function contains logic to immediately leave it.
		 */
		function fnCancelTrip(oSource, fnSuccess, fnError, sPernr, sTripno, sEntityPath, bTriggerNavigation, bInvalidateOnCancelNotNecessary) {
			var oModel = oController.getView().getModel();
			sEntityPath = sEntityPath || oController.getView().getBindingContext().getPath();
			if (oModel.getProperty(sEntityPath).hasOwnProperty("Persistencestatus") && oModel.getProperty(sEntityPath).Persistencestatus ===
				TravelUtil.PersistenceStatus.New) {
				fnDeleteEntity(oSource, {
					sEntityName: I18n.get().getText(oController, "OBJECT_TYPE"),
					fnSuccess: fnSuccess,
					fnError: fnError,
					sEntityPath: sEntityPath,
					bTriggerNavigation: bTriggerNavigation
				});
			} else {
				PersistenceHelper.cancelTrip(oModel, {
					success: function () {
						PersistenceHelper.resetSubEntityChanges(oModel, sPernr, sTripno);
						if (fnSuccess && typeof fnSuccess === "function") {
							fnSuccess(arguments);
						}
					},
					error: fnError,
					urlParameters: {
						Tripno: sTripno,
						Pernr: sPernr
					},
					settings: {
						refreshAfterChange: !bInvalidateOnCancelNotNecessary
					},
					invalidate: !bInvalidateOnCancelNotNecessary
				});
			}
		}

		function handleOnDraftLinkPressed(oEvent) {
			var oButton = oEvent.getSource();
			oController.sDraftDialogId = oController.getView().getId() + "DraftAdminDataPopoverFragment";
			FragmentHelper.get().loadFragment({
				id: oController.sDraftDialogId,
				name: "sap.fin.travel.lib.reuse.ListPage.view.fragments.DraftAdminDataPopover",
				controller: oController,
				models: {
					i18n: oController.getView().getModel("i18n")
				}
			}).then(function (oDraftDialog) {
				if (oDraftDialog) {
					oDraftDialog.setModel(new JSONModel({
						"DraftLinkType": oButton.getBindingContext().getProperty("DraftLinkType"),
						"DraftUserId": oButton.getBindingContext().getProperty("DraftUserId"),
						"TripChange": oButton.getBindingContext().getProperty("TripChange")
					}));

					oDraftDialog.bindElement("/");
					oDraftDialog.openBy(oButton);
				}
			});
		}

		function handleEditAction(oEvent) {
			var oSource = oEvent.getSource();
			oSource.setEnabled(false); // Disabled edit button to prevent from multiple clics
			//reset delete button enablement status
			$("[id*=deleteEntry]").each(function (i, j) {
				var ownerId = oController.getOwnerComponent().getId();
				var buttonId = ownerId + j.id.split(ownerId).slice(-1).pop();
				var oDeleteButton = oController.getView().byId(buttonId);
				if (oDeleteButton && oDeleteButton.getMetadata && oDeleteButton.getMetadata().getName() === "sap.m.Button") {
					oDeleteButton.setEnabled(false);
				}
			});

			var oModel = oController.getView().getModel();
			// Get Travel Request Entity with URL Parameters
			var tripno = oController.getView().getBindingContext().getProperty("Tripno");
			var pernr = oController.getView().getBindingContext().getProperty("Pernr");

			var fnSuccess = function (oData) {
				//in case of backend error => key does not correspond to the actual trip.
				//we do display a generic error
				var bTripno = oData && oData.Tripno === tripno;
				var bPernr = oData && oData.Pernr === pernr;
				if (!bPernr || !bTripno) {
					MessageUtil.get().showMessage(I18n.get().getText(oController,
						"UNKNOWN_ERROR"));
				}

				PersistenceHelper.invalidateEntries(oModel, {
					Pernr: oData.Pernr,
					Tripno: oData.Tripno
				});
			};

			var fnSwitchEditMode = function (fnResolve) {
				//Function Import Call - Switch from Display to Edit Mode
				PersistenceHelper.callFunction(oModel, {
					name: "/SwitchEditMode",
					success: fnSuccess,
					functionalError: fnSuccess,
					resolve: fnResolve,
					reject: fnResolve,
					urlParameters: {
						Pernr: pernr,
						Tripno: tripno
					},
					settings: {
						refreshAfterChange: false
					}
				});
			};

			// Check for locking or unsaved changes
			var bIsDraftLinkVisible = oController.getView().getBindingContext().getProperty("DraftLinkVisible");
			var bIsDraftLinkType = oController.getView().getBindingContext().getProperty("DraftLinkType") === "UnsavedBy";
			var sDraftUserId = oController.getView().getBindingContext().getProperty("DraftUserId") || "";
			var sDraftTripno = oController.getView().getBindingContext().getProperty("Tripno") || "";
			var fnPromise = function (resolve) {
				if (bIsDraftLinkVisible && bIsDraftLinkType) {
					var sFragmentId = oController.getView().getId() + "UnsavedChangesDialogFragment";
					FragmentHelper.get().getUnsavedDialog(oController, sFragmentId, sDraftTripno, sDraftUserId).then(
						function () {
							//Function Import Call - Cancel flight and switch to Edit Mode
							fnCancelTrip(undefined, fnSwitchEditMode.bind(null, resolve), undefined, pernr, tripno, undefined, false);
						});
				} else {
					//Function Import Call - Switch from Display to Edit Mode
					fnSwitchEditMode.apply(null, [resolve]);
				}
			};
			var fnResolve = function () {
				oSource.setEnabled(true);
			};

			var pEditAction = new Promise(fnPromise);
			pEditAction.then(fnResolve).catch(fnResolve); // run promise then enabled edit button after success or error callback function of SwitchEditMode.
		}

		function handleCancelAction(oEvent) {
			var oCustomSourceData = CustomDataUtil.getCustomData(oEvent.getSource(), "source");
			var sEntityName = CustomDataUtil.getCustomData(oEvent.getSource(), "entityName");
			var sEntityKey = CustomDataUtil.getCustomData(oEvent.getSource(), "entityKey");
			var sEntity = sEntityKey ? sEntityName + " \"" + sEntityKey + "\"" : sEntityName;
			var oSourceModel = {
				source: oCustomSourceData,
				parentPath: oEvent.getParameter("parentPath"),
				navObjectPath: oEvent.getParameter("navObjectPath"),
				message: sEntity ? I18n.get().getText(oController, "DISCARD_ENTITY", sEntity) : I18n.get().getText(oController, "DISCARD_EDIT")
			};
			// Discard Changes - popover
			var oModel = oController.getView().getModel();

			var sBindingPath = oController.getView().getBindingContext() && oController.getView().getBindingContext().getPath();
			if (ODataModelUtil.get().hasPendingChanges(oModel, sBindingPath)) { // if the user has done any changes to the draft, a confirmation popover is displayed
				var oSource = oEvent.getSource();
				FragmentHelper.get().loadFragment({
					id: oController.getView().getId() + "DiscardDraftPopoverFragment",
					name: "sap.fin.travel.lib.reuse.view.fragments.DiscardDraftPopover",
					controller: oController,
					models: {
						i18n: oController.getView().getModel("i18n")
					}
				}).then(function (discardDialog) {
					if (discardDialog) {
						discardDialog.setModel(oController.getView().getModel());

						discardDialog.setModel(new JSONModel(oSourceModel), "discard");
						discardDialog.openBy(oSource); // further execution will be performed by the event handler of this popover
					}
				});
			} else { // the user wants to cancel a draft he has not edited at all -> execute immeadiately (no confirmation required)
				closeDiscardPopover(oEvent, oCustomSourceData);
			}
		}

		function callSaveSubmit(oEvent, iUserAction, bSkipCheck, fnSuccess, fnFunctionalError, fnError) {
			var oEventSource = oEvent.getSource();
			var fnSaveSubmit = function () {
				var oModel = oController.getView().getModel();
				// Get Travel Request Entity with URL Parameters
				var tripno = oController.getView().getBindingContext().getProperty("Tripno");
				var pernr = oController.getView().getBindingContext().getProperty("Pernr");

				var mParameters = {
					Pernr: pernr,
					Tripno: tripno,
					Useraction: iUserAction
				};

				var fnSuccessSave = function (oData, response) {
					if (!MessageUtil.get().handleMessageResponse(response)) {
						if (fnSuccess != undefined && typeof fnSuccess === "function") {
							fnSuccess();
						}
						// Display Success Message
						MessageToast.show(I18n.get().getText(oController, iUserAction === TravelUtil.UserAction.Save || iUserAction === TravelUtil.UserAction
							.Draft ? "SAVE_MSG" :
							"SUBMITTED_MSG_NO_APPROVER"));
						//RefreshAfterChange - Refresh List Page in case of success
						var oSmartTable = sap.ui.getCore().byId('listPageView--listPageSmartTableID');
						if (oSmartTable) {
							oSmartTable.rebindTable();
						}
						if (oController.getView().getBindingContext().getProperty("Persistencestatus") === TravelUtil.PersistenceStatus.New) {
							//Trigger navigation if the trip was in draft mode previously (Persistencestatus === 0)
							var sEntityPath = response.headers && response.headers["location"] && response.headers["location"].split("/").slice(-1).pop();
							var sNavPath = '/' + sEntityPath;
							NavigationUtil.navigate(sNavPath, oController.getView().getModel("view").getProperty("/level"), true);
						} else {
							//in such case, there is no need to invalidate the new entry as we are navigating to it, thus backend will return it as expected
							if (iUserAction !== TravelUtil.UserAction.Draft) {
								//In case of successfull save or submit, the backend switch from edit to display. We should reflect these changes in sub-entities
								PersistenceHelper.invalidateEntries(oModel, {
									Pernr: oData.Pernr,
									Tripno: oData.Tripno
								});
							}
						}

					}
				};
				var fnSuccessSubmit = function () {
					PersistenceHelper.callFunction(oModel, {
						name: "/SaveTrip",
						source: oEventSource,
						error: fnError,
						success: fnSuccessSave,
						functionalError: fnFunctionalError,
						urlParameters: mParameters,
						settings: {
							refreshAfterChange: false
						}
					});
				};

				PersistenceHelper.submitChanges(oModel, {
					success: fnSuccessSubmit,
					submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ACTION,
					settings: { //in case of pending changes, we are directly saving the trip afterwards which will properly refresh concerned entities. No need to refresh it now
						refreshAfterChange: false
					}
				});
			};
			if (bSkipCheck) {
				fnSaveSubmit();
			} else {
				checkAppForms(oEvent, true, fnSaveSubmit);
			}
		}

		function handleSubmitAction(oEvent, fnSuccess, fnFunctionalError, fnError) {
			// Useraction = 3
			callSaveSubmit(oEvent, TravelUtil.UserAction.Submit, false, fnSuccess, fnFunctionalError, fnError);
		}

		function handleSaveAction(oEvent) {
			// Useraction = 2
			callSaveSubmit(oEvent, TravelUtil.UserAction.Save);
		}

		function handleSaveAsDraftAction(oEvent) {
			// Useraction = 4
			callSaveSubmit(oEvent, TravelUtil.UserAction.Draft, true);
		}

		function _createEntry(oModel, oSmartTable, sEntitySet, oSettings) {
			var fnSuccess = function (oData, response) {
				//Entity created. In case of navigatable item, we do trigger the navigation.

				//Prelimineray step: we record for the entity type the latest created record. This record will be selected by default
				//with the next table refresh
				//we assume that the table refresh will be performed after creation
				//we can provide safeguard (selected item === created item) to
				var oItem = oSmartTable.getTable().getSelectedItem();
				var subEntityPath = response.headers && response.headers["location"] && response.headers["location"].split("/").slice(-1).pop();
				var sCreatedEntityBindingPath = "/" + subEntityPath;
				if (oItem && oItem.getBindingContext() === sCreatedEntityBindingPath) {
					//item already selected, do not save it
					oController._lastCreatedItem[sEntitySet] = undefined;
				} else {
					//item is different, we save it for a later selection
					oController._lastCreatedItem[sEntitySet] = sCreatedEntityBindingPath;
				}

				if (!oSettings.inLine) {
					//When we create the entity, we do not have its navigation status contained in the corresponding ListItem.
					//Thus, we get the navigation status that is retrieved using the exact same procedure.
					//In case of "Navigation" type, the element is navigable.
					var pages = {
						pages: [],
						settings: []
					};

					//XXX sap.fin.travel.lib.reuse
					AnnotationHelper.listAppPages(AppComponent.get().getConfig(), pages);
					var sNavType = AnnotationHelper.getColumnListItemType(pages.pages, {
						name: sEntitySet
					});
					var bNavigable = "Navigation" === sNavType;

					//1) Get the first created item of the list

					//a. It corresponds to the list item in oSmartTable.getTable().getSelectedItemById() with id provided in oData
					//b. Check if the item has the navigation property set (meaning that item is navigable)
					//c. Select it and fire selection change
					// //XXX will be moved
					// if (oController.getView().getModel("view").getProperty("/level") === 0) {
					// 	var oList = oController.getView().byId("responsiveTableID");
					// 	_setSelectedItemAndFire(oList, oList.getItems()[0]);

					// }

					//d. Navigate to it.
					if (bNavigable) {
						var sHash = HashChanger.getInstance().getHash();
						var sContextPath = oSettings.viewContext ? oSettings.viewContext.getPath() : "";
						var sDestinationPath = sCreatedEntityBindingPath;
						var navPath = sContextPath + sDestinationPath;
						if (!Utils.isEmptyObjectOrString(sContextPath) && sHash.endsWith(sContextPath)) {
							navPath = sHash + sDestinationPath;
						}
						// update the paginator state with the new created item.
						var aBindings = [];
						oSmartTable.getTable().getItems().forEach(function (oItem) { // add all list items
							if (!Utils.isEmptyObjectOrString(oItem.getBindingContext())) {
								var sBindingPath = oItem.getBindingContext().getPath();
								aBindings.push(sBindingPath.slice(1));
							}
						});
						aBindings.push(sDestinationPath.slice(1)); // created item;
						PaginatorHelper.get().updateEntry(oController.getView().getModel("view").getProperty("/level") + 1, sDestinationPath, aBindings);

						NavigationUtil.navigate(navPath, oController.getView().getModel("view").getProperty("/level"));
					}
				}
			};

			PersistenceHelper.createEntry(oModel, oSettings.bindingPath, {
				success: fnSuccess,
				properties: oSettings.properties,
				submit: oSettings.submit
			});
		}

		/**
		 * Handle creation default behavior
		 * The creation is triggered from a ListPage to create the main object, or from a table contained in an ObjectPage
		 */
		function handleCreateAction(oEvent) {
			var oSource = oEvent.getSource();
			//Get the table context
			checkAppForms(oEvent, false, function () {
				var oSmartTable = ControlUtil.getSmartTable(oSource);
				var sEntitySet = oSmartTable.getEntitySet();
				var oModel = oSmartTable.getModel();
				var oView = oController.getView();
				var oViewContext = oView.getBindingContext();
				var sBindingPath;
				var oProperties;
				var bCreateFromList = false;
				if (oViewContext) {
					//assumes that navigation path for an inner element corresponds to the navigation name
					var sNavProp = ODataModelUtil.get().getNavigationProperty(oController, oModel, sEntitySet);
					sBindingPath = oViewContext.getPath() + "/" + sNavProp;
				} else {
					// on list, support only one entityset mapped to the root component
					var sSelectedPernr = ODataModelUtil.get().getCurrentTripContext().Pernr;
					sBindingPath = "/" + sEntitySet;
					oProperties = {
						Pernr: sSelectedPernr
					};
					bCreateFromList = true;
				}
				var oSettings = {
					bindingPath: sBindingPath,
					viewContext: oViewContext,
					properties: oProperties
				};
				var fnCreateEntry = function () {
					_createEntry(oModel, oSmartTable, sEntitySet, oSettings);
				};
				if (bCreateFromList) {
					//check for draft/unsavedBy item
					var oDraftItem = ODataModelUtil.get().getDraftItem(oSmartTable);
					fnDraftOrUnsavedByDialog(fnCreateEntry, fnCreateEntry, oDraftItem);
				} else {
					fnCreateEntry();
				}
			});
		}

		function handleCreateCustomAction(oEvent) {
			var oSource = oEvent.getSource();
			var oSelectedItem = oEvent.getSource().getSelectedItem();
			var oSmartTable = ControlUtil.getOwnerControl(oController.oSmartTable);
			var aProperties = JSON.parse(CustomDataUtil.getCustomData(oSelectedItem, "Properties"));
			var sEntitySet = CustomDataUtil.getCustomData(oSelectedItem, "Entity");
			var oModel = oSmartTable.getModel();
			var sBindingPath;
			var oView = oController.getView();
			var oViewContext = oView.getBindingContext();

			if (oViewContext) {
				//assumes that navigation path for an inner element corresponds to the navigation name
				sBindingPath = oViewContext.getPath() + "/" + sEntitySet;
			} else {
				// on list, support only one entityset mapped to the root component
				sBindingPath = "/" + sEntitySet;
			}

			var oSettings = {
				bindingPath: sBindingPath,
				viewContext: oController.getView().getBindingContext(),
				properties: {}
			};

			// Handle properties
			var oItemBindingContext = oSelectedItem.getBindingContext();
			for (var i = 0; i < aProperties.length; i++) {
				oSettings.properties[aProperties[i]] = oItemBindingContext.getProperty(aProperties[i]);
			}

			_createEntry(oModel, oSmartTable, oSmartTable.getEntitySet(), oSettings);
			oSource.getParent().close();
		}

		/** Handler when action select dialog is being canceled
			We would ensure that dialog is properly unbound when closing it
		 */
		function handleSearcheableActionItemCancel(oEvent) {
			if (oController.oAddSearchEntriesDialog) {
				oController.oAddSearchEntriesDialog.unbindElement();
				oController.oAddSearchEntriesDialog.destroy();
			}
		}

		function handleSearcheableActionItemConfirm(oEvent) {
			var aSelectedItem = oEvent.getParameters().selectedItems;
			var oSmartTable = ControlUtil.getOwnerControl(oController.oSmartTable);
			var oModel = oSmartTable.getModel();
			var oView = oController.getView();
			var oViewContext = oView.getBindingContext();
			var aProperties, sEntitySet, sBindingPath, oItemBindingContext, oSettings, oSelectedItem;
			if (aSelectedItem && aSelectedItem.length > 0) {
				for (var index = 0; index < aSelectedItem.length; index++) {
					oSelectedItem = aSelectedItem[index];
					aProperties = JSON.parse(CustomDataUtil.getCustomData(oSelectedItem, "Properties"));
					sEntitySet = CustomDataUtil.getCustomData(oSelectedItem, "Entity");

					if (oViewContext) {
						//assumes that navigation path for an inner element corresponds to the navigation name
						sBindingPath = oViewContext.getPath() + "/" + sEntitySet;
					} else {
						// on list, support only one entityset mapped to the root component
						sBindingPath = "/" + sEntitySet;
					}

					oSettings = {
						bindingPath: sBindingPath,
						viewContext: oController.getView().getBindingContext(),
						properties: {},
						inLine: aSelectedItem.length > 1,
						submit: index === aSelectedItem.length - 1
					};

					oItemBindingContext = oSelectedItem.getBindingContext();
					for (var i = 0; i < aProperties.length; i++) {
						oSettings.properties[aProperties[i]] = oItemBindingContext.getProperty(aProperties[i]);
					}

					_createEntry(oModel, oSmartTable, oSmartTable.getEntitySet(), oSettings);
				}
			}
			if (oController.oAddSearchEntriesDialog) {
				oController.oAddSearchEntriesDialog.unbindElement();
				oController.oAddSearchEntriesDialog.destroy();
			}
		}

		function handleCreateActionList(oEvent) {
			var oButton = oEvent.getSource();
			checkAppForms(oEvent, false, function () {
				var oBindingContext = oButton.getBindingContext();
				var sNavProp = ODataModelUtil.get().getNavigationProperty(oController, oBindingContext.getModel(), ControlUtil.getOwnerControl(
						oButton)
					.getEntitySet());
				var aTargetSettings = JSON.parse(CustomDataUtil.getCustomData(oButton, "targetEntitySettings"));
				oController.oSmartTable = oButton.getParent();
				var oPreprocessors = oController.oPreprocessors.xml;
				oPreprocessors.models.actionEntity = new sap.ui.model.json.JSONModel({
					targetEntity: aTargetSettings[0],
					targetName: aTargetSettings[1],
					targetProperties: CustomDataUtil.getCustomData(oButton, "targetEntityProperties"),
					sourceEntity: sNavProp
				});
				var oFragment = XMLTemplateProcessor.loadTemplate("sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionListItem", "fragment");
				oFragment.oAddEntriesDialog = XMLPreprocessor.process(oFragment, {
					name: "sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionListItem"
				}, oPreprocessors);
				oController.oAddEntriesDialog = sap.ui.xmlfragment({
					fragmentContent: oFragment,
					type: "XML"
				}, oController);
				oController.oAddEntriesDialog.attachAfterClose(function () {
					oController.oAddEntriesDialog.unbindElement();
					oController.oAddEntriesDialog.destroy();
				});

				oController.oAddEntriesDialog.setModel(oController.getView().getModel());
				oController.oAddEntriesDialog.bindElement(oController.getView().getBindingContext().getPath());
				oController.oAddEntriesDialog.openBy(oButton);
			});
		}

		function handleCreateActionSearcheableList(oEvent) {
			var oButton = oEvent.getSource();
			checkAppForms(oEvent, false, function () {
				var oBindingContext = oButton.getBindingContext();
				var sNavProp = ODataModelUtil.get().getNavigationProperty(oController, oBindingContext.getModel(), ControlUtil.getOwnerControl(
						oButton)
					.getEntitySet());
				var sNavPropName = ODataModelUtil.get().getNavigationPropertyName(oController, oBindingContext.getModel(), ControlUtil.getOwnerControl(
						oButton)
					.getEntitySet());
				var aTargetSettings = JSON.parse(CustomDataUtil.getCustomData(oButton, "targetEntitySettings"));
				oController.oSmartTable = oButton.getParent();
				var oPreprocessors = oController.oPreprocessors.xml;
				oPreprocessors.models.actionEntity = new sap.ui.model.json.JSONModel({
					targetEntity: aTargetSettings[0],
					targetName: aTargetSettings[1],
					targetProperties: CustomDataUtil.getCustomData(oButton, "targetEntityProperties"),
					sourceEntity: sNavProp,
					title: I18n.get().getText("ADD_ACTION_ITEMS", sNavPropName),
					noDataText: I18n.get().getText("NO_ACTION_ITEMS", sNavPropName)
				});
				var oFragment = XMLTemplateProcessor.loadTemplate("sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionSearchFieldItem",
					"fragment");
				oFragment.oAddSearchEntriesDialog = XMLPreprocessor.process(oFragment, {
					name: "sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionSearchFieldItem"
				}, oPreprocessors);
				oController.oAddSearchEntriesDialog = sap.ui.xmlfragment({
					fragmentContent: oFragment,
					type: "XML"
				}, oController);

				oController.oAddSearchEntriesDialog.setModel(oController.getView().getModel());
				oController.oAddSearchEntriesDialog.bindElement(oController.getView().getBindingContext().getPath());
				oController.oAddSearchEntriesDialog.open();
			});
		}

		function handleSearcheableActionItemSearch(oEvent) {
			var oList = oEvent.getSource(),
				sValue = oEvent.getParameter("value");

			if (oList) {
				var items = oList.getItems();
				if (items) {
					var i = 0;
					for (i = 0; i < items.length; i++) {
						if (items[i].getTitle().toLowerCase().indexOf(sValue.toLowerCase()) !== -1) {
							items[i].setVisible(true);
						} else {
							items[i].setVisible(false);
						}
					}
				}
			}
		}

		/**
		 * @param {object} mSettings is an object with expected following properties
		 *   - sEntityName: optionnal, the entity name is displayed in the message toast to confirm a proper deletion
		 *   - fnSuccess: optionnal, function executed once the deletion is succesful
		 *   - fnError: optionnal, function executed in case of error
		 *   - sEntityPath: optionnal, if provided, this entityPath is deleted (calling oModel.delete(sEntityPath). If it's not provided, we try to infer the entityPath from the source context. On a list, we retrieve the selected context and delete it. On an object, we retrieve the binding context and delete it.
		 *   - bTriggerNavigation: optionnal. In some cases, we do not want to control the navigation. For isntance, when the deletion is immediately followed by another navigation (in the success functino for example)
		 *
		 * Special case: when we are deleting a master entity (from the list page [controller level 0, list deletion], or from the object page [controller level 1, object deletion]), we reset all pending changes concerning sub-entities (not just all, as we can delete a trip not in edition). The relation can be more complex (sub-entity deletion would also need to invlidate its sub-sub-entities's pending changes, but we let this case aside at the moment)
		 *
		 */
		function fnDeleteEntity(oSource, mSettings) {

			var sEntityName = mSettings.sEntityName;
			var fnSuccess = mSettings.fnSuccess;
			var fnError = mSettings.fnError;

			var sEntityPath = mSettings.sEntityPath;
			//if the entity path is not already provided, we try to infer it from the source context
			//at the moment, a bindingpath provided through the settings occurs only when cancelling a trip
			var bDeleteMasterObject = true;
			var bDeleteList = false;
			var oList;
			if (Utils.isEmptyObjectOrString(sEntityPath)) {
				oList = ControlUtil.getSmartTable(oSource);
				bDeleteList = !Utils.isEmptyObjectOrString(oList) && oList.getTable;

				if (bDeleteList) {
					//Try to delete an item from a table (from a ListPage or from a DetailPage)
					sEntityPath = oList.getTable().getSelectedContextPaths()[0];
					bDeleteMasterObject = oController.getView().getModel("view").getProperty("/level") === 0;
				} else {
					//Try to delete an object (main entity or sub entity)
					sEntityPath = oController.getView().getBindingContext().getPath();
					bDeleteMasterObject = oController.getView().getModel("view").getProperty("/level") === 1;
				}
			}

			if (Utils.isEmptyObjectOrString(sEntityPath)) {
				return;
			}

			var fnRemoveSuccess = function (bDisplayMessage) {
				if (bDisplayMessage) {
					MessageToast.show(I18n.get().getText(oController, "DELETE_OK", sEntityName));
				}
				if (bDeleteList) {
					//unselect the list
					oList.getTable().removeSelections(true);
					//ensure that navigation is at the proper level. For instance, a selected item with the corresponding column opened should be close, as the item is now deleted
					if (mSettings && mSettings.bTriggerNavigation !== false && NavigationUtil.isBindingPathDisplayed(sEntityPath)) {
						NavigationUtil.navigateBack(oController.getView().getModel("view").getProperty("/level") + 1);
					}
				} else if (mSettings && mSettings.bTriggerNavigation !== false) {
					NavigationUtil.navigateBack(oController.getView().getModel("view").getProperty("/level"));
				}

				if (bDeleteMasterObject) {
					//clean pending changes concerning related sub entities
					var aResult = /Pernr='(\d+)'/.exec(sEntityPath);
					var sPernr = !Utils.isEmptyObjectOrString(aResult) && aResult[1];
					aResult = /Tripno='(\d+)'/.exec(sEntityPath);
					var sTripno = !Utils.isEmptyObjectOrString(aResult) && aResult[1];
					var oModel = oController.getView().getModel();
					PersistenceHelper.resetSubEntityChanges(oModel, sPernr, sTripno);
					// In case of sub entities we have to invalidate to read them again next time. Especially when tripno="00000000"
					PersistenceHelper.invalidateEntries(oModel, {
						Pernr: sPernr,
						Tripno: sTripno,
						refreshAfterChange: false
					});
				}

				if (fnSuccess && typeof fnSuccess === "function") {
					fnSuccess();
				}
			};

			// Delete object and navigate back
			var oModel = oController.getOwnerComponent().getModel();
			PersistenceHelper.remove(oModel, sEntityPath, {
				success: fnRemoveSuccess.bind(this, true),
				functionalError: fnRemoveSuccess,
				error: fnError,
				refreshAfterChange: true //default
			});

		}

		function handleDeleteAction(oEvent) {
			var that = oController;
			var sourceControl = oEvent.getSource();
			var sEntity = CustomDataUtil.getCustomData(sourceControl, "entityName");
			var fnError = function (oData, oResponse) {
				var error = "";
				if (oResponse != undefined) {
					error = MessageUtil.get().getErrorMessageResponse(oResponse);
				} else {
					error = MessageUtil.get().getErrorMessageResponse(oData);
				}
				MessageUtil.get().showMessage(error);
			};
			MessageBox.show(I18n.get().getText(oController, "DELETE_WARNING", sEntity), {
				icon: MessageBox.Icon.ERROR,
				title: I18n.get().getText(oController, "DELETE_TITLE"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnDeleteEntity(sourceControl, {
							sEntityName: sEntity,
							fnError: fnError
						});
					}
				}
			});
		}

		/**
		 * Default behaviour for data received on a table.
		 * The default behavior is to reset the "Delete" button status (visible if entity is having no delete restriction, and not enabled).
		 * Then, it selects an entry if needed (selection for the last created item for instance, binding path being saved in _lastCreatedItem)
		 */
		function onDataReceivedDetailTable(oEvent) {
			var oSmartTable = oEvent.getSource();
			var sEntitySet = oSmartTable.getEntitySet();

			// check for on behalf of
			var oSmartFilterBar = oController.byId(oSmartTable.getSmartFilterId());
			if (oSmartFilterBar) {
				var oFilterValue = JSON.parse(oSmartFilterBar.getFilterDataAsString());
				// we check if data result has been retrieve by table (i.e. data has been sent by backend) (i.e. request is valid and user name exists)
				if (oEvent.getParameter("mParameters") && oEvent.getParameter("mParameters").hasOwnProperty("data")) {
					var oProfile = oController.getView().getModel().getProperty("/UserProfiles('" + oFilterValue.Pernr + "')");
					AppComponent.get().updateGlobalModel("/userprofile", oProfile);
					if (oProfile && !oProfile.Isself) {
						oController.byId("template::UserText").setText(I18n.get().resolveText("ON_BEHALF_OF", [oFilterValue.Travelername, oFilterValue.Pernr]));
					} else {
						oController.byId("template::UserText").setText(I18n.get().resolveText("MY_SELF", [oFilterValue.Travelername, oFilterValue.Pernr]));
					}
				} else {
					oController.byId("template::UserText").setText("");
				}

			}

			// Check section visibility
			if (sEntitySet !== this.getOwnerComponent().sEntitySet) {
				var aWithoutVariant = oSmartTable.getId().split('::');
				aWithoutVariant.pop(); // last param id is the variant
				var oSection = this.getView().byId(aWithoutVariant.join('::').replace("::Table", "::Section"));
				if (oSection) {
					if (oEvent.getParameters().getParameter("data") && oEvent.getParameters().getParameter("data").results.length > 0) {
						if (oSection.getBindingInfo("visible") !== undefined) {

							oSection.bindProperty("visible", {
								parts: [{
									path: oSection.getBindingInfo("visible").parts[0].path,
									type: new sap.ui.model.type.Boolean()
								}],
								formatter: function (bHidden) {
									return !bHidden;
								}
							});
						}
					} else {
						if (oSection.getBindingInfo("visible") !== undefined) {
							oSection.bindProperty("visible", {
								parts: [{
									path: oSection.getBindingInfo("visible").parts[0].path,
									type: new sap.ui.model.type.Boolean()
								}, {
									path: "DisplayMode",
									type: new sap.ui.model.type.Boolean()
								}],
								formatter: function (bHidden, bDisplayMode) {
									return !bHidden && !bDisplayMode;
								}
							});
						}
					}
				}
			} else {
				// In case of List Page we have to make dure table is available after data received.
				// Since we migrated to Date Range Control if we spycify a default filter date table is disabled.
				oSmartTable.getTable().setShowOverlay(false);
			}

			var oDeleteButton = _getDeleteButton(oSmartTable);
			if (oDeleteButton) {
				//delete button exists
				//check if entity bound to the table is "deletable".
				var oMetaModel = oSmartTable.getModel().getMetaModel();
				var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
				//check delete restriction presence? default is no delete restriction
				var deletable = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"] && oEntitySet[
					"Org.OData.Capabilities.V1.DeleteRestrictions"]["Deletable"];
				if (deletable && deletable.Bool && false === deletable.Bool) {
					//delete restriction in place. We should not even display the delete button
					oDeleteButton.setVisible(false);
				} else {
					if (!oSmartTable.getBindingContext()) { // If delete from list page
						oDeleteButton.setEnabled(false);
					} else {
						var bDisplayMode = oSmartTable.getBindingContext().getProperty("DisplayMode");
						if (!bDisplayMode) {
							//if we receive data in edit mode, we can render the button visible
							oDeleteButton.setVisible(true);
							oDeleteButton.setEnabled(false);
						}
					}
					//If a selection remains on the table, make sure to adjust the enablement
					if (!Utils.isEmptyObjectOrString(oSmartTable.getTable().getSelectedItem())) {
						_setSelectedItemAndFire(oSmartTable.getTable(), oSmartTable.getTable().getSelectedItem());
					}
				}
			}
			//Does it need to select an item?
			if (oController._lastCreatedItem && oController._lastCreatedItem[sEntitySet]) {
				var sBindingPath = oController._lastCreatedItem[sEntitySet];
				var oItems = oSmartTable.getTable().getItems();
				//loop over item and select the one corresponding to the latest created one (pointed out by sBindingPath) or the item displayed within the navigation path
				var oItem;
				$.each(oItems, function (i, e) {
					var bBindingContextExists = !Utils.isEmptyObjectOrString(e.getBindingContext());
					if (bBindingContextExists && e.getBindingContext().getPath() === sBindingPath) {
						oItem = e;
						return false;
					} else if (bBindingContextExists && NavigationUtil.isBindingPathDisplayed(e.getBindingContext().getPath())) {
						oItem = e;
						return false;
					}
				});
				if (oItem) {
					_setSelectedItemAndFire(oItem.getParent(), oItem);
				}
			}
			//Handle of Swith between Percentage and Absolute Amount for Cost Assignments
			if (sEntitySet == "CostAssignments" && oSmartTable.getTable().getItems().length > 0 && oSmartTable.getTable().getItems()[0] !==
				undefined) {
				//var cFieldControlAbs = oSmartTable.getTable().getItems()[0].getBindingContext().getProperty("AbsoluteFc");
				//var cFieldControlPerc = oSmartTable.getTable().getItems()[0].getBindingContext().getProperty("PercShareFc");
				var aColumns = oSmartTable.getTable().getColumns();
				// Hide Sequential Cost Number
				aColumns[0].setVisible(false);
			}
			if (sEntitySet == "Advances") {
				// Hide Advance Sequence Number
				var aColumns = oSmartTable.getTable().getColumns();
				aColumns[0].setVisible(false);
			}
			//Enabled smarttable action bar
			if (oController.byId("listPageSmartTableID")) {
				_customToolBarActionButton(true);
				//oController.byId("listPageSmartTableID").getCustomToolbar().setEnabled(true);
			}
			_adjustButtonEnablement(oEvent);
		}

		/**
		 * Default behaviour for data received in the Comment section
		 */
		function onDataReceivedCommentsSection(oEvent) {
			var oSection = this.getView().byId(oEvent.getSource().getParent().getParent().getParent().getParent().getId());
			if (oEvent.getSource().getItems().length <= 0) {
				oSection.setVisible(false);
			} else {
				if (oSection.getBindingInfo("visible") !== undefined) {
					oSection.bindProperty("visible", {
						parts: [{
							path: oSection.getBindingInfo("visible").parts[0].path,
							type: new sap.ui.model.type.Boolean()
						}],
						formatter: function (bHidden) {
							return !bHidden;
						}
					});
				} else {
					// In case UI.Hidden property is not defined and at least one comment is retrieved display the section.
					oSection.setVisible(true);
				}
			}
		}

		/**
		 * Calculates the name of an OData entity set from the given binding context.
		 *
		 * @param {sap.ui.model.Context} oContext The given binding context
		 * @returns {string} The name of the entity set, can be <code>null</code>
		 * @throws {Error} If no context is handed over as input parameter
		 * @public
		 */
		function _getEntitySetFromContext(oContext) {
			var sPath, sEntitySet;

			if (!oContext) {
				throw new Error("No context");
			}

			if (oContext && oContext.getPath) {
				sPath = oContext.getPath().split("(")[0];
				sEntitySet = sPath.substring(1);
			}

			if (sEntitySet == null) {
				return null;
			} else {
				return oContext.getModel().getMetaModel().getODataEntitySet(sEntitySet) && oContext.getModel().getMetaModel().getODataEntitySet(
					sEntitySet).name;
			}
		}
		
		/*
		 * helper to get custom toolbar either from ListPage (only toolbar for actions) either from DetailPage (complete toolbar of the smart table)
		 */
		function _getCustomToolBar(oSmartTable){
			var oCustomToolbar = oController.byId("listPageSmartTableID") ? oController.getView().byId("customToolBarActionButtonId") : oSmartTable.getCustomToolbar();
			return oCustomToolbar;
		}

		/**
		 * Helper to retrieve the delete button from a smart table
		 */
		function _getDeleteButton(oSmartTable) {
			var oCustomToolbar = _getCustomToolBar(oSmartTable);
			var oDeleteButton;
			$.each(oCustomToolbar.getContent(), function (key, value) {
				if (-1 !== value.getId().indexOf(TravelUtil.DefaultButtons.DeleteListPage) ||
					-1 !== value.getId().indexOf(TravelUtil.DefaultButtons.DeleteDetailPage) ||
					-1 !== value.getId().indexOf("deleteEntry")) {
					oDeleteButton = value;
					return false;
				}
			});
			return oDeleteButton;

		}

		/**
		 * Private method which adjust delete button enablment status. The enablement status depends on the selected item's value.
		 * The entity's value controlling the enablement status is set in the entity's annotation DeleteRestriction on a deletable Path.
		 *
		 * @parameter oSmartTable: a smart table object holding the delete button
		 * @parameter oDeleteButton: the delete button hold by the smart table
		 *
		 */
		function _adjustDeleteButtonEnablement(oEvent) {
			var bEnablement = false;
			var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource());
			var oDeleteButton = _getDeleteButton(oSmartTable);
			if (oDeleteButton && oDeleteButton.getVisible && oDeleteButton.getVisible()) {
				//delete button exists and is active
				var oSelectedItem = oSmartTable.getTable().getSelectedItem();
				if (!Utils.isEmptyObjectOrString(oSelectedItem)) {
					var sEntitySet = oSmartTable.getEntitySet();
					var oMetaModel = oSmartTable.getModel().getMetaModel();
					var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
					//check if selected item is actually "deletable" by verifying deletable-path's property if any. Default behavior if no deletable-path is there is to enable the "Delete" button
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					var deletable = oEntityType["Org.OData.Capabilities.V1.DeleteRestrictions"] && oEntityType[
						"Org.OData.Capabilities.V1.DeleteRestrictions"]["Deletable"];
					var bEnablement = true; //default if no property or undefined value
					if (deletable && deletable.Path) {
						var sDeleteProperty = deletable.Path;
						var isDeletable = oSelectedItem && oSelectedItem.getBindingContext().getProperty(sDeleteProperty);
						//delete restriction in place for the item, we shuold not enable it.
						//no delete restriction in place for the item, We should enable the button
						if (false === isDeletable) {
							bEnablement = false;
						}
					}
				}

			}
			if (oDeleteButton) {
				oDeleteButton.setEnabled(bEnablement);
			}
		}

		/**
		 * Default behaviour for selection change event on a table.
		 * The default behavior is to verify if selected item can be deleted to adjust "Delete" button enablement
		 */
		function onDetailPageSelectionChange(oEvent) {
			_adjustButtonEnablement(oEvent);
		}
		
		function _adjustAddButtonEnablement(){
			//if there is a selected profile, we do allow creation
			var oButton = oController.getView().byId("listPageView--" + TravelUtil.DefaultButtons.AddListPage) || oController.getView().byId(
				"listPageView--" + TravelUtil.DefaultButtons.AddExtendedListPage); //listPageView is a stable id, but can be overrided.
			if (oButton) {
				oButton.setEnabled(true);
			}
		}

		function _adjustButtonEnablement(oEvent) {
			_adjustAddButtonEnablement();
			_adjustCustomButtonEnablement(oEvent);
			_adjustActionButtonEnablement(oEvent);
			_adjustDeleteButtonEnablement(oEvent);
			_adjustPDFButtonEnablement(oEvent);
			_adjustCopyButtonEnablement(oEvent);
		}

		function _adjustCustomButtonEnablement(oEvent) {
			var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource());
			var sTableEntitySet = oSmartTable.getEntitySet();
			var sMainEntitySet = oController.getOwnerComponent().sEntitySet;
			var mButtonsId = new Set();
			//If the below manifest search is too power-consuming, we might cache the mButtonsId set result.
			//lookup for struct containing EntitySet == sMainEntitySet. Using getOwnProeprtyNames instead of Object.entries/values/keys :S
			//also, for es5 compatibility reason, we are not using for (var e of Iterable) :S
			var oEntitySetControllerExtensions = _getManifestControllerExtensions();
			oEntitySetControllerExtensions = oEntitySetControllerExtensions || [];
			Object.getOwnPropertyNames(oEntitySetControllerExtensions).forEach(function (e, index, array) {
				if (oEntitySetControllerExtensions[e].EntitySet === sMainEntitySet) {
					// Look at Object Page Sections
					var oActions;
					var oSections = oEntitySetControllerExtensions[e].Sections || {};
					Object.getOwnPropertyNames(oSections).forEach(function (e, index, array) {
						//lookup for struct containing Id == sTableEntitySet
						if (oSections[e].Id === sTableEntitySet) {
							//lookup for all Action ids and enable the corresponding button
							oActions = oSections[e].Actions;
							Object.getOwnPropertyNames(oActions).forEach(function (e, index, array) {
								var oAction = oActions[e];
								if (oAction.requiresSelection === true) {
									//selection has occured, we can enable the corresponding button
									mButtonsId.add(oAction.id);
								}
							});
							return false;
						}
					});
					// Look at List Page Actions
					oActions = oEntitySetControllerExtensions[e].Actions || {};
					Object.getOwnPropertyNames(oActions).forEach(function (e, index, array) {
						//lookup for struct containing Id == sTableEntitySet
						if (!oActions[e].global || oActions[e].global === false) {
							//selection has occured, we can enable the corresponding button
							mButtonsId.add(oActions[e].id);
						}
						return false;
					});
					return false;
				}
			});

			//iterate over toolbar buttons. If we detect the button, we can enable it
						
			var oCustomToolbar = _getCustomToolBar(oSmartTable);
			$.each(oCustomToolbar.getContent(), function (key, value) {
				mButtonsId.forEach(function (v1, v2, s) {
					if (value.getId().indexOf(v1) != -1) {
						value.setEnabled(true);
					}
				});
			});
		}

		function _adjustPDFButtonEnablement(oEvent) {
			var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource()),
				oBindingContext;
			if (oSmartTable.getTable().getSelectedItem()) {
				oBindingContext = oSmartTable.getTable().getSelectedItem().getBindingContext();
			}
			
			var oCustomToolbar = _getCustomToolBar(oSmartTable);
			$.each(oCustomToolbar.getContent(), function (key, value) {
				if (value.getId().indexOf(TravelUtil.DefaultButtons.ExportListPage) != -1) {
					if (oBindingContext == undefined) {
						value.setEnabled(false);
					} else {
						var sApplicablePath = CustomDataUtil.getCustomData(value, "ApplicablePath");
						var sActionFor = CustomDataUtil.getCustomData(value, "ActionFor");
						value.setEnabled(Utils.isEmptyObjectOrString(oBindingContext) ? Utils.isEmptyObjectOrString(sActionFor) : (Utils.isEmptyObjectOrString(
							oBindingContext) ? true : oBindingContext[sApplicablePath]));
					}
				}
			});
		}

		function _adjustCopyButtonEnablement(oEvent) {
			var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource()),
				oBindingContext;
			if (oSmartTable.getTable().getSelectedItem()) {
				oBindingContext = oSmartTable.getTable().getSelectedItem().getBindingContext();
			}
			var oCustomToolbar = _getCustomToolBar(oSmartTable);
			$.each(oCustomToolbar.getContent(), function (key, value) {
				if (value.getId().indexOf(TravelUtil.DefaultButtons.CopyListPage) != -1) {
					if (oBindingContext == undefined) {
						value.setEnabled(false);
					} else if (oBindingContext.getObject()) {
						var sApplicablePath = CustomDataUtil.getCustomData(value, "ApplicablePath");
						var sActionFor = CustomDataUtil.getCustomData(value, "ActionFor");
						var object = oBindingContext.getObject();
						value.setEnabled(Utils.isEmptyObjectOrString(object) ? Utils.isEmptyObjectOrString(sActionFor) : (Utils.isEmptyObjectOrString(
							object) ? true : object[sApplicablePath]));
					}
				}
			});
		}

		function _adjustActionButtonEnablement(oEvent) {
			var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource()),
				oBindingContext;
			if (oSmartTable.getTable().getSelectedItem()) {
				oBindingContext = oSmartTable.getTable().getSelectedItem().getBindingContext();
			}
			var oCustomToolbar = _getCustomToolBar(oSmartTable);
			var sDataFieldForActionToolbarId = "DataFieldForActionButton";
			$.each(oCustomToolbar.getContent(), function (key, value) {
				if (value.getId().indexOf(sDataFieldForActionToolbarId) != -1) {
					var sApplicablePath = CustomDataUtil.getCustomData(value, "ApplicablePath");
					var sActionFor = CustomDataUtil.getCustomData(value, "ActionFor");
					var oObject = oBindingContext ? oBindingContext.getObject() : oBindingContext;
					value.setEnabled(Utils.isEmptyObjectOrString(oObject) ? Utils.isEmptyObjectOrString(sActionFor) : (Utils.isEmptyObjectOrString(
						oObject) ? true : oObject[sApplicablePath]));
				}
			});
		}

		function handleExportAction(oEvent) {
			var oModel = oController.getView().getModel();

			var sTripPath = _getBindingPathFromButton(oEvent);
			var oTrip = oModel.getObject(sTripPath);
			var sPernr = oTrip.Pernr;
			var sTripno = oTrip.Tripno;

			if (!oController._oPdfViewer) {
				oController._oPdfViewer = new PDFViewer();
				oController.getView().addDependent(oController._oPdfViewer);
				
				oController._oPdfViewer.attachError(function () {
				MessageBox.show(I18n.get().getText(oController, "PDF_ERROR"), {
					icon: MessageBox.Icon.ERROR,
					title: I18n.get().getText(oController, "ST_ERROR")
				});
			});
			}

			var sTripComponent = 'R';
			if (oTrip && oTrip.__metadata && -1 !== oTrip.__metadata.type.indexOf("TravelExpense")) {
				sTripComponent = 'E';
			}
			var sSource = oModel.sServiceUrl + "/PrintPreviews(Pernr='" + sPernr + "',Tripno='" + sTripno + "',TripComponent='" + sTripComponent +
				"')/$value";

			
			oController._oPdfViewer.setSource(sSource);
			oController._oPdfViewer.setTitle(sTripno + (oTrip.Customer ? " - " + oTrip.Customer : ""));
			oController._oPdfViewer.setShowDownloadButton(false);
			oController._oPdfViewer.open();
		}

		/**
		 * Retrieves binding path, either from a list or from an object page entity
		 *
		 * @return sBindingPath
		 */
		function _getBindingPathFromButton(oEvent) {
			var sBindingPath;
			if (oController.getView().getBindingContext()) {
				// View is bound to an entity. It corresponds to an ObjectPage context
				sBindingPath = oController.getView().getBindingContext().getPath();
			} else {
				// Otherwise, binding should be retrieved from the selected element in a list.
				var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource());
				sBindingPath = oSmartTable && oSmartTable.getTable().getSelectedContextPaths()[0];
			}
			return sBindingPath;
		}

		/**
		 * Retrieves binding context, either from a list or from an object page entity
		 *
		 * @return sBindingPath
		 */
		function _getBindingContextFromButton(oEvent) {
			var sBindingContext;
			if (oController.getView().getBindingContext()) {
				// View is bound to an entity. It corresponds to an ObjectPage context
				sBindingContext = oController.getView().getBindingContext();
			} else {
				// Otherwise, binding should be retrieved from the selected element in a list.
				var oSmartTable = ControlUtil.getSmartTable(oEvent.getSource());
				if (oSmartTable.getTable().getSelectedItem()) {
					sBindingContext = oSmartTable && oSmartTable.getTable().getSelectedItem().getBindingContext();
				}
			}
			return sBindingContext;
		}

		function handleCopyAction(oEvent) {
			var that = this;
			// Retrieve the targetted trip to copy.
			var sourceControl = oEvent.getSource();
			var oList = ControlUtil.getSmartTable(sourceControl);
			var bDeleteObject = Utils.isEmptyObjectOrString(oList);
			var sEntityPath;
			if (bDeleteObject) {
				sEntityPath = this.getView().getBindingContext().getPath();
			} else {
				sEntityPath = oList.getTable().getSelectedContextPaths()[0];
			}

			if (Utils.isEmptyObjectOrString(sEntityPath)) {
				return;
			}
			var oTripObject = oEvent.getSource().getModel().getObject(sEntityPath);

			var sTripno = oTripObject.Tripno;
			var sPernr = oTripObject.Pernr;

			// Check if a trip is in draft mode
			var oDraftItem = ODataModelUtil.get().getDraftItem(oList);
			var sDraftTripno = oDraftItem && oDraftItem.getProperty("Tripno");

			var jsonData = {
				date: undefined,
				reason: "",
				pernr: sPernr,
				tripno: sTripno,
				stripMessage: sDraftTripno && sDraftTripno !== oTripObject.Tripno ? (TravelUtil.TripNumber.Initial === sDraftTripno ? I18n.get().getText(
					"DRAFT_WARNING_UNKNOWN", sDraftTripno) : I18n.get().getText("DRAFT_WARNING", sDraftTripno)) : "",
				stripType: sDraftTripno && sDraftTripno !== oTripObject.Tripno ? MessageType.Warning : MessageType.None
			};

			oController.sCopyFramgmentId = "CopyFragmentId";
			FragmentHelper.get().loadFragment({
				id: oController.sCopyFramgmentId,
				name: "sap.fin.travel.lib.reuse.view.fragments.Copy",
				controller: oController,
				models: {
					i18n: oController.getView().getModel("i18n"),
					copyDialogModel: new sap.ui.model.json.JSONModel()
				}
			}).then(function (copyFragment) {
				if (copyFragment) {
					that.oCopyFragment = copyFragment;
					that.oCopyFragment.getModel("copyDialogModel").setData(jsonData);

					that.oCopyFragment.open();
				}
			});
		}

		function handleCloseCopy(oEvent) {
			if (this.oCopyFragment) {
				this.oCopyFragment.close();
			}
		}

		function handleCopy(oEvent) {
			var oEventSource = oEvent.getSource();
			var that = this;
			var oModel = oController.getView().getModel();
			var oCopyDialogModel = this.oCopyFragment.getModel("copyDialogModel");
			var mParameters = {
				Date: oCopyDialogModel.getProperty("/date"),
				Customer: oCopyDialogModel.getProperty("/reason"),
				Pernr: oCopyDialogModel.getProperty("/pernr"),
				Tripno: oCopyDialogModel.getProperty("/tripno")
			};

			if (!mParameters.Date || !mParameters.Customer) {
				oCopyDialogModel.setProperty("/stripMessage", I18n.get().getText(oController, "COPY_MISSING_FIELD_ALERT"));
				oCopyDialogModel.setProperty("/stripType", MessageType.Error);
				return;
			}

			var fnError = function (oError) {
				if (MessageUtil.get().handleMessageResponse(oError)) {
					var error = MessageUtil.get().getErrorMessageResponse(oError);
					oCopyDialogModel.setProperty("/stripMessage", error.hasOwnProperty("message") ? error.message : error);
					var sErrorType = error.hasOwnProperty("type") ? MessageParser.ErrorType.toMessageType(error.type) : MessageType.Error;
					oCopyDialogModel.setProperty("/stripType", sErrorType);
				} else {
					oCopyDialogModel.setProperty("/stripMessage", MessageUtil.get().getErrorMessage(oError));
					oCopyDialogModel.setProperty("/stripType", MessageType.Error);
				}
			};

			var fnSuccessDuplicate = function (oData, response) {
				that.oCopyFragment.close();
				var sEntityPath = response.headers && response.headers.location && response.headers.location.split("/").slice(-1).pop();
				NavigationUtil.navigate(sEntityPath, oController.getView().getModel("view").getProperty("/level"));
			};

			var fnSuccessSubmit = function (oData, response) {
				PersistenceHelper.callFunction(oModel, {
					name: "/DuplicateTrip",
					source: oEventSource,
					success: fnSuccessDuplicate,
					error: fnError,
					functionalError: fnSuccessDuplicate,
					urlParameters: {
						Pernr: mParameters.Pernr,
						Tripno: mParameters.Tripno,
						Date: mParameters.Date,
						Customer: mParameters.Customer
					}
				});
			};

			PersistenceHelper.submitChanges(oModel, {
				source: oEventSource,
				success: fnSuccessSubmit,
				error: fnError,
				submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ACTION,
			});
		}

		function onBreadCrumbUrlPressed(oEvent) {
			oEvent.preventDefault();

			var oPressedLink = oEvent.getSource(); //link

			var sHash = HashChanger.getInstance().getHash();
			//hash is the target hash. For the breadcrumb, we need all but the last one
			var aSections = sHash.split("/");
			aSections.pop(); //breadcrumb works on upper parts, not the current context ;)
			var oBreadcrumbs = oController._getBreadcrumbs();
			var iLevel = 1;
			oBreadcrumbs.getLinks().reverse().forEach(function (oLink, index, array) {
				if (oLink !== oPressedLink) {
					iLevel += 1;
					aSections.pop();
					return true;
				}
				//processed link if the clicked one, we shall navigate to it
				var sPath = aSections.join("/");
				NavigationUtil.navigate(sPath, oController.getView().getModel("view").getProperty("/level") - iLevel, true);
			});

			//				window.location.hash = sHref; //also updates the browser history
		}

		function _setSelectedItemAndFire(oTable, oItem) {
			oItem.setSelected(true);
			oTable.fireSelectionChange({
				listItem: oItem,
				selected: true
			});
		}

		function handleSelectionChange(oEvent) {
			var sNewSelectedTripPath = oEvent.getSource().getSelectedContextPaths()[0];
			var oSelectedTrip = new Context(oController.getView().getModel(), sNewSelectedTripPath);
			var bSelectedTripDeletable = oSelectedTrip.getProperty("Deletable");
			var iPersistenceStatus = oSelectedTrip.getProperty("Persistencestatus");

			// Manage list buttons
			oController.byId(TravelUtil.DefaultButtons.DeleteListPage).setEnabled(bSelectedTripDeletable);
			oController.byId(TravelUtil.DefaultButtons.CopyListPage).setEnabled(iPersistenceStatus === TravelUtil.PersistenceStatus.Save);
			oController.byId(TravelUtil.DefaultButtons.ExportListPage).setEnabled(true);
			_adjustButtonEnablement(oEvent);
		}
		
		/**
		 * Custom toolbar could not be completely disabled as it contains both personalization/settings buttons and action buttons
		 * We want to control action buttons only.
		 * 
		 * @parameter{boolean} bEnabled: controls whether we activate or deactivate the custom bar action buttons. By default we activate in default state
		 */ 
		function _customToolBarActionButton(bEnabled){
			bEnabled = undefined === bEnabled ? true : bEnabled; 
			var fnById = oController.getView().byId.bind(oController);
			if (!oController.actionButtonEnablement){
				oController.actionButtonEnablement = new Map();
			}
			
			var actionButtonLayouts = $("[class~=customToolBarActionButton]").toArray();
			
			//there should be only one
			actionButtonLayouts.forEach(function(e){
				var el = fnById(e.id);
				
				el.getAggregation("content").forEach(function(e){ 
					if (e instanceof sap.m.Button){
						if (bEnabled){
							e.setEnabled(oController.actionButtonEnablement.get(e.getId()));
						} else if (!oController.actionButtonEnablement.has(e.getId())){
							oController.actionButtonEnablement.set(e.getId(), e.getEnabled());
							e.setEnabled(false);
						}
					}
				});
				
				if (bEnabled){
					oController.actionButtonEnablement.clear();
				}
				
			});
			
		}

		function onAssignedFiltersChanged(oEvent) {
			if (oEvent.getSource()) {
				oController.byId("template::FilterText").setText(oEvent.getSource().retrieveFiltersWithValuesAsText());
				// Disable SmartTable toolbar
				if (oController.byId("listPageSmartTableID")) {
					_customToolBarActionButton(false);
					//oController.byId("listPageSmartTableID").getCustomToolbar().setEnabled(false);
				}
			}
		}

		function onShowMessages() {
			MessageUtil.get().toggleMessagesPopover();
		}

		function handleApplyAction(oEvent) {
			checkAppForms(oEvent, undefined, function () {
				var fnSuccess = function () {
					oController._fclHandler.handleClose();
				};
				var fnfunctionalError = function () {
					MessageUtil.get().openMessagesPopover();
				};
				PersistenceHelper.apply(oController.getView().getModel(), {
					success: fnSuccess,
					functionalError: fnfunctionalError
				});
			});
		}

		function onContactDetails(oEvent) {
			var oButton = oEvent.getSource();
			var sFragmentId = oController.getView().getId() + "ContactDetailsPopoverFragment";
			FragmentHelper.get().loadFragment({
				id: sFragmentId,
				name: "sap.fin.travel.lib.reuse.DetailPage.view.fragments.ContactDetails",
				controller: oController,
				models: {
					i18n: oController.getView().getModel("i18n")
				}
			}).then(function (oContactDialog) {
				if (oContactDialog) {
					oContactDialog.setModel(oController.getView().getModel());
					var sContactId = oButton.getBindingContext().getProperty("Approverid") ? oButton.getBindingContext().getProperty("Approverid") :
						oButton.getBindingContext().getProperty("Authorid");
					oContactDialog.bindElement("/Contacts('" + sContactId + "')");
					oContactDialog.openBy(oButton);
				}
			});
		}

		function handleOnSort() {
			var oSmartTable = oController.getView().byId("listPageSmartTableID");
			if (oSmartTable) {
				oSmartTable.openPersonalisationDialog("Sort");
			}
		}

		function handleOnGroup() {
			var oSmartTable = oController.getView().byId("listPageSmartTableID");
			if (oSmartTable) {
				oSmartTable.openPersonalisationDialog("Group");
			}
		}

		function handleOnColumns() {
			var oSmartTable = oController.getView().byId("listPageSmartTableID");
			if (oSmartTable) {
				oSmartTable.openPersonalisationDialog("Columns");
			}
		}

		function handleDataFieldForAction(oEvent) {
			var oSource = oEvent.getSource();
			checkAppForms(oEvent, false, function () {
				var oList = ControlUtil.getSmartTable(oSource);
				var oDraftItem = ODataModelUtil.get().getDraftItem(oList);
				var sDraftTripno = oDraftItem && oDraftItem.getProperty("Tripno");
				ActionUtil.callAction(oSource, oController, sDraftTripno);
			});
		}

		function handleInlineDataFieldForAction(oEvent) {
			var oSource = oEvent.getSource();
			checkAppForms(oEvent, true, function () {
				ActionUtil.callInLineAction(oSource, oController);
			});
		}

		function handleShowPrevObject(oEvent) {
			var sTripPath = oEvent.getSource().getBindingContext().getPath();
			var aBindingPaths = NavigationUtil.bindingPaths(HashChanger.getInstance().getHash()).paths;
			aBindingPaths.pop();

			var mParameters = {
				parentPath: aBindingPaths.join(''),
				navObjectPath: PaginatorHelper.get().getPrevEntry(oController.getView().getModel("view").getProperty("/level"), sTripPath)
			};
			var oPaginatorEvent = new Event(oController.createId("travel::paginator::event"), oEvent.getSource(), mParameters);
			handleCancelAction(oPaginatorEvent);
		}

		function handleShowNextObject(oEvent) {
			var sTripPath = oEvent.getSource().getBindingContext().getPath();
			var aBindingPaths = NavigationUtil.bindingPaths(HashChanger.getInstance().getHash()).paths;
			aBindingPaths.pop();

			var mParameters = {
				parentPath: aBindingPaths.join(''),
				navObjectPath: PaginatorHelper.get().getNextEntry(oController.getView().getModel("view").getProperty("/level"), sTripPath)
			};
			var oPaginatorEvent = new Event(oController.createId("travel::paginator::event"), oEvent.getSource(), mParameters);
			handleCancelAction(oPaginatorEvent);
		}

		function onShareActionButtonPress(oEvent) {
			var oButton = oEvent.getSource();
			var sFragmentId = oController.getView().getId() + "SharePopoverFragment";
			FragmentHelper.get().loadFragment({
				id: sFragmentId,
				name: "sap.fin.travel.lib.reuse.view.fragments.Share",
				controller: oController,
				models: {
					i18n: oController.getView().getModel("i18n")
				}
			}).then(function (oShareDialog) {
				if (oShareDialog) {
					oShareDialog.setModel(new JSONModel(), "share");
					oShareDialog.setModel(oController.getView().getModel());

					$("[id*=travelDetailObjectPageHeader]").each(function (i, j) {
						var oObjectPageHeader = oController.getView().byId(j.id);
						if (oObjectPageHeader) {
							if (oObjectPageHeader.getMetadata().getName() === "sap.uxap.ObjectPageHeader") {
								AppComponent.get().updateGlobalModel("/share/title", oObjectPageHeader.getObjectTitle());
								AppComponent.get().updateGlobalModel(
									"/share/subTitle", oObjectPageHeader.getObjectSubtitle());
							}
							if (oObjectPageHeader.getMetadata()
								.getName() === "sap.uxap.ObjectPageDynamicHeaderTitle") {
								AppComponent.get().updateGlobalModel("/share/title", oObjectPageHeader.getExpandedHeading().getText());
								AppComponent.get().updateGlobalModel(
									"/share/subTitle", oObjectPageHeader.getExpandedContent()[0].getText());
							}
							AppComponent.get().updateGlobalModel("/share/customUrl", document.URL);
						}
					});
					var oShareModel = oShareDialog.getModel("share");
					var oNewData = jQuery.extend(oShareModel.getData(), AppComponent.get().getGlobalModel().getProperty("/share"));
					oShareModel.setData(
						oNewData);
					oShareDialog.openBy(oButton);
				}
			});
		}

		function onBeforeRebindDetailTable(oEvent) {
			var oBindingParams = oEvent.getParameter("bindingParams");
			oBindingParams.parameters = oBindingParams.parameters || {};
		}

		function onIconTabBarSelect(oEvent) {

			var oSource = oEvent.getSource();
			var oCustomData = CustomDataUtil.getCustomData(oEvent.getSource(), "entitySet");
			var bCostAssignments = oCustomData && -1 !== oCustomData.indexOf("CostAssignments");
			var sSelectedKey = oEvent.getParameter("selectedKey");
			if (bCostAssignments) {
				var sCostAssignmentDestinationValue = sSelectedKey === "Percentage" ? "P" : "B";

				var sCostAssignementSourceValue = oSource.getBindingContext().getProperty("PercAbs");
				if (sCostAssignementSourceValue === sCostAssignmentDestinationValue) {
					return; //same selection, we do not trigger the percentage switch
				}

				var fnSuccess = function () {
					//refresh receipt and rebind tables
					oSource.getAggregation("items").forEach(function (item) {
						var aContent = item.getContent();
						if (aContent && aContent.length > 0 && aContent[0] && aContent[0].rebindTable) {
							aContent[0].rebindTable();
						}
					});

					PersistenceHelper.read(oSource.getModel(), oSource.getBindingContext().getPath());
				};

				var fnError = function (oData, oResponse) {
					//display message strip error and revert back to initial selected key (the other one)

					var sError, sErrorType;
					if (MessageUtil.get().handleMessageResponse(oResponse)) {
						var error = MessageUtil.get().getErrorMessageResponse(oResponse);
						sError = error.hasOwnProperty("message") ? error.message : error;
						sErrorType = error.hasOwnProperty("type") ? MessageParser.ErrorType.toMessageType(error.type) : MessageType.Error;
					} else {
						sError = MessageUtil.get().getErrorMessage(oResponse);
						sErrorType = MessageType.Error;
					}

					var fnMessageBox;
					switch (sErrorType) {
					case MessageType.Warning:
						MessageBox.warning(sError);
						break;
					case MessageType.Error:
						MessageBox.error(sError);
						break;
					default:
						MessageBox.alert(sError);
					}

					oSource.setSelectedKey(sCostAssignementSourceValue === "B" ? "Absolute" : "Percentage");
				};
				//Icontab bar for select between absolute and percentage for cost assignments
				PersistenceHelper.callFunction(oSource.getModel(), {
					name: "/SwitchPercAbsForReceipt",
					success: fnSuccess,
					error: fnError,
					functionalError: fnError,
					urlParameters: {
						Pernr: oSource.getBindingContext().getProperty("Pernr"),
						Receiptno: oSource.getBindingContext().getProperty("Receiptno"),
						Tripno: oSource.getBindingContext().getProperty("Tripno")
					}
				});
			}
		}

		return {
			handleEditAction: handleEditAction,
			handleCancelAction: handleCancelAction,
			handleCreateActionList: handleCreateActionList,
			handleCreateCustomAction: handleCreateCustomAction,
			handleSearcheableActionItemConfirm: handleSearcheableActionItemConfirm,
			handleSearcheableActionItemCancel: handleSearcheableActionItemCancel,
			handleCreateActionSearcheableList: handleCreateActionSearcheableList,
			handleSearcheableActionItemSearch: handleSearcheableActionItemSearch,
			handleInlineDataFieldForAction: handleInlineDataFieldForAction,
			handleDataFieldForAction: handleDataFieldForAction,
			handleSaveAction: handleSaveAction,
			handleSubmitAction: handleSubmitAction,
			handleCreateAction: handleCreateAction,
			handleDeleteAction: handleDeleteAction,
			handleExportAction: handleExportAction,
			handleCopyAction: handleCopyAction,
			handleCloseCopy: handleCloseCopy,
			handleCopy: handleCopy,
			handleApplyAction: handleApplyAction,
			handleOnSort: handleOnSort,
			handleOnGroup: handleOnGroup,
			handleOnColumns: handleOnColumns,
			handleListPageItemPress: handleListPageItemPress,
			handleItemPress: handleItemPress,
			closeDraftAdminPopover: closeDraftAdminPopover,
			closeDiscardPopover: closeDiscardPopover,
			handleOnDraftLinkPressed: handleOnDraftLinkPressed,
			handleSelectionChange: handleSelectionChange,
			onAssignedFiltersChanged: onAssignedFiltersChanged,
			initListPageFilterBar: initListPageFilterBar,
			onFilterBarDataReceived: onFilterBarDataReceived,
			handleFilterBarSearchPressed: handleFilterBarSearchPressed,
			onShowMessages: onShowMessages,
			onSelectionChange: onDetailPageSelectionChange,
			onIconTabBarSelect: onIconTabBarSelect,
			onDataReceived: onDataReceivedDetailTable,
			onContactDetails: onContactDetails,
			onBreadCrumbUrlPressed: onBreadCrumbUrlPressed,
			handleShowPrevObject: handleShowPrevObject,
			handleShowNextObject: handleShowNextObject,
			onShareActionButtonPress: onShareActionButtonPress,
			onDataReceivedCommentsSection: onDataReceivedCommentsSection,
			handleSaveAsDraftAction: handleSaveAsDraftAction,
			onBeforeRebindDetailTable: onBeforeRebindDetailTable,
			checkAppForms: checkAppForms
		};
	}

	return BaseObject.extend("sap.fin.travel.lib.reuse.util.EventHandler", {
		constructor: function (oController) {
			jQuery.extend(this, getMethods(oController));
		}
	});

});

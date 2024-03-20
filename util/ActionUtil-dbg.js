/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/PersistenceHelper",
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/fin/travel/lib/reuse/util/NavigationUtil",
	"sap/fin/travel/lib/reuse/util/CustomDataUtil",
	"sap/fin/travel/lib/reuse/util/ODataModelUtil",
	"sap/fin/travel/lib/reuse/util/FragmentHelper",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/ControlUtil",
	"sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/fin/travel/lib/reuse/util/MessageParser",
	"sap/ui/core/routing/HashChanger",
	"sap/ui/comp/smartform/SmartForm",
	"sap/ui/comp/smartform/Group",
	"sap/ui/comp/smartform/GroupElement",
	"sap/ui/comp/smartfield/SmartField",
	"sap/ui/comp/smartfield/SmartLabel",
	"sap/ui/model/Context",
	"sap/m/PDFViewer",
	"sap/ui/core/CustomData"
], function (PersistenceHelper, I18n, NavigationUtil, CustomDataUtil, ODataModelUtil, FragmentHelper, Utils, ControlUtil, MessageUtil,
	MessageParser, HashChanger, SmartForm, Group, GroupElement, SmartField, SmartLabel, Context, PDFViewer, CustomData) {
	"use strict";

	function getMethods() {

		/**
		 * Determines if the action requieres a Navigation.
		 */
		function _navigate(oModel, oContext, oNavPath, oEventSource) {
			if (Utils.isEmptyObjectOrString(oNavPath.subPath)) {
				PersistenceHelper.invalidateEntry(oModel, NavigationUtil.bindingPaths(HashChanger.getInstance().getHash()).paths.pop());
				var oSmartTable = ControlUtil.getSmartTable(oEventSource);
				if (oSmartTable) {
					oSmartTable.rebindTable();
					// var oUIState = oSmartTable.getUiState();
				}
			} else if (!Utils.isEmptyObjectOrString(oNavPath.navPath)) {
				NavigationUtil.navigate(oNavPath.navPath, oContext.controller.getView().getModel("view").getProperty("/level"));
			}
		}

		/**
		 * Create the current context.
		 *  - create the targeted (Funtion Import) context
		 *  - get current envet source context
		 *  - save some object context
		 */
		function _createContext(oModel, oEventSource, sContextName) {
			var sTargetPath = sContextName + "('" + ODataModelUtil.get().uid() + "')";
			var oTargetContext = new Context(oModel, sTargetPath);
			var aContexts = [];
			if (oEventSource.getBindingContext()) {
				aContexts.push(oEventSource.getBindingContext());
			}
			return {
				model: oModel,
				source: oEventSource,
				contexts: aContexts,
				targetContext: oTargetContext
			};
		}

		/**
		 * Update the current context.
		 * Case 1: if action-for option is enabled meaning item selection form table is requested, then add the binding context of selected item.
		 * Case 2: if no context can be found default to the UserProfiles root entity binding context.
		 */
		function _updateContext(oContext, oFunctionImport) {
			if (oFunctionImport.hasOwnProperty("sap:action-for")) {
				var oList = ControlUtil.getOwnerControl(oContext.source);
				if (oList) {
					var aSelectedItems = typeof oList.getTable === "function" ? oList.getTable().getSelectedItems() : oList.getSelectedItems();
					if (aSelectedItems && aSelectedItems.length > 0) {
						oContext.contexts.unshift(aSelectedItems[0].getBindingContext());
					}
				}
			}
			if (oContext.contexts.length === 0) {
				// Switch to default global context
				oContext.contexts.push(new Context(oContext.model, "/UserProfiles('" + oContext.key + "')"));
			}
		}

		function _getPropertyKeys(oEntityType) {
			var oKeyMap = {};

			if (oEntityType && oEntityType.key && oEntityType.key.propertyRef) {
				for (var i = 0; i < oEntityType.key.propertyRef.length; i++) {
					var sKeyName = oEntityType.key.propertyRef[i].name;
					oKeyMap[sKeyName] = true;
				}
			}
			return oKeyMap;
		}

		function _getParameterName(oParameter) {
			// if no label is set for parameter use parameter name as fallback
			return oParameter["com.sap.vocabularies.Common.v1.Label"] ? oParameter["com.sap.vocabularies.Common.v1.Label"].String : oParameter.name;
		}

		/**
		 * From the context, compares objects and determine list of porperties that has been changes in bewteen function import call.
		 * Objects are compared only if origin and returned entities are identical.
		 * Then we apply the same logic for the Side Effects.
		 *	- If property from the changes list are defined as SourceProperties of the entity, we are refreshing the corresponding TargetEntities
		 */
		function _determineChangesAndRefreshTargetEntites(oContext, oResponse) {
			var oSingleContext = oContext.contexts[0];
			var sPath = oSingleContext.getPath();
			var aNavPropertyPath = [];

			if (0 !== sPath.indexOf("/")) {
				sPath = "/" + sPath;
			}

			oContext.sideEffect.target = oResponse.data;
			if (oResponse.data.hasOwnProperty("__batchResponses")) {
				// Response is of type batch
				var oResponseBatch = oResponse.data.__batchResponses[0]; // This should be always the first request
				if (oResponseBatch.hasOwnProperty("__changeResponses")) {
					var oChangeResponses = oResponseBatch.__changeResponses[0]; // Function import does not return multiple entity so taking the first
					oContext.sideEffect.target = oChangeResponses.data;
				}
			}

			if (oContext.sideEffect.originType === oContext.sideEffect.functionImport.returnType) {
				var aSideEffectChanges = [];
				Utils.getObjectChanges(oContext.sideEffect.origin, oContext.sideEffect.target, aSideEffectChanges);
				//origin contains only SourceProperties. Any change detected on these fields mean we need to trigger the side effect
				var bSubmitChanges = aSideEffectChanges.length > 0;
				
				if (oContext.sideEffect.TargetEntities.length > 0) {
					// Read Navigation Properties to refresh corresponding sub-entities
					for (var k = 0; k < oContext.sideEffect.TargetEntities.length; k++) {
						var sNavPropertyPath = oContext.sideEffect.TargetEntities[k].NavigationPropertyPath;
						

						if (sNavPropertyPath != undefined) {
							aNavPropertyPath.push(sNavPropertyPath);
						}
					}
				}
				if (bSubmitChanges) {
					for (var i = 0; i < aNavPropertyPath.length; i++) {
						sNavPropertyPath = aNavPropertyPath[i];
						PersistenceHelper.read(oContext.model, sPath + "/" + sNavPropertyPath); // Refresh associations
					}
				}
			}
		}

		/**	

		/**
		 * Prepares the parameters which are needed as input for the action
		 *
		 * @param {array} 		aContexts Array of contexts used for action processing
		 * @param {string}		sFunctionName name of the Function Import to be called
		 *
		 * @returns {object} 	mActionParams Parameters that describe the Function Import:
		 * 						mActionParams.parameterData Array with mandatory parameters
		 *						mActionParams.additionalParameters Array with additional parameters
		 */
		function _prepareParameters(oContext, sFunctionName) {
			var oMetaModel = oContext.model.getMetaModel();
			var oFunctionImport = oMetaModel.getODataFunctionImport(sFunctionName);
			var oSingleContext, oEntityType, oTargetEntity;

			_updateContext(oContext, oFunctionImport);
			oSingleContext = oContext.contexts[0];
			var oContextObject = oSingleContext.getObject();
			if (oSingleContext && oSingleContext.getPath()) {
				var sEntitySet = ODataModelUtil.get().getEntitySetFromContext(oSingleContext);
				var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet, false);
				oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType, false);
			}

			var mActionParams = {
				parameterData: {},
				additionalParameters: [],
				functionImport: oFunctionImport,
				entitySet: oEntitySet,
				entityType: oEntityType
			};
			var oSourceKeyProperties = _getPropertyKeys(oEntityType);
			var oTargetKeyProperties = oFunctionImport.entitySet ? _getPropertyKeys(oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(
				oFunctionImport.entitySet).entityType)) : undefined;
			var aAddAmountField = [],
				aAddField = [];

			if (oFunctionImport.returnType) {
				// store TargetEntities to be refreshed via SideEffect annotations
				var oReturnedEntityType = oMetaModel.getODataEntityType(oFunctionImport.returnType, false);
				if (oReturnedEntityType && oReturnedEntityType.hasOwnProperty("com.sap.vocabularies.Common.v1.SideEffects#SideEffects")) {
					oContext.sideEffect = oReturnedEntityType["com.sap.vocabularies.Common.v1.SideEffects#SideEffects"];
					oContext.sideEffect.functionImport = oFunctionImport;
					oContext.sideEffect.origin = {}; 
					//retain source properties values before function import call
					oContext.sideEffect.SourceProperties.forEach(function(e){
						oContext.sideEffect.origin[e.PropertyPath] = oContext.contexts[0].getProperty(e.PropertyPath);
					});
					oContext.sideEffect.originType = oContext.contexts[0].getObject().__metadata.type;
				}
			}
			//Function Import parameters
			if (oFunctionImport.parameter) {
				for (var i = 0; i < oFunctionImport.parameter.length; i++) {
					var oParameter = oFunctionImport.parameter[i];
					var oParameterValue;
					var sParameterName = oParameter.name;
					var bIsSourceKey = !!oSourceKeyProperties[sParameterName];
					var bIsTargetKey = oTargetKeyProperties ? !!oTargetKeyProperties[sParameterName] : false;
					oParameterValue = undefined;
					if (oContextObject.hasOwnProperty(sParameterName)) {
						oParameterValue = oContextObject[sParameterName];
						bIsTargetKey &= !Utils.isEmptyObjectOrString(oContextObject[sParameterName]);
					} else if (bIsSourceKey) {
						// parameter is  not part of the current projection - raise error
						jQuery.sap.log.error("parameter of action not found in current context: " + sParameterName);
						throw new Error("parameter of action not found in current context: " + sParameterName);
					} else {
						// function import key parameter is not found in the context, we need to display it.
						bIsTargetKey = false;
					}
					mActionParams.parameterData[sParameterName] = oParameterValue;

					if (!bIsSourceKey && !bIsTargetKey && oParameter.mode.toUpperCase() == "IN") {
						// offer as optional parameter with default value from context
						if (oParameter["Org.OData.Measures.V1.ISOCurrency"] != undefined) {
							aAddAmountField.push(oParameter);
						} else {
							aAddField.push(oParameter);
						}
					}
				}
				// Making sure amount field are sorted at the begining.
				mActionParams.additionalParameters = mActionParams.additionalParameters.concat(aAddAmountField);
				mActionParams.additionalParameters = mActionParams.additionalParameters.concat(aAddField);
			}

			return mActionParams;
		}

		/**
		 * Initiate a form with all needed controls to allow providing missing
		 * parameters which are needed by the triggered action.
		 *
		 * @param {object} mParameters Map that contains the parameters - prefilled and additional
		 * @param {object} oContext Context object of the triggered action
		 *
		 * @returns {object} A map with the two members: "form" and "getEmptyMandatoryFields"
		 */
		function fnBuildParametersForm(mParameters, oContext) {
			var oForm = new SmartForm({
				editable: true
			});

			oForm.setBindingContext(oContext);
			// list of all smart fields for input check
			var oField;
			var aFields = [];
			var oGroup = new Group({
				label: ""
			});
			var oGroupElement;
			var sLabel;
			var oUom;
			var aCurrency = [];
			var mValueList = new Map();

			for (var idxAddParam = 0; idxAddParam < mParameters.additionalParameters.length; idxAddParam++) {
				var oParameter = mParameters.additionalParameters[idxAddParam];
				if (-1 === aCurrency.indexOf(oParameter.name)) {
					var sValueType = oParameter["com.sap.vocabularies.Common.v1.ValueListWithFixedValues"] ? "fixed-values" : undefined;
					var isUOM = oParameter["Org.OData.Measures.V1.ISOCurrency"] != undefined;
					var isValueList = oParameter["com.sap.vocabularies.Common.v1.ValueList"] != undefined;
					var sInOutParameter = "";
					var aOutParameters = [];
					var additionalAnnotations = [];

					//Create a smartfield with data form outside
					oField = new SmartField({
						value: '{' + oParameter.name + '}',
						textLabel: _getParameterName(oParameter),
						width: "100%",
						/*configuration: {
			                preventInitialDataFetchInValueHelpDialog: false
			            }*/
					}).addStyleClass("sapUiSmallMarginBottom");
					if (isUOM) {
						var oUomParameter = mParameters.additionalParameters.find(function (elem) {
							return elem.name === oParameter["Org.OData.Measures.V1.ISOCurrency"].Path;
						});
						aCurrency.push(oParameter["Org.OData.Measures.V1.ISOCurrency"].Path);
						oUom = {
							entitySet: mParameters.entitySet,
							entityType: mParameters.entityType,
							navigationPath: "",
							path: oParameter["Org.OData.Measures.V1.ISOCurrency"].Path,
							property: {
								property: oUomParameter,
								typePath: oParameter["Org.OData.Measures.V1.ISOCurrency"].Path
							}
						};
						// Read Only parameter
						if (oUomParameter["com.sap.vocabularies.Common.v1.FieldControl"] && oUomParameter["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember ===
							"com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
							oField.setUomEditable(false);
						}
					}
					if (isValueList) {
						for (var idxParam = 0; idxParam < oParameter["com.sap.vocabularies.Common.v1.ValueList"].Parameters.length; idxParam++) {
							var oValueListParameter = oParameter["com.sap.vocabularies.Common.v1.ValueList"].Parameters[idxParam];
							switch (oValueListParameter.RecordType) {
							case "com.sap.vocabularies.Common.v1.ValueListParameterInOut":
								sInOutParameter = oValueListParameter.LocalDataProperty.PropertyPath;
								break;
							case "com.sap.vocabularies.Common.v1.ValueListParameterOut":
								aOutParameters.push(oValueListParameter.LocalDataProperty.PropertyPath);
								break;
							default:
							}
						}
						// handle additional value list
						for (var sProperty in oParameter) {
							if (sProperty.indexOf("com.sap.vocabularies.Common.v1.ValueList#") > -1) {
								additionalAnnotations.push(oParameter[sProperty]);
							}
						}
					}
					oField.data("configdata", {
						"configdata": {
							isInnerControl: oParameter["Org.OData.Measures.V1.ISOCurrency"] != undefined,
							path: oParameter.name,
							entitySetObject: {},
							annotations: {
								valuelist: oParameter["com.sap.vocabularies.Common.v1.ValueList"],
								valuelistType: sValueType,
								uom: oUom
							},
							additionalAnnotations: additionalAnnotations,
							modelObject: oContext.oModel,
							entityType: oParameter.type,
							property: {
								property: oParameter,
								typePath: oParameter.name
							},
							isUOM: oParameter["Org.OData.Measures.V1.ISOCurrency"] != undefined,
							inOutParameter: sInOutParameter,
							outParameters: aOutParameters.join()
						}
					});

					//set mandatory if requested
					if (oParameter.nullable == "false") {
						oField.setMandatory(true);
					}

					if (oParameter["com.sap.vocabularies.Common.v1.FieldControl"]) {
						if ("com.sap.vocabularies.Common.v1.FieldControlType/Hidden" === oParameter["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember) {
							oField.setVisible(false);
						}
						if ("com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly" === oParameter["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember) {
							oField.setEnabled(false);
						}
					}
					oGroupElement = new GroupElement();
					oGroupElement.addElement(oField);
				}
				oGroup.addGroupElement(oGroupElement);
				oForm.addGroup(oGroup);
			}

			var fnGetEmptyMandatoryValueHelpFields = function () {
				var aOutParameters = [];
				var aInOutFields = jQuery.grep(oForm.getSmartFields(), function (oField) { // get field list of value list parameter
					var oCustomData = oField.getCustomData().find(function (oCustomData) {
						return oCustomData.getKey() === "configdata";
					});
					return (oCustomData && !Utils.isEmptyObjectOrString(oCustomData.getValue().configdata.outParameters)); // keep only field with out parameters
				});
				if (aInOutFields && aInOutFields.length > 0) {
					aInOutFields.forEach(function (oInOutField) {
						var oCustomData = oInOutField.getCustomData().find(function (oCustomData) {
							return oCustomData.getKey() === "configdata";
						});
						aOutParameters = aOutParameters.concat(oCustomData.getValue().configdata.outParameters.split());
					});
				}
				var aMandatoryFields = jQuery.grep(oForm.getSmartFields(), function (oField) {
					var isValueListMandatory = false;
					if (aOutParameters) {
						isValueListMandatory = aOutParameters.indexOf(oField.getDataProperty().property.name) !== -1;
					}
					return (isValueListMandatory == true && oField.getValue() == "" && oField.getDataType() !=
						"Edm.Boolean");
				});
				return aMandatoryFields;
			};

			var fnGetEmptyMandatoryFields = function () {
				var aMandatoryFields = jQuery.grep(oForm.getSmartFields(), function (oField) {
					return (oField.getMandatory() == true && oField.getValue() == "" && oField.getDataType() != "Edm.Boolean");
				});
				return aMandatoryFields;
			};

			var fnCheckValuesValidityFields = function () {
				return oForm.check();
			};

			return {
				form: oForm,
				getEmptyMandatoryFields: fnGetEmptyMandatoryFields,
				getEmptyMandatoryValueHelpFields: fnGetEmptyMandatoryValueHelpFields,
				checkValuesValidityFields: fnCheckValuesValidityFields
			};
		}

		/**
		 * Triggers the chain of the action call's preparation, its processing and its result handling.
		 * Popup is displayed in case on additional parameters are requested to be sent.
		 *
		 * @param {object} oEventSource event source of the triggered action.
		 * @param {object} oController current context controller.
		 * @param {string} sDraftTripno current draft trip number.
		 * @param {boolean} bPopup Default true. Action should be displayed in a popup. This property is only available if there is at least one additional parameter.
		 */
		function fnCallAction(oEventSource, oController, sDraftTripno, bPopup) {
			var that = this,
				oHandler,
				oActionContext;
			var oBindingSource = oEventSource.getBindingContext();
			var sPernr = oBindingSource ? oBindingSource.getProperty("Pernr") : ODataModelUtil.get().getCurrentTripContext().Pernr;
			var oModel = oController.getView().getModel();
			var oCustomData = CustomDataUtil.getObjectCustomData(oEventSource);

			//Get Field Group Action
			var sEntityName = oCustomData.FieldGroupAction;

			// Absolute value for Function name
			var sFunctionName = '/' + oCustomData.Action.split('/')[1];
			var oContext = _createContext(oModel, oEventSource, sFunctionName);
			oContext.key = sPernr;
			oContext.controller = oController;

			// Build Function Import Parameters
			var mActionParams;
			mActionParams = _prepareParameters(oContext, oCustomData.Action, oContext.controller);
			// Build Label
			var _sFunctionImportLabel = oCustomData.Label || sFunctionName;

			var fnAbort = function (oController) {
				ODataModelUtil.get().removeDeferredGroupId(oContext.model, that.sActionGroupId);
				if (oActionContext || (oController && oController.actionContext)) {
					oContext.model.deleteCreatedEntry(oActionContext ? oActionContext : oController.actionContext);
				}
				if (oHandler) {
					oHandler.abort();
				}
			};

			//Keep previous pending changes
			oContext.pendingChanges = oContext.model.getPendingChanges();

			if (mActionParams != undefined && mActionParams.additionalParameters && mActionParams.additionalParameters.length == 0) {
				var mParameters = {
					urlParameters: mActionParams.parameterData,
					batchGroupId: this.sActionGroupId,
					functionImport: mActionParams.functionImport
				};

				//indicate that we can collect all changes from group pdDeductionsChanges
				ODataModelUtil.get().addDeferredGroupId(oContext.model, this.sActionGroupId);

				var fnSuccess = function (oData, response) {
					var sLocation;
					if (response.headers.location){
						sLocation = response.headers.location.split("/").pop();
					}else if (response && response.data && response.data.__batchResponses && response.data.__batchResponses[0]
					&& response.data.__batchResponses[0].__changeResponses && response.data.__batchResponses[0].__changeResponses[0]
					&& response.data.__batchResponses[0].__changeResponses[0].headers && response.data.__batchResponses[0].__changeResponses[0].headers["location"]){
						sLocation = response.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
					}
				
					ODataModelUtil.get().removeDeferredGroupId(oContext.model, that.sActionGroupId);

					//Trigger Navigation to the returned entity
					if (oData && response && Utils.getPropertyOrSubPropery(oData, "PDF")) { // Export As PDF
						if (!oContext.controller._oPdfViewer) {
							oContext.controller._oPdfViewer = new PDFViewer();
							oContext.controller.getView().addDependent(oContext.controller._oPdfViewer);
						}
						var sSource = Utils.getPropertyOrSubPropery(response.data, "URL");
						oContext.controller._oPdfViewer.setSource(sSource);
						oContext.controller._oPdfViewer.setTitle("PDF Form");
						oContext.controller._oPdfViewer.setShowDownloadButton(false);
						oContext.controller._oPdfViewer.open();
					} else if (oData && Utils.getPropertyOrSubPropery(oData, "ExternalLink")) { // Get External Link
						// Open new tab with URL
						window.open(Utils.getPropertyOrSubPropery(oData, "URL"), "_blank","noopener,noreferrer");
					} else { // Navigate to new entity
						if (sEntityName != "TravelPlan") { //No navigation
							//default behavior: detect entity creation and navigate to it (and refresh it if possible)
							//Navigate only if created entity is child of current entity. i.e. do not navigate if created entity is the same than the current one
							var navPathFromResponse = NavigationUtil.getNavigationPathFromReponse(oData, response);
							var bNavigate = !Utils.isEmptyObjectOrString(navPathFromResponse.subPath) && !Utils.isEmptyObjectOrString(navPathFromResponse.navPath);
							var bContextChanged = oContext.contexts[0].getPath().substring(1) !== navPathFromResponse.subPath;
							//if the data action calls refreshes the entity being manipulated, we check for potential side effects
							if (!bContextChanged && !bNavigate){
								_determineChangesAndRefreshTargetEntites(oContext, response);
							}
							_navigate(oModel, oContext, navPathFromResponse, oEventSource);
						}
					}
				};
				// Submit Changes then call function Import if no error returned
				var fnSuccessSubmit = function () {
					//Call Function Import
					PersistenceHelper.callFunction(oModel, {
						name: sFunctionName,
						source: oEventSource,
						success: fnSuccess,
						error: fnAbort,
						functionalError: fnAbort,
						urlParameters: mActionParams.parameterData,
						batchGroupId: mParameters.batchGroupId
					});
				};
				var fnActionToExcecute = function () {
					PersistenceHelper.submitChanges(oModel, {
						success: fnSuccessSubmit,
						error: fnAbort,
						functionalError: fnSuccessSubmit,
						submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ACTION,
					});
				};
				if (mActionParams.functionImport) {
					var bActionCritical = mActionParams.functionImport["com.sap.vocabularies.Common.v1.IsActionCritical"] != undefined;
					if (bActionCritical) {
						FragmentHelper.get().confirmationDialog({
							controller: oContext.controller,
							name: mActionParams.functionImport.name,
							label: _sFunctionImportLabel,
							success: fnActionToExcecute,
							error: fnAbort
						});
						return;
					}
				}
				fnActionToExcecute();
			} else if (mActionParams != undefined && mActionParams.additionalParameters && mActionParams.additionalParameters.length > 0) {
				var mParameters = {
					urlParameters: {},
					batchGroupId: this.sActionGroupId,
					functionImport: mActionParams.functionImport
				};

				//indicate that we can collect all changes from group pdDeductionsChanges
				ODataModelUtil.get().addDeferredGroupId(oContext.model, this.sActionGroupId);

				//Trigger Function import call
				var fnTriggerFunctionImportCall = function (oContextParam) {
					var fnSuccess = function (oData, response) {
						var sLocation;
						if (response.headers.location){
							sLocation = response.headers.location.split("/").pop();
						}else if (response && response.data && response.data.__batchResponses && response.data.__batchResponses[0]
						&& response.data.__batchResponses[0].__changeResponses && response.data.__batchResponses[0].__changeResponses[0]
						&& response.data.__batchResponses[0].__changeResponses[0].headers && response.data.__batchResponses[0].__changeResponses[0].headers["location"]){
							sLocation = response.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
						}
				
						ODataModelUtil.get().removeDeferredGroupId(oContext.model, that.sActionGroupId);

						if (that.oActionDialog) {
							that.oActionDialog.close();
						}

						//Trigger Navigation to the returned entity
						if (oData && response && Utils.getPropertyOrSubPropery(oData, "PDF")) { // Export As PDF
							if (!oContext.controller._oPdfViewer) {
								oContext.controller._oPdfViewer = new PDFViewer();
								oContext.controller.getView().addDependent(oContext.controller._oPdfViewer);
							}
							var sSource = Utils.getPropertyOrSubPropery(response.data, "URL");
							oContext.controller._oPdfViewer.setSource(sSource);
							oContext.controller._oPdfViewer.setTitle("PDF Form");
							oContext.controller._oPdfViewer.setShowDownloadButton(false);
							oContext.controller._oPdfViewer.open();
						} else if (oData && Utils.getPropertyOrSubPropery(oData, "ExternalLink")) { // Get GDS Link
							// Open new tab with URL
							window.open(Utils.getPropertyOrSubPropery(oData, "URL"), "_blank","noopener,noreferrer");
						} else { // Navigate to new entity
							if (sEntityName != "TravelPlan") { //No navigation
								//default behavior: detect entity creation and navigate to it (and refresh it if possible)
								//Navigate only if created entity is child of current entity. i.e. do not navigate if created entity is the same than the current one, in this case invalidate
								var navPathFromResponse = NavigationUtil.getNavigationPathFromReponse(oData, response);
								var bNavigate = !Utils.isEmptyObjectOrString(navPathFromResponse.subPath) && !Utils.isEmptyObjectOrString(navPathFromResponse.navPath);
								var bContextChanged = oContext.contexts[0].getPath().substring(1) !== navPathFromResponse.subPath;
								//if the data action calls refreshes the entity being manipulated, we check for potential side effects
								if (!bContextChanged && !bNavigate){
									_determineChangesAndRefreshTargetEntites(oContext, response);
								}
								_navigate(oModel, oContext, navPathFromResponse, oEventSource);
							}
						}
					};

					// Prevent sending null value to OData Service
					var oContextObject, sContextObjectPath;
					for (var sChange in oModel.getPendingChanges()) {
						// check in all pending changes and replace null value with ""
						sContextObjectPath = "/" + sChange;
						oContextObject = oModel.getProperty(sContextObjectPath);
						if (oContextObject) {
							for (var sKey in oContextParam) {
								if (oContextObject.hasOwnProperty(sKey) && oContextObject[sKey] == null) {
									oModel.setProperty(sContextObjectPath + "/" + sKey, "");
								}
							}
						}
					}

					//Discard previous pending changes
					ODataModelUtil.get().deletePendingChanges(oContext.model, oContext.pendingChanges);
					PersistenceHelper.submitChanges(oModel, {
						source: oEventSource,
						success: fnSuccess,
						// error: fnAbort,
						submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ACTION
					});
				};

				// Get Context promise
				oHandler = oContext.model.callFunction(
					sFunctionName, {
						method: mParameters.functionImport.httpMethod,
						urlParameters: mParameters.urlParameters,
						batchGroupId: mParameters.batchGroupId
					}
				);

				if (bPopup === false) { // we specify that we no dot want to open a popup.
					return {
						context: oHandler,
						success: fnTriggerFunctionImportCall,
						close: fnAbort,
						draftTripNo: sDraftTripno,
						actionParam: mActionParams
					};
				} else {
					oHandler.contextCreated().then(function (actionContext) {
						oActionContext = actionContext;
						var mParameterForm = fnBuildParametersForm(mActionParams, oActionContext);

						for (var sKey in mActionParams.parameterData) {
							oActionContext.oModel.setProperty(sKey, mActionParams.parameterData[sKey],
								oActionContext);
						}

						that.oActionDialog = FragmentHelper.get().getFunctionImportDialog(oContext, {
							label: _sFunctionImportLabel,
							parameter: mParameterForm,
							success: fnTriggerFunctionImportCall,
							close: fnAbort,
							draftTripNo: sDraftTripno,
							successArg: mActionParams.parameterData
						});

						var fnCheckErrorClient = function () {
							mParameterForm.form.getSmartFields().forEach(function (oField) {
								// We attach to the change event of the SmartFields bindings
								// The Change event will get fired only if the binding value is valid
								oField.getBinding("value").attachChange(function (oEvent) {
									// We check if the Value State is set to Error
									if (oField.getValueState() === sap.ui.core.ValueState.Error) {
										// We set the Value State to None
										oField.setValueState(sap.ui.core.ValueState.None);
									}
								});
							});
						};

						that.oActionDialog.attachBeforeOpen(fnCheckErrorClient);
						that.oActionDialog.setModel(oActionContext.oModel);
						that.oActionDialog.open();
					});
				}
			}
		}

		/**
		 * Triggers the chain of the inline action call's preparation, its processing and its result handling.
		 * No confirmation is requiered, every properties should be available in context object.
		 *
		 * @param {object} oEventSource event of the triggered action.
		 * @param {object} oController current context controller.
		 */
		function fnCallInLineAction(oEventSource, oController) {
			var that = this;
			var oBindingSource = oEventSource.getBindingContext();
			var sPernr = oBindingSource ? oBindingSource.getProperty("Pernr") : ODataModelUtil.get().getCurrentTripContext().Pernr;
			var oModel = oController.getView().getModel();
			var oCustomData = CustomDataUtil.getObjectCustomData(oEventSource);

			// Absolute value for Function name
			// Build Label
			var _sFunctionImportLabel = oCustomData.Label || sFunctionName;
			var sFunctionName = '/' + oCustomData.Action.split('/')[1];
			var oContext = _createContext(oModel, oEventSource, sFunctionName);
			oContext.key = sPernr;
			oContext.controller = oController;

			var oSmartTable = ControlUtil.getOwnerControl(oEventSource).getParent();
			var sEntitySet = oSmartTable.getEntitySet();

			// Build Function Import Parameters
			var mActionParams;
			mActionParams = _prepareParameters(oContext, oCustomData.Action, oContext.controller);

			var mParameters = {
				urlParameters: mActionParams.parameterData,
				batchGroupId: this.sActionGroupId,
				functionImport: mActionParams.functionImport
			};

			//indicate that we can collect all changes from group pdDeductionsChanges
			ODataModelUtil.get().addDeferredGroupId(oContext.model, this.sActionGroupId);

			var fnSuccess = function (oData, response) {
				var sLocation;
				if (response.headers.location){
					sLocation = response.headers.location.split("/").pop();
				}else if (response && response.data && response.data.__batchResponses && response.data.__batchResponses[0]
				&& response.data.__batchResponses[0].__changeResponses && response.data.__batchResponses[0].__changeResponses[0]
				&& response.data.__batchResponses[0].__changeResponses[0].headers && response.data.__batchResponses[0].__changeResponses[0].headers["location"]){
					sLocation = response.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
				}
				//Trigger Navigation to the returned entity
				if (oData) {
					//Select New Item
					var navPathFromResponse = NavigationUtil.getNavigationPathFromReponse(oData, response);
					var bNavigate = !Utils.isEmptyObjectOrString(navPathFromResponse.subPath) && !Utils.isEmptyObjectOrString(navPathFromResponse.navPath);
					var bContextChanged = oContext.contexts[0].getPath().substring(1) !== navPathFromResponse.subPath;
					//if the data action calls refreshes the entity being manipulated, we check for potential side effects
					if (!bContextChanged && !bNavigate){
						_determineChangesAndRefreshTargetEntites(oContext, response);
					}
					_navigate(oModel, oContext, navPathFromResponse, oEventSource);
					oContext.controller._lastCreatedItem[sEntitySet] = '/' + navPathFromResponse.subPath;
				}
			};
			// Submit Changes then call function Import if no error returned
			var fnSuccessSubmit = function () {
				//Call Function Import
				PersistenceHelper.callFunction(oModel, {
					name: sFunctionName,
					success: fnSuccess,
					source: oEventSource,
					urlParameters: mActionParams.parameterData,
					batchGroupId: mParameters.batchGroupId
				});
			};
			var fnActionToExcecute = function () {
				PersistenceHelper.submitChanges(oModel, {
					success: fnSuccessSubmit,
					submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ACTION,
				});
			};
			var fnAbort = function () {
				ODataModelUtil.get().removeDeferredGroupId(oContext.model, that.sActionGroupId);
			};
			if (mActionParams.functionImport) {
				var bActionCritical = mActionParams.functionImport["com.sap.vocabularies.Common.v1.IsActionCritical"] != undefined;
				if (bActionCritical) {
					FragmentHelper.get().confirmationDialog({
						controller: oContext.controller,
						name: mActionParams.functionImport.name,
						label: _sFunctionImportLabel,
						success: fnActionToExcecute,
						error: fnAbort
					});
					return;
				}
			}
			fnActionToExcecute();
		}

		function fnGetActionContext(oEvent, oController) {
			return this.callAction(oEvent.getSource(), oController, undefined, false);
		}

		return {
			sActionGroupId: "DataFieldActionChanges",
			callAction: fnCallAction,
			callInLineAction: fnCallInLineAction,
			getActionContext: fnGetActionContext,
			buildParametersForm: fnBuildParametersForm
		};
	}

	return getMethods();
}, true);

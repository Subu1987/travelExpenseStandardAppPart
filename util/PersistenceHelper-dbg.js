/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/BusyHelper",
	"sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/fin/travel/lib/reuse/util/AppComponent",
	"sap/m/DraftIndicatorState",
	"sap/fin/travel/lib/reuse/util/ODataModelUtil",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/ControlUtil",
	"sap/fin/travel/lib/reuse/util/StateUtil"
], function (BusyHelper, MessageUtil, AppComponent, DraftIndicatorState, ODataModelUtil, Utils, ControlUtil, StateUtil) {
	"use strict";

	function getMethods() {

		/**
		 * Provides the context of a SubmitChange origin. A submit change can be unknown (default), triggered from annotated side effect, triggered from mandatory field side effect, from a sync before an action call, from an item press on a list
		 */
		var SUBMIT_CHANGE_ORIGIN = {
			"UNKNOWN": 0,
			"SIDEEFFECT_ANNOTATION": 1,
			"SIDEEFFECT_MANDATORY": 2,
			"ACTION": 3,
			"ITEM_PRESS": 4,
		};

		Object.freeze(SUBMIT_CHANGE_ORIGIN);

		function fnSuccessWrapper(mSettings, aArgs) {
			if (mSettings && mSettings.success && typeof mSettings.success === "function") {
				mSettings.success.apply(null, aArgs);
			}
		}

		function fnFunctionErrorWrapper(mSettings, aArgs) {
			//We do open the message popover only if not coming from direct field modification (side effects at the moment) (See https://experience.sap.com/fiori-design-web/messaging/)
			if (mSettings && mSettings.submitChangeOrigin && (mSettings.submitChangeOrigin === SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_MANDATORY ||
					mSettings.submitChangeOrigin === SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION)) {
				$.sap.log.debug("We do not open the message popover automatically in case of single field modification");
			} else if (mSettings == undefined || !ControlUtil.getDialogPopup(mSettings.source)) {
				//if there is no handling for the functional error
				MessageUtil.get().openMessagesPopover();
			}

			if (mSettings && mSettings.functionalError && typeof mSettings.functionalError === "function") {
				mSettings.functionalError.apply(null, aArgs);
			}
		}

		/**
		 * Call a backand function import
		 * @param oModel ODataModel
		 * @param mSettings settings: this object is mandatory
		 *	- name : Name of the function import to call
		 *  - success : success callback method
		 *  - error : error callback method
		 *  - functionalError: error callback method in case of functional error (sap-message with error messages returned along with a successful request :). By default, we take the error callback
		 *  - urlParameters : properties to add as URL parameters
		 *  - settings : properties to add as function import settings
		 *  - control : SAPUI5 control to displayed as "busy" during the function import call
		 */
		function fnCallFunction(oModel, mSettings) {	
			//sometimes, functionalError is not filled. Yet, functional error are in still in the model. By default we call the error function to not block the code
			if (mSettings && undefined === mSettings.functionalError) {
				mSettings.functionalError = mSettings.error;
			}
			
			StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);
			var fnSuccessCallback = function (oData, oResponse) {
				BusyHelper.hide(mSettings.control);
				AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Clear);
				if (!MessageUtil.get().handleMessageResponse(oResponse)) {
					fnSuccessWrapper(mSettings, arguments);
				} else {
					fnFunctionErrorWrapper(mSettings, arguments);
				}
				if (mSettings && mSettings.resolve && typeof mSettings.resolve === "function") {
					mSettings.resolve.apply(null);
				}
			};
			var fnErrorCallback = function (oError) {
				BusyHelper.hide(mSettings.control);
				if (mSettings && mSettings.error && typeof mSettings.error === "function") {
					mSettings.error.apply(null, arguments);
				} else {
					MessageUtil.get().showMessage(oError);
				}
				if (mSettings && mSettings.reject && typeof mSettings.reject === "function") {
					mSettings.reject.apply(null);
				}
			};

			var oMetaModel = oModel.getMetaModel();
			var oFunctionImport = oMetaModel.getODataFunctionImport(mSettings.name.split("/")[1]);
			var oSettings = {
				method: oFunctionImport.httpMethod,
				success: fnSuccessCallback,
				error: fnErrorCallback
			};

			if (mSettings.urlParameters) {
				oSettings.urlParameters = mSettings.urlParameters;
			}
			for (var property in mSettings.settings) {
				if (mSettings.settings.hasOwnProperty(property)) {
					oSettings[property] = mSettings.settings[property];
				}
			}

			BusyHelper.show(mSettings.control); // show busy dialog before call the method.
			oModel.callFunction(mSettings.name, oSettings);
		}

		/**
		 * Submit pending changes if exist:
		 * - Display the busy dialog.
		 * Otherwise directly call the success callback function.
		 * If there is no functionalError defined in the mSettings, we call the default error callback function..
		 *
		 * @param oModel ODataModel
		 * @param mSettings properties and callback function. (See: fnCallFunction). There are two specificities: value refreshAfterChange and an attribute 'SubmitChangeOrigin'
		 * <ul>
		 * <li>If the refreshAfterChange property is existing in the settings table, this value is temporarly set globaly on the provided model.
		 * Default state is restored on success or error. This is due to API limitation: submitChange does not allow refreshAfterChange property (only update function allows this parameter)
		 * </li>
		 * <li>
		 * submitChangeOrigin provides an information on the actual origin that triggered the submitChange call. Check @SUBMIT_CHANGE_ORIGIN documentation
		 * </li>
		 * </ul>
		 */
		function fnSubmitChanges(oModel, mSettings) {
			//sometimes, functionalError is not filled. Yet, functional error are in still in the model. By default we call the error function to not block the code
			if (mSettings && undefined === mSettings.functionalError) {
				mSettings.functionalError = mSettings.error;
			}

			var submitOrigin = mSettings && mSettings.submitChangeOrigin || SUBMIT_CHANGE_ORIGIN.UNKNOWN;

			var bSubmitFromSideEffect = submitOrigin === SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION || submitOrigin === SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_MANDATORY;
			if (bSubmitFromSideEffect){
				StateUtil.setState(StateUtil.SUBMIT_ON_SIDEFFECT, true);
			}else{
				StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);
			}

			//we are not displaying the busy dialog in case of submit change triggered by a mandatory field just filled.
			var bShowBusyHelper = (submitOrigin !== SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_MANDATORY) && (submitOrigin !== SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION);
			if (oModel.hasPendingChanges()) {
				var fnError = function (oError) {
					BusyHelper.hide();
					AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Clear);
					//restore default value afer our submit operation
					ODataModelUtil.get().handleBackRefreshAfterChange(oModel);
					if (mSettings && mSettings.error && typeof mSettings.error === "function") {
						mSettings.error.apply(null, arguments);
					} else {
						MessageUtil.get().showMessage(oError);
					}
				};
				var fnSuccess = function (oData, oResponse) {
					BusyHelper.hide();
					//restore default value afer our submit operation
					if (mSettings && mSettings.draftIndicator) {
						AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Saved);
					}
					ODataModelUtil.get().handleBackRefreshAfterChange(oModel);
					if (!MessageUtil.get().handleMessageResponse(oResponse)) {
						fnSuccessWrapper(mSettings, arguments);
					} else {
						fnFunctionErrorWrapper(mSettings, arguments);
					}
					MessageUtil.get().cleanValidationMessages();
				};

				if (bShowBusyHelper) {
					BusyHelper.show();
				}

				var oSettings = {
					success: fnSuccess,
					error: fnError
				};

				if (!Utils.isEmptyObjectOrString(mSettings)) {
					for (var property in mSettings.settings) {
						oSettings[property] = mSettings.settings[property];
					}
				}

				ODataModelUtil.get().handleRefreshAfterChange(oModel);
				if (oSettings.hasOwnProperty("refreshAfterChange")) {
					oModel.setRefreshAfterChange(oSettings.refreshAfterChange);
				}
				if (mSettings && mSettings.draftIndicator) {
					AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Saving);
				}
				oModel.submitChanges(oSettings);
			} else {
				// If there is no internal error then call success method. Otherwise call functionalError
				if (!MessageUtil.get().hasInternalError()) {
					fnSuccessWrapper(mSettings, arguments[0]);
				} else {
					fnFunctionErrorWrapper(mSettings, arguments[0]);
				}
			}
		}

		/**
		 * Apply modifications/changes made in the sub entity.
		 * Submit changes and Draft indicator handling.
		 * @param oModel ODataModel
		 */
		function fnApply(oModel, mSettings) {
			var fnSuccessCallback = function (oData, oResponse) {
				BusyHelper.hide(mSettings.control);
				if (!MessageUtil.get().handleMessageResponse(oResponse)) {
					AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Saved);
					if (mSettings && mSettings.success && typeof mSettings.success === "function") {
						mSettings.success.apply(null, arguments);
					}
				}
			};
			var fnFunctionalError = function (oData, oResponse) {
				AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Clear);
				if (mSettings && mSettings.functionalError && typeof mSettings.functionalError === "function") {
					mSettings.functionalError.apply(null, arguments);
				}
			};
			var fnErrorCallback = function (oError) {
				AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Clear);
				if (mSettings && mSettings.error && typeof mSettings.error === "function") {
					mSettings.error.apply(null, arguments);
				} else {
					MessageUtil.get().showMessage(oError);
				}
			};

			AppComponent.get().updateGlobalModel("/draft", DraftIndicatorState.Saving);
			fnSubmitChanges(oModel, {
				success: fnSuccessCallback,
				error: fnErrorCallback,
				functionalError: fnFunctionalError
			});
		}

		/**
		 * Create a new entry in the datamodel.
		 * @param oModel ODataModel
		 * @param sBindingPath binding path
		 * @param mSettings properties and callback function. (See: fnCallFunction).
		 * @return createdContext (See: ODataModel.createEntry)
		 */
		function fnCreateEntry(oModel, sBindingPath, mSettings) {
			var createdContext;

			var fnSuccessCallback = function (oData, oResponse) {
				//BusyHelper.hide();
				if (typeof mSettings.success === "function") {
					mSettings.success(oData, oResponse);
				}
			};

			var fnErrorCallback = function (oError) {
				//BusyHelper.hide();
				//do not try to recreate the entry later on
				oModel.deleteCreatedEntry(createdContext);
				if (typeof mSettings.error === "function") {
					mSettings.error(oError);
				}
			};

			//BusyHelper.show(); // show busy dialog before call the method.
			//no busy helper, the create entry does not perform a backend call.
			createdContext = oModel.createEntry(sBindingPath, {
				properties: mSettings.properties,
				success: fnSuccessCallback,
				error: fnErrorCallback,
				refreshAfterChange: true
			});

			//send the created context to the backend for synchronization (along with other requests if existing)
			if (mSettings.submit === true || mSettings.submit === undefined) {
				fnSubmitChanges(oModel);
			}

			return createdContext;

		}

		function fnCreateDeepEntry(oModel, sBindingPath, oEntity, mSettings) {
			StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);

			var createdContext;

			var fnSuccessCallback = function (oData, oResponse) {
				BusyHelper.hide();
				if (!MessageUtil.get().handleMessageResponse(oResponse)) {
					fnSuccessWrapper(mSettings, arguments);
				} else {
					fnFunctionErrorWrapper(mSettings, arguments);
				}
				MessageUtil.get().cleanValidationMessages();
			};

			var fnErrorCallback = function (oError) {
				BusyHelper.hide();
				if (typeof mSettings.error === "function") {
					mSettings.error(oError);
				}
			};

			//no busy helper, the create entry does not perform a backend call.
			BusyHelper.show();
			oModel.create(sBindingPath, oEntity, {
				success: fnSuccessCallback,
				error: fnErrorCallback
			});
		}

		/**
		 * Check that oModel contains at least one entity type for the given pernr and tripno
		 *
		 * @param {object} oModel is a valid oData model on which we invalidate and refresh entries if necessary
		 * @param {object} mParameters with Tripno, Pernr, EntityType
		 * @return {boolean} Whether the oModel contains at least one entry for the given mParameter
		 */
		function fnModelContainsEntity(oModel, mParameters) {
			return Object.getOwnPropertyNames(oModel.getObject("/")).filter(function (e) {
				return e.startsWith(mParameters.EntityType + "(");
			}).some(function (e) {
				return -1 !== e.indexOf("Tripno='" + mParameters.Tripno + "'") && -1 !== e.indexOf("Pernr='" + mParameters.Pernr + "'");
			});
		}

		/**
		 * This function invalidate entries corresponding to the given trip/pernr tuple.
		 * It means that further requests to theses objects will trigger a backend call.
		 * In addition, this function makes sure that any object currently displayed to the user are immediately refreshed.
		 * This method uses the invalidateEntries from ODataModelUtil.
		 *
		 * @param {object} oModel is a valid oData model on which we invalidate and refresh entries if necessary. The context should be at view level to be sure to refresh all related bindings
		 * @param {object} mParameters trip and personal numbers, refreshAfterChange.
		 */
		function fnInvalidateEntries(oModel, mParameters) {
			ODataModelUtil.get().invalidateEntries(oModel, mParameters);
		}

		/**
		 * This function invalidate entries corresponding to the given path.
		 *
		 * @param {object} oModel is a valid oData model on which we invalidate and refresh entries if necessary. The context should be at view level to be sure to refresh all related bindings
		 * @param {object} sPath path of the object to invalidate.
		 */
		function fnInvalidateEntry(oModel, sPath) {
			ODataModelUtil.get().invalidatEentry(oModel, sPath);
		}

		/**
		 * Our application allows to cancel/delete a complete trip.
		 * But in some cases, sub-entities have pending changes.
		 * We do call this function to clean-up the pending changes of the corresponding oModel whenever its needed.
		 *
		 * For example, if there are pending changes on entity "Destinations(Pernr='00123045',Tripno='0000000000',KeyStop='%202',StopType='N')", these changes would be removed
		 *
		 * @param {object} oModel
		 * @param {string} sPernr
		 * @param {string} sTripno
		 */
		function fnResetSubEntityPendingChanges(oModel, sPernr, sTripno) {
			var oPendingChanges = oModel.getPendingChanges();
			if (!Utils.isEmptyObjectOrString(oPendingChanges)) {
				Object.getOwnPropertyNames(oPendingChanges)
					.filter(function (e) {
						return -1 !== e.indexOf("Pernr='" + sPernr + "'");
					}).filter(function (e) {
						return -1 !== e.indexOf("Tripno='" + sTripno + "'");
					}).forEach(function (e, i) {
						if (0 !== e.indexOf("/")) {
							e = "/" + e;
						}
						//reset the changes
						if (oModel.getProperty(e)) {
							oModel.resetChanges([e]);
						}

					});
			}
		}

		/**
		 * Wrapper around cancel trip function.
		 * In addition to the call to cancel trip, we do invalidate entries on successfull cancellation
		 * @param oModel ODataModel
		 * @param mSettings properties and callback function. (See: fnCallFunction). settings entity is used to convey the flag refreshAfterChange which allows to bypass the default immediate refresh of bound entities in case of successful cancellation
		 */
		function fnCancelTripFunction(oModel, mSettings) {
			var bInvalidate = true;
			if (mSettings && undefined !== mSettings.invalidate){
				bInvalidate = mSettings.invalidate;
			} 
			var fnInvalidateOnSuccess = function () {
				if (mSettings && mSettings.success && typeof mSettings.success === "function") {
					mSettings.success.apply(null, arguments);
				}

				if (bInvalidate){
					//invalidate entries after applying the success function. 
					fnInvalidateEntries(oModel, {
						Pernr: mSettings.urlParameters.Pernr,
						Tripno: mSettings.urlParameters.Tripno,
						refreshAfterChange: mSettings.settings.refreshAfterChange
					});
				}

			};

			fnCallFunction(oModel, {
				name: "/CancelTrip",
				success: fnInvalidateOnSuccess,
				error: mSettings && mSettings.error,
				urlParameters: mSettings && mSettings.urlParameters
			});
		}

		/**
		 * Read Trigger a GET request to the OData service that was specified in the model constructor.
		 * The data will be stored in the model. The requested data is returned with the response.
		 */
		function fnRead(oModel, sPath, mParameters) {
			oModel.read(sPath, mParameters);
		}

		/**
		 * Trigger a DELETE request to the OData service that was specified in the model constructor.
		 * @param oModel ODataModel
		 * @param sPath binding path
		 * @param mSettings properties and callback function. (See: fnCallFunction).
		 */
		function fnRemove(oModel, sPath, mSettings) {
			StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);
			var fnSuccessCallback = function (oData, oResponse) {
				BusyHelper.hide();
				if (!MessageUtil.get().handleMessageResponse(oResponse)) {
					fnSuccessWrapper(mSettings, arguments);
				} else {
					fnFunctionErrorWrapper(mSettings, arguments);
				}
				MessageUtil.get().refreshValidationMessages(sPath);
			};
			var fnErrorCallback = function (oError) {
				BusyHelper.hide();
				if (mSettings && mSettings.error && typeof mSettings.error === "function") {
					mSettings.error(oError);
				}
			};

			//remove manually the pending changes on the entity being deleted
			//sap ui5 does hold it otherwise and later try to sync it for nothing (despite having no pending changes shown after the remove...)
			if (oModel.getProperty(sPath)) {
				oModel.resetChanges([sPath]);
			}

			BusyHelper.show(); // show busy dialog before call the method.
			oModel.remove(sPath, {
				success: fnSuccessCallback,
				error: fnErrorCallback,
				refreshAfterChange: mSettings && mSettings.refreshAfterChange
			});
		}

		return {
			submitChanges: fnSubmitChanges,
			apply: fnApply,
			callFunction: fnCallFunction,
			createEntry: fnCreateEntry,
			createDeepEntry: fnCreateDeepEntry,
			invalidateEntries: fnInvalidateEntries,
			invalidateEntry: fnInvalidateEntry,
			cancelTrip: fnCancelTripFunction,
			read: fnRead,
			remove: fnRemove,
			containsEntity: fnModelContainsEntity,
			resetSubEntityChanges: fnResetSubEntityPendingChanges,
			SUBMIT_CHANGE_ORIGIN: SUBMIT_CHANGE_ORIGIN
		};
	}

	return getMethods();
}, true);

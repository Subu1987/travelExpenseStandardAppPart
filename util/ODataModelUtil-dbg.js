/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/m/DraftIndicatorState",
	"sap/ui/model/Context",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/NavigationUtil"
], function (DraftIndicatorState, Context, Utils, NavigationUtil) {
	"use strict";

	var _oInstance;

	function createInstance(oAppComponent) {

		var _bRefreshAfterChange = {};
		var _oCurrentTripContext = {};
		var _bFunctionalError = false;
		var iIdCounter = 0;

		function fnUid() {
			return "id-" + new Date().valueOf() + "-" + iIdCounter++;
		}

		function fnGetNavigationProperty(oController, oModel, sEntitySet) {
			var sObjectEntitySet = oController.getOwnerComponent().sEntitySet;
			var oEntitySet = oModel.getMetaModel().getODataEntitySet(sObjectEntitySet);
			var oEntityType = oModel.getMetaModel().getODataEntityType(oEntitySet.entityType);
			var searchString = sEntitySet.slice(0, -1); //odd cases that still match our app convention
			var fnApply = function (item) {
				return item.name.startsWith(searchString);
			};
			var navProp = oEntityType.navigationProperty.filter(fnApply);
			return navProp && navProp.length === 1 && navProp[0].name || sEntitySet;
		}

		function fnGetNavigationPropertyName(oController, oModel, sEntitySet) {
			var oEntitySet = oModel.getMetaModel().getODataEntitySet(sEntitySet);
			var oEntityType = oModel.getMetaModel().getODataEntityType(oEntitySet.entityType);
			return oEntityType && oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"] && oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeNamePlural
				.String || sEntitySet;
		}

		function fnHasPendingChanges(oModel, sBindingPath) {
			if (sBindingPath) {
				var mPendingChanges = oModel.getPendingChanges();
				for (var oPendingChange in mPendingChanges) {
					if (oPendingChange === sBindingPath.substring(1)) {
						return true;
					}
				}
				return false;
			}
			return oModel.hasPendingChanges();
			// var bPendgingChanges = oModel.hasPendingChanges();
			// var oGlobalModel = oAppComponent.getGlobalModel();
			// return bPendgingChanges || (oGlobalModel && oGlobalModel.getProperty("/draft") !== DraftIndicatorState.Clear);
		}

		/** 
		 * @return undefined or the item which is in draft/unsaved
		 */
		function fnGetDraftItem(oList) {
			if (oList && oList.getTable() && oList.getTable().getItems()) {
				for (var i = 0; i < oList.getTable().getItems().length; i++) {
					var oItemBindingContext = oList.getTable().getItems()[i].getBindingContext();
					if (oItemBindingContext && oItemBindingContext.getProperty("DraftLinkVisible")) {
						return oItemBindingContext;
					}
				}
			}
			return undefined;
		}

		/**
		 * Hold the saved trip context
		 * This should always hold the trip being displayed/edited in the application.
		 * 
		 * @return {object}
		 *   - Tripno
		 *   - Pernr
		 *   - BindingPath (might be undefined)
		 */
		function fnGetCurrentTripContext() {
			return _oCurrentTripContext;
		}

		/**
		 * Save the current trip context provided in parameter.
		 * This method should be called whenever there is a change in the trip being displayed/edited, for example when changing route (at trip level), or when switching of user.
		 * 
		 * @parameter {object} mProperties
		 *   - Tripno (optional) if there is no bindingpath, the tripno is saved. This is generally the last unsaved trip number, or the tripno currently being displayed
		 *   - Pernr (optional) if there is no bindingpath, the pernr is saved. This is generally changed upon pernr change in case of delegation.
		 *   - BindingPath (optional): in case of bindingpath, the tripno and pernr are retrieved from the application model given this context. If the ODataModel does not contain the given context path, the tripno and pernr are extracted through regexp. Attention, the value shall always be the first level, such as /TravelRequest(pernr, tripno). 
		 * 
		 */
		function fnSaveCurrentTripContext(mProperties) {
			if (Utils.isEmptyObjectOrString(mProperties)) {
				return;
			}

			var oModel = oAppComponent.getAppModel();
			if (!Utils.isEmptyObjectOrString(mProperties.BindingPath)) {
				//check if the context exists
				var oTripBindingContext = new Context(oModel, mProperties.BindingPath);
				var oTrip = oTripBindingContext.getObject("");
				if (Utils.isEmptyObjectOrString(oTrip)) {
					//model not yet loaded. We extract manually the tripno and pernr from the context path
					_oCurrentTripContext.Tripno = mProperties.BindingPath.match(/Tripno='(\d+)'/) && mProperties.BindingPath.match(/Tripno='(\d+)'/)[1];
					_oCurrentTripContext.Pernr = mProperties.BindingPath.match(/Pernr='(\d+)'/) && mProperties.BindingPath.match(/Pernr='(\d+)'/)[1];
				} else {
					_oCurrentTripContext.Tripno = oTripBindingContext.getProperty("Tripno");
					_oCurrentTripContext.Pernr = oTripBindingContext.getProperty("Pernr");
				}
				_oCurrentTripContext.BindingPath = mProperties.BindingPath;
			} else {
				//update only the fields that are provided
				if (mProperties.hasOwnProperty("Tripno")) {
					_oCurrentTripContext.Tripno = mProperties.Tripno;
				}
				if (mProperties.hasOwnProperty("Pernr")) {
					_oCurrentTripContext.Pernr = mProperties.Pernr;
				}
				//provide an empty BindingPath, we reset it
				if (mProperties.hasOwnProperty("BindingPath")) {
					_oCurrentTripContext.BindingPath = "";
				}
			}
		}

		function fnResetChanges(oModel, aBindingPath) {
			oModel.resetChanges(aBindingPath);
		}

		function fnAddDeferredGroupId(oModel, sGroupId) {
			var aDeferredGroups = oModel.getDeferredGroups();
			aDeferredGroups = aDeferredGroups.concat([sGroupId]);
			oModel.setDeferredGroups(aDeferredGroups);
		}

		function fnRemoveDeferredGroupId(oModel, sGroupId) {
			var aDeferredGroups = oModel.getDeferredGroups();
			var iIndex = aDeferredGroups.indexOf(sGroupId);
			if (iIndex > -1) {
				aDeferredGroups.splice(iIndex, 1);
			}
			oModel.setDeferredGroups(aDeferredGroups);
		}

		/* This function invalidate entries corresponding to the given trip/pernr tuple.
		 * It means that further requests to theses objects will trigger a backend call.
		 * In addition, this function makes sure that any object currently displayed to the user are immediately refreshed
		 * 
		 * @param {object} oModel is a valid oData model on which we invalidate and refresh entries if necessary. The context should be at view level to be sure to refresh all related bindings
		 * @param {object} mParameters trip and personal numbers. refreshAfterChange boolean is used to control whether we do immediately refresh the invalidated displayed entries. Per default, refreshAfterChange property is true
		 */
		function fnInvalidateEntries(oModel, mParameters) {
			var bRefreshAfterChange = true;
			if (mParameters && mParameters.hasOwnProperty("refreshAfterChange") && false === mParameters.refreshAfterChange) {
				bRefreshAfterChange = false;
			}
			Object.getOwnPropertyNames(oModel.getObject("/")).filter(function (e) {
				return -1 !== e.indexOf("Pernr='" + mParameters.Pernr + "'");
			}).filter(function (e) {
				return -1 !== e.indexOf("Tripno='" + mParameters.Tripno + "'");
			}).forEach(function (e, i) {
				//invalidate entry
				if (0 !== e.indexOf("/")) {
					e = "/" + e;
				}
				oModel.invalidateEntry(e);
				if (bRefreshAfterChange && NavigationUtil.isBindingPathDisplayed(e)) {
					oModel.read(e);
				}
			});

			//If the unbind does not properly work, we can manually created-context in the model
			/*
			// try to delete entry without key
			var aInvalidEntries = Object.getOwnPropertyNames(oModel.getObject("/")).filter(function (e) {
				return -1 !== e.indexOf("Tripno='0000000000'");
			});
			if (aInvalidEntries && aInvalidEntries.length > 0) {
				aInvalidEntries.forEach(function (e, i) {
					// deleteCreatedEntry
					if (0 !== e.indexOf("/")) {
						e = "/" + e;
					}
					var oContext = new Context(oModel, e);
					oModel.deleteCreatedEntry(oContext);
				});
			} else {
				//refresh model that is bound to the view in order to refresh all related entities
				oModel.refresh();
			}
			*/
			if (bRefreshAfterChange) {
				oModel.refresh();
			}

		}

		/* This function invalidate entry corresponding to the given path.
		 * 
		 * @param {object} oModel is a valid oData model on which we invalidate and refresh entries if necessary. The context should be at view level to be sure to refresh all related bindings
		 * @param {object} sPath path of the object to invalidate. 
		 */
		function fnInvalidatEentry(oModel, sPath) {
			var object = oModel.getObject(sPath);
			if (object) {
				oModel.invalidateEntry(sPath);
				if (NavigationUtil.isBindingPathDisplayed(sPath)) {
					oModel.read(sPath);
				}
			}
		}

		/**
		 * Calculates the name of an OData entity set from the given binding context.
		 * 
		 * @param {sap.ui.model.Context} oContext The given binding context
		 * @returns {string} The name of the entity set, can be <code>null</code>
		 * @throws {Error} If no context is handed over as input parameter
		 */
		function fnGetEntitySetFromContext(oContext) {
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
		};

		function fnDeletePendingChanges(oModel, mPendingChanges) {
			var oContext;
			var mPendingChangesToDelete = mPendingChanges ? mPendingChanges : oModel.getPendingChanges(); // if so pending changes delete all.
			for (var pendingChange in mPendingChanges) {
				if (oModel.getPendingChanges().hasOwnProperty(pendingChange)) {
					// deleteCreatedEntry
					if (0 !== pendingChange.indexOf("/")) {
						pendingChange = "/" + pendingChange;
					}
					oContext = new Context(oModel, pendingChange);
					oModel.deleteCreatedEntry(oContext);
				}
			}
		};

		/**
		 * Handles global OData Model refreshAfterChange indicator before operation
		 * In case _bRefreshAfterChange has not yet been changed, save the current state
		 */
		function fnHandleRefreshAfterChange(oModel) {
			if (typeof _bRefreshAfterChange !== "boolean") {
				_bRefreshAfterChange = oModel.getRefreshAfterChange();
			}
		};

		/**
		 * Handles global OData Model refreshAfterChange indicator after operation
		 * In case a property have already been changed, restore it and clear the current state.
		 */
		function fnHandleBackRefreshAfterChange(oModel) {
			if (typeof _bRefreshAfterChange === "boolean") {
				oModel.setRefreshAfterChange(_bRefreshAfterChange);
				_bRefreshAfterChange = {};
			}
		};

		return {
			uid: fnUid,
			hasPendingChanges: fnHasPendingChanges,
			getNavigationProperty: fnGetNavigationProperty,
			getNavigationPropertyName: fnGetNavigationPropertyName,
			getDraftItem: fnGetDraftItem,
			getCurrentTripContext: fnGetCurrentTripContext,
			saveCurrentTripContext: fnSaveCurrentTripContext,
			resetChanges: fnResetChanges,
			addDeferredGroupId: fnAddDeferredGroupId,
			removeDeferredGroupId: fnRemoveDeferredGroupId,
			getEntitySetFromContext: fnGetEntitySetFromContext,
			invalidateEntries: fnInvalidateEntries,
			invalidatEentry: fnInvalidatEentry,
			deletePendingChanges: fnDeletePendingChanges,
			handleRefreshAfterChange: fnHandleRefreshAfterChange,
			handleBackRefreshAfterChange: fnHandleBackRefreshAfterChange
		};
	}

	return {
		get: function () {
			if (!_oInstance) {
				throw new Error("ODataModel has not been initialized yet.");
			}
			return _oInstance;
		},

		init: function (oAppComponent) {
			_oInstance = _oInstance || createInstance(oAppComponent);
		},

		destroy: function () {
			_oInstance = null;
		}

	};
}, true);

/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/ui/model/json/JSONModel",
	"sap/ui/layout/VerticalLayout",
	"sap/m/MessageStrip",
	"sap/m/Dialog",
	"sap/m/DialogType",
	"sap/m/Text",
	"sap/m/Button",
	"sap/ui/core/MessageType",
	"sap/m/VBox",
	"sap/m/MessageBox",
	"sap/m/FlexBox",
	"sap/fin/travel/lib/reuse/util/TravelUtil",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/m/List",
	"sap/ui/core/Fragment"
], function (I18n, JSONModel, VerticalLayout, MessageStrip, Dialog, DialogType, Text, Button, MessageType, VBox, MessageBox, FlexBox,
	TravelUtil, Utils, List, Fragment) {
	"use strict";

	var _oInstance;
	var mFragments;

	function createInstance() {
		mFragments = new Map([]);

		function _getCompactModeStyleClass(oController) {
			if (oController.getView().$().closest(".sapUiSizeCompact").length) {
				return "sapUiSizeCompact";
			}
			return "";
		}

		function fnGetFunctionImportDialog(oContext, mSettings) {
			var oVerticalLayout = {};
			var oDraftMessage;
			var oMessageModel = {
				message: []
			};
			var oDialogController = oContext.controller;
			if (!Utils.isEmptyObjectOrString(mSettings.draftTripNo)) {
				oDraftMessage = {
					text: mSettings.draftTripNo ? (TravelUtil.TripNumber.Initial === mSettings.draftTripNo ? I18n.get().getText(
						"DRAFT_WARNING_UNKNOWN", mSettings.draftTripNo) : I18n.get().getText("DRAFT_WARNING", mSettings.draftTripNo)) : "",
					type: mSettings.draftTripNo ? MessageType.Warning : MessageType.None,
					showCloseButton: false
				};
				oMessageModel.message.push(oDraftMessage);
			}
			var oMessageList = new List({});
			oMessageList.bindItems({
				path: "MessageModel>/message",
				template: new sap.m.CustomListItem({
					content: new sap.m.MessageStrip({
						type: "{MessageModel>type}",
						text: "{MessageModel>text}",
						showCloseButton: "{MessageModel>showCloseButton}",
						showIcon: true
					})
				})
			});
			oVerticalLayout = new VerticalLayout({
				width: "100%",
				visible: "{= ${MessageModel>/message}.length > 0}",
				content: [
					oMessageList
				]
			}).addStyleClass("sapUiContentPadding");
			var oParameterDialog = new Dialog({
				contentWidth: "25rem",
				title: mSettings.label,
				content: [
					oVerticalLayout,
					mSettings.parameter.form
				],
				beginButton: new Button({
					text: mSettings.label,
					type: "Emphasized",
					press: function (oEvent) {
						if (mSettings.parameter.getEmptyMandatoryFields().length == 0 && mSettings.parameter.getEmptyMandatoryValueHelpFields().length ==
							0 && mSettings.parameter.checkValuesValidityFields() == 0) {
							mSettings.success.apply(oParameterDialog, [mSettings.successArg]);
						} else {
							var aFieldAlreadyHandled = [];
							var aMessage = [];
							var sRootMessage = I18n.get().getText("MANDATORY_FIELD_ERROR");
							var sValueListMessage = I18n.get().getText("MANDATORY_VALUE_LIST_FIELD_ERROR");
							oParameterDialog.getModel("MessageModel").setProperty("/message", []);
							if (oDraftMessage) {
								aMessage.push(oDraftMessage);
							}

							for (var i = 0; i < mSettings.parameter.getEmptyMandatoryFields().length; i++) {
								var oField = mSettings.parameter.getEmptyMandatoryFields()[i];
								var sText = jQuery.sap.formatMessage(sRootMessage, oField.getTextLabel());
								aMessage.push({
									text: sText,
									type: MessageType.Error,
									showCloseButton: true
								});
								aFieldAlreadyHandled.push(oField.getTextLabel());
							}

							for (var i = 0; i < mSettings.parameter.getEmptyMandatoryValueHelpFields().length; i++) {
								var oField = mSettings.parameter.getEmptyMandatoryValueHelpFields()[i];
								if (aFieldAlreadyHandled.indexOf(oField.getTextLabel()) === -1) {
									var sText = jQuery.sap.formatMessage(sValueListMessage, oField.getTextLabel());
									aMessage.push({
										text: sText,
										type: MessageType.Error,
										showCloseButton: true
									});
									aFieldAlreadyHandled.push(oField.getTextLabel());
								}
							}

							for (var i = 0; i < mSettings.parameter.checkValuesValidityFields().length; i++) {
								var sFieldId = mSettings.parameter.checkValuesValidityFields()[i];
								var oField = sap.ui.getCore().byId(sFieldId);
								if (oField) {
									if (aFieldAlreadyHandled.indexOf(oField.getTextLabel()) === -1) {
										var sText = jQuery.sap.formatMessage(sValueListMessage, oField.getTextLabel());
										aMessage.push({
											text: sText,
											type: MessageType.Error,
											showCloseButton: true
										});
										aFieldAlreadyHandled.push(oField.getTextLabel());
									}
								}
							}

							if (aMessage.length > 0) {
								oParameterDialog.getModel("MessageModel").setProperty("/message", aMessage);
							}
						}
					}
				}),
				endButton: new Button({
					text: I18n.get().getText("CANCEL_BUTTON"),
					press: function () {
						oParameterDialog.close();
						mSettings.close.apply(null);
					}
				}),
				afterClose: function (oControlEvent) {
					oParameterDialog.destroy();
				}
			}).addStyleClass("sapUiNoContentPadding").addStyleClass(_getCompactModeStyleClass(oDialogController));
			oParameterDialog.setModel(new JSONModel(oMessageModel), "MessageModel");
			return oParameterDialog;
		}

		function fnGetUnsavedDialog(oController, sFragmentID, sTripNo, sPernr) {
			if (!oController.oDiscardUnSavedDialog) {
				oController.oDiscardUnSavedDialog = this.getFragment({
					id: sFragmentID,
					name: "sap.fin.travel.lib.reuse.view.fragments.UnsavedChangesDialog",
					controller: oController,
					models: {
						i18n: oController.getView().getModel("i18n")
					}
				});

				oController.oDiscardUnSavedDialog.setModel(oController.getView().getModel());
			}

			return new Promise(function (resolve) {
				sap.ui.core.Fragment.byId(sFragmentID, "unsavedChangesEditButton").attachPress(function () {
					oController.oDiscardUnSavedDialog.close();
					resolve();
				});
				sap.ui.core.Fragment.byId(sFragmentID, "unsavedChangesCancelButton").attachPress(function () {
					oController.oDiscardUnSavedDialog.close();
				});

				oController.oDiscardUnSavedDialog.setModel(new JSONModel({
					"unsavedChangesQuestion": I18n.get().getText(oController, "DRAFT_LOCKED_BY_USER", [sTripNo, sPernr])
				}), "Dialog");

				oController.oDiscardUnSavedDialog.open();
			});
		}

		/**
		 * Get Fragment
		 *
		 * @parameter{object} mSettings: map of {name, id, controller, models }. If the name is not provided, we return undefined
		 * @deprecated since 1.58, use {@link sap.ui.core.Fragment.load} instead
		 * @return undefined if mSettings.name is not provided.
		 */
		function fnGetFragment(sId) {
			if (typeof sId !== "string") {
				jQuery.sap.log.info("@deprecated since 1.58, use {@link sap.fin.travel.lib.reuse.util.Fragment.loadFragment} instead");
				var mSettings = sId;
				if (!mFragments.has(mSettings.id)) {
					if (mSettings && mSettings.hasOwnProperty("name")) {
						var oFragment = sap.ui.xmlfragment(mSettings.id, mSettings.name, mSettings.controller);
						if (mSettings.hasOwnProperty("models")) {
							for (var model in mSettings.models) {
								oFragment.setModel(mSettings.models[model], model.toString());
							}
						}
						mFragments.set(mSettings.id, oFragment);
					} else {
						return undefined;
					}
				}
				return mFragments.get(mSettings.id);
			}
			return mFragments.get(sId);
		}

		/**
		 * Get Fragment
		 *
		 * @parameter{object} mSettings: map of {name, id, controller, models }. If the name is not provided, we return undefined
		 * @return undefined if mSettings.name is not provided.
		 */
		function fnLoadFragment(mSettings) {
			return new Promise(function (resolve) {
				var fnAddAndReturn = function (fragmentMap, fragment, settings) {
					if (settings && settings.hasOwnProperty("models")) {
						for (var model in settings.models) {
							fragment.setModel(settings.models[model], model.toString());
						}
					}
					fragmentMap.set(settings.id, fragment);
					// Fragment loaded, resolve
					resolve(fragmentMap.get(mSettings.id));
				};
				if (mSettings && mSettings.hasOwnProperty("name") && !mFragments.has(mSettings.id)) {
					var oNewFragment;
					// @deprecated since 1.58, use {@link sap.ui.core.Fragment.load} instead
					if (Fragment && typeof Fragment.load === "function") {
						Fragment.load(mSettings).then(function (oFrament) {
							fnAddAndReturn(mFragments, oFrament, mSettings);
						});
					} else {
						fnAddAndReturn(mFragments, sap.ui.xmlfragment(mSettings.id, mSettings.name, mSettings.controller), mSettings);
					}
				} else {
					// Fragment already loaded, resolve
					resolve(mFragments.get(mSettings.id));
				}
			});
		}

		function fnDestroyAll() {
			mFragments.forEach(function (value, key, map) {
				if (value.destroy) {
					value.destroy();
				}
			});
		}

		function fnDestroy(sFragmentId) {
			mFragments.forEach(function (value, key, map) {
				if (key === sFragmentId && value.destroy) {
					value.destroy();
				}
			});
			mFragments.delete(sFragmentId);
		}

		function fnConfirmationDialog(mSettings) {
			var sCustomMessageKey = "ACTION_CONFIRM|" + mSettings.name; // Key for i18n in application for custom message
			var sMsgBoxText = I18n.get().hasText(mSettings.controller, sCustomMessageKey) ? I18n.get().getText(mSettings.controller,
					sCustomMessageKey) :
				I18n.get().getText(mSettings.controller, "ACTION_CONFIRM", [mSettings.label]);

			MessageBox.confirm(sMsgBoxText, {
				title: mSettings.label,
				onClose: function (oAction) {
					if (oAction === "OK") {
						if (mSettings.success && typeof mSettings.success === "function") {
							mSettings.success.apply(null, arguments);
						}
					} else if (oAction === "CANCEL") {
						if (mSettings.error && typeof mSettings.error === "function") {
							mSettings.error.apply(null, arguments);
						}
					}
				}
			});
		}

		return {
			getFunctionImportDialog: fnGetFunctionImportDialog,
			getUnsavedDialog: fnGetUnsavedDialog,
			getFragment: fnGetFragment,
			loadFragment: fnLoadFragment,
			destroyAll: fnDestroyAll,
			destroy: fnDestroy,
			confirmationDialog: fnConfirmationDialog
		};
	}

	return {
		get: function () {
			if (!_oInstance) {
				_oInstance = createInstance();
			}
			return _oInstance;
		},

		destroy: function () {
			if (_oInstance) {
				_oInstance.destroyAll();
				_oInstance = null;
			}
		}

	};
}, true);

/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/MessageType",
	"sap/ui/model/json/JSONModel",
	"sap/fin/travel/lib/reuse/util/MessageParser",
	"sap/m/MessageBox",
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/ui/core/ValueState",
	"sap/ui/core/message/Message",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/FragmentHelper",
	"sap/fin/travel/lib/reuse/util/AppContextHandler"
], function (MessageType, JSONModel, MessageParser, MessageBox, I18n, ValueState, Message, Utils, FragmentHelper, AppContextHandler) {
	"use strict";

	var _oInstance;

	function createInstance() {
		var _oMessageFragment;
		var _pleaseNoOpening = false;
		var TRV_MSG_CODE = "TRV_MSG_ID";

		function _convertToMessageBox(oError) {
			var convertedError = {
				icon: MessageBox.Icon.ERROR,
				title: I18n.get().getText("ST_ERROR"),
				state: ValueState.Error,
				detail: oError.hasOwnProperty("detail") ? oError.detail : ""
			};
			if (oError.hasOwnProperty("type")) {
				switch (oError.type) {
				case MessageParser.ErrorType.Warning:
					convertedError.icon = MessageBox.Icon.WARNING;
					convertedError.title = I18n.get().getText("ST_WARNING");
					convertedError.state = ValueState.Warning;
				case MessageParser.ErrorType.Info:
					convertedError.icon = MessageBox.Icon.INFORMATION;
					convertedError.title = I18n.get().getText("ST_INFO");
					convertedError.state = ValueState.Information;
				case MessageParser.ErrorType.Success:
					convertedError.icon = MessageBox.Icon.SUCCESS;
					convertedError.title = I18n.get().getText("ST_SUCCESS");
					convertedError.state = ValueState.Success;
				default:
					convertedError.icon = MessageBox.Icon.ERROR;
					convertedError.title = I18n.get().getText("ST_ERROR");
					convertedError.state = ValueState.Error;
				}
			}
			return convertedError;
		}

		function fnHasMessage() {
			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
			return oMessageModel && oMessageModel.getData() && oMessageModel.getData().length > 0;
		}

		function fnHasInternalError() {
			var bHasError = false;
			if (fnHasMessage()) {
				var oMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();
				for (var i = 0; i < oMessages.length; i++) {
					if (oMessages[i].code === TRV_MSG_CODE) {
						bHasError |= oMessages[i] && (oMessages[i].type === MessageType.Error || oMessages[i].type === MessageType.Warning);
					}
				}
			}
			return bHasError;
		}

		/**
		 * This function allows to detect if messages are of a given message types. It allows to get messages from the message manager if none is provided.
		 * 
		 * @param {array} aMessages Messages array to decide if there are some error. If empty (or undefined), get the messages from message manager instead.
		 * @param {array} aMessageTypes array of MessageType. Message types will be used to filter out and determine if there are message of these given types
		 * @return {boolean} true if there is a message in either the provided aMessages or in the MessageManager of the given aMessageTypes. False otherwise.
		 */
		function fnHasMessageManagerError(aMessages, aMessageTypes) {
			var oMessages = (aMessages && aMessages.length > 0) ? aMessages : sap.ui.getCore().getMessageManager().getMessageModel().getData();
			return fnHasError(oMessages, aMessageTypes);
		}

		/**
		 * Determines if there are errors in the given aMessages of the given aMessageType
		 * @param {array} aMessages 
		 * @param {array} aMessageType 
		 */
		function fnHasError(aMessages, aMessageType) {
			var bHasError = false;
			if (fnHasMessage() || aMessages) {
				var oMessages = aMessages;
				for (var i = 0; i < oMessages.length; i++) {
					if (aMessageType && aMessageType.length > 0) {
						bHasError |= oMessages[i] && Utils.includes(aMessageType, [oMessages[i].type]);
					} else {
						bHasError |= oMessages[i] && (oMessages[i].type === MessageType.Error || oMessages[i].type === MessageType.Warning);
					}
				}
			}
			return bHasError;
		}

		function fnHandleMessageResponse(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseHeader(oResponse, aMessages);
			MessageParser.parseMessageResponseBatch(oResponse, aMessages);
			return fnHasError(aMessages); //check on response messages only.
		}

		function fnHandleMessageHeader(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseHeader(oResponse, aMessages);
			return fnHasError(aMessages); //check on response messages only.
		}

		function fnHandleMessageBatch(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseBatch(oResponse, aMessages);
			return fnHasError(aMessages); //check on response messages only.
		}

		/**
		 * Get error message from the parameter object and return a displayble error message.
		 * The precedence is: first try to extract value from responseText, then if not possible from a message, otherwise from the response contained in object's parameters
		 * 
		 * 
		 * @param {object} oErrorMsg: error message containing {statusCode, statusText, message, responseText, headers, etc.}
		 * @return {object} tuple containing {type: errorCode, like error, success, warning, etc., error: intellegible error message}
		 */
		function fnGetErrorMessage(oErrorMsg, bWithErrorCode) {
			var sError = oErrorMsg;
			/* eslint-disable sap-no-ui5base-prop */
			if (oErrorMsg) {
				if (oErrorMsg.hasOwnProperty("responseText")) {
					sError = MessageParser.parseErrorMessage(oErrorMsg.responseText, bWithErrorCode);
				} else if (oErrorMsg.hasOwnProperty("message")) {
					sError = oErrorMsg.message;
				} else if (oErrorMsg.hasOwnProperty("mParameters") && oErrorMsg.mParameters.hasOwnProperty("response")) {
					sError = fnGetErrorMessage(oErrorMsg.mParameters.response, bWithErrorCode);
				}
				if (Utils.isEmptyObjectOrString(sError)) {
					sError = {
						type: "error",
						error: I18n.get().getText("UNKNOWN_ERROR").concat(": ", oErrorMsg.statusCode, " ", oErrorMsg.statusText || oErrorMsg.message)
					};
				}
			}

			/* eslint-enable sap-no-ui5base-prop */
			return sError;
		}

		function fnGetErrorMessageHeader(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseHeader(oResponse, aMessages);
			return aMessages[0] || fnGetErrorMessage(oResponse);
		}

		function fnGetErrorMessageBatch(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseBatch(oResponse, aMessages);
			return aMessages[0] ? aMessages[0].message : fnGetErrorMessage(oResponse);
		}

		function fnGetErrorMessageResponse(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseHeader(oResponse, aMessages);
			return aMessages[0] || fnGetErrorMessageBatch(oResponse);
		}

		function fnGetErrorMessagesResponse(oResponse) {
			var aMessages = [];
			MessageParser.parseMessageResponseBatch(oResponse, aMessages);
			MessageParser.parseMessageResponseHeader(oResponse, aMessages);
			return aMessages;
		}

		/**
		 * Display a message in popup
		 * 
		 * If no message use a default error message.
		 * If message type string use it, with error message type.
		 * Otherwise parse it.
		 * 
		 * @param {boolean} bFromRequestFailed indicates that error comes from the generic attachRequestFailed handler. In such case, we might not use the regular Error message fragment, but instead navigate to a not found page
		 */
		function fnShowMessage(error, bFromRequestFailed) {
			var oError = error ? (typeof error === "string" ? error : fnGetErrorMessage(error, true)) : I18n.get().getText("UNKNOWN_ERROR");
			var oMessageBoxError = _convertToMessageBox(oError);
			var sMessage = oError.error ? oError.error : oError;
			if (_oMessageFragment == undefined || _oMessageFragment.isOpen() !== true) {
				FragmentHelper.get().loadFragment({
					id: "ErrorMessageDialogFragmentID",
					name: "sap.fin.travel.lib.reuse.view.fragments.ErrorMessage",
					controller: {
						close: function () {
							_oMessageFragment.close();
							_oMessageFragment = undefined;
							FragmentHelper.get().destroy("ErrorMessageDialogFragmentID");
						}
					},
					models: {
						message: new JSONModel({
							message: sMessage,
							title: oMessageBoxError.title,
							state: oMessageBoxError.state,
							detail: oMessageBoxError.detail,
							close: I18n.get().getText("CLOSE")
						})
					}
				}).then(function (oMessageFragment) {
					if (oMessageFragment) {
						_oMessageFragment = oMessageFragment;
						if (_pleaseNoOpening && "function" === typeof _pleaseNoOpening) {
							if (bFromRequestFailed) {
								_pleaseNoOpening({
									message: sMessage,
									title: oMessageBoxError.title
								});
							}
							_pleaseNoOpening = false;
						} else {
							_oMessageFragment.open();
						}
					}
				});
			} else {
				// in case message popover already open we simply append new message.
				// var oMessageModel = _oMessageFragment.getModel("message");
				// oMessageModel.setProperty("/message", oMessageModel.getProperty("/message").concat("\n" + sMessage));
			}
		}

		/**
		 * 
		 * @param {function} fnCallback call back function to be called upon next showMessage call. 
		 * The callback will be called with the error {title:str, message:str}
		 */
		function fnPreventNextOpening(fnCallback) {
			_pleaseNoOpening = fnCallback;
		}

		function fnContainsMessage(oErrorMessage) {
			var bFound = false;
			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
			if (oMessageModel && oMessageModel.getData() && oMessageModel.getData().length > 0) {
				for (var i = 0; i < oMessageModel.getData().length; i++) {
					var oModelMessage = oMessageModel.getData()[i];
					if (oModelMessage.target === oErrorMessage.target) {
						return true;
					}
				}
			}
			return bFound;
		}

		function fnAddMessage(oErrorMessage) {
			if (!fnContainsMessage(oErrorMessage)) {
				sap.ui.getCore().getMessageManager().addMessages([oErrorMessage]);
			}
		}

		function fnUpdateMessageManager(aErrorMessages) {
			if (aErrorMessages) {
				aErrorMessages.forEach(function (oErrorMessage) {
					fnAddMessage(new Message({
						code: TRV_MSG_CODE,
						message: oErrorMessage.message,
						type: ValueState.Error,
						target: oErrorMessage.target
					}));
				});
			}
			fnOpenMessagesPopover();
		}

		function fnCleanValidationMessages() {
			var aMessagesToRemove = [];
			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
			if (oMessageModel && oMessageModel.getData() && oMessageModel.getData().length > 0) {
				for (var i = 0; i < oMessageModel.getData().length; i++) {
					var oModelMessage = oMessageModel.getData()[i];
					if (oModelMessage.code === TRV_MSG_CODE) {
						aMessagesToRemove.push(oModelMessage);
					}
				}
			}
			sap.ui.getCore().getMessageManager().removeMessages(aMessagesToRemove);
		}

		function fnRefreshValidationMessages(sBindingPath) {
			var aMessagesToRemove = [];
			var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
			if (sBindingPath && oMessageModel && oMessageModel.getData() && oMessageModel.getData().length > 0) {
				for (var i = 0; i < oMessageModel.getData().length; i++) {
					var oModelMessage = oMessageModel.getData()[i];
					if (oModelMessage.code === TRV_MSG_CODE && Utils.includes(oModelMessage.target, sBindingPath)) {
						aMessagesToRemove.push(oModelMessage);
					}
				}
			}
			sap.ui.getCore().getMessageManager().removeMessages(aMessagesToRemove);
		}

		/*
		 * Toggle the message popover.
		 * At this point MessagePopover fragment should be initialized. If already opened close it.
		 */
		function fnToggleMessagesPopover() {
			var oMessagePopover = FragmentHelper.get().getFragment("TravelMessagePopoverFragmentID");
			if (oMessagePopover == undefined) {
				jQuery.sap.log.error("Message Popover Fragment is not initialized !");
				return;
			}
			var oTargetMessageButton = AppContextHandler.getTargetMessageButton();
			if (oTargetMessageButton != undefined && oTargetMessageButton.isActive()) {
				oMessagePopover.toggle(oTargetMessageButton);
			}
		}

		/*
		 * Open the message popover.
		 * At this point MessagePopover fragment should be initialized. If already opended do nothing
		 */
		function fnOpenMessagesPopover() {
			if (fnHasMessageManagerError()) {
				var oMessagePopover = FragmentHelper.get().getFragment("TravelMessagePopoverFragmentID");
				if (oMessagePopover == undefined) {
					jQuery.sap.log.error("Message Popover Fragment is not initialized !");
					return;
				}
				var oTargetMessageButton = AppContextHandler.getTargetMessageButton();
				if (oTargetMessageButton != undefined && !oMessagePopover.isOpen()) {
					if (oTargetMessageButton.isActive()) {
						oMessagePopover.toggle(oTargetMessageButton);
						if (!oTargetMessageButton.checkFieldGroupIds("MessagePopoverRedering")) { // MessageButton has been rederer after it was activated!
							var aFieldGroupIds = oTargetMessageButton.getFieldGroupIds();
							aFieldGroupIds.push("MessagePopoverRedering");
							oTargetMessageButton.setFieldGroupIds(aFieldGroupIds);
						}
					} else if (oTargetMessageButton.checkFieldGroupIds("MessagePopoverRedering")) {
						var aFieldGroupIds = oTargetMessageButton.getFieldGroupIds();
						aFieldGroupIds.splice(aFieldGroupIds.indexOf("MessagePopoverRedering"), 1);
						oTargetMessageButton.setFieldGroupIds(aFieldGroupIds);
					}
				}
			}
		}

		return {
			hasMessage: fnHasMessage,
			hasError: fnHasError,
			hasMessageManagerError: fnHasMessageManagerError,
			hasInternalError: fnHasInternalError,
			handleMessageResponse: fnHandleMessageResponse,
			handleMessageHeader: fnHandleMessageHeader,
			handleMessageBatch: fnHandleMessageBatch,
			getErrorMessageResponse: fnGetErrorMessageResponse,
			getErrorMessageHeader: fnGetErrorMessageHeader,
			getErrorMessageBatch: fnGetErrorMessageBatch,
			getErrorMessage: fnGetErrorMessage,
			getErrorMessagesResponse: fnGetErrorMessagesResponse,
			showMessage: fnShowMessage,
			updateMessageManager: fnUpdateMessageManager,
			cleanValidationMessages: fnCleanValidationMessages,
			refreshValidationMessages: fnRefreshValidationMessages,
			toggleMessagesPopover: fnToggleMessagesPopover,
			openMessagesPopover: fnOpenMessagesPopover,
			preventNextShowMessage: fnPreventNextOpening
		};
	}

	return {
		get: function () {
			if (!_oInstance) {
				_oInstance = createInstance();
			}
			return _oInstance;
		}

	};
}, true);

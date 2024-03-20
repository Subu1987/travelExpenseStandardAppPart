/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

	function getMethods() {
		var ErrorType = {
			Error: "error",
			Info: "info",
			Success: "success",
			Warning: "warning",

			/**
			 * Converts error type from OData to Message Model
			 * 
			 * @param {Object} sErrorType	error type to be converted.
			 * @returns {sap.ui.core.MessageType}	converted error type.
			 */
			toMessageType: function (sErrorType) {
				switch (sErrorType) {
				case ErrorType.Info:
				case sap.ui.core.MessageType.Information:
					return sap.ui.core.MessageType.Information;
				case ErrorType.Success:
				case sap.ui.core.MessageType.Success:
					return sap.ui.core.MessageType.Success;
				case ErrorType.Warning:
				case sap.ui.core.MessageType.Warning:
					return sap.ui.core.MessageType.Warning;
				default:
					return sap.ui.core.MessageType.Error;
				}
			}
		};

		/**
		 * Extract an intellegible error message from the parameter if the content is a JSON object. 
		 * 
		 * @param {object} oErrorMessage
		 * @param {boolean} bWithErrorCode
		 * 
		 * @return a tuple containing {error: string containing error msg, type: errorCode, such as error, warning, etc.} if the error message is parsable. Otherwise, returns undefined.
		 * 
		 */
		function fnParseErrorMessage(oErrorMessage, bWithErrorCode) {
			var oError;
			try {
				oError = jQuery.parseJSON(oErrorMessage);
				if (oError && oError.error && oError.error.code && oError.error.code === "SY/530") {
					oError = oError.error.innererror.errordetails[0];
					if (bWithErrorCode) {
						return {
							error: oError.message,
							type: oError.severity
						};
					} else {
						return {
							error: oError.message
						};
					}
				}
				var sType = (oError.error && oError.error.innererror && oError.error.innererror.errordetails) ? oError.error.innererror.errordetails[
					0].severity : ErrorType.Error;
				if (oError && oError.error && oError.error.message) {
					if (bWithErrorCode) {
						return {
							error: oError.error.message.value,
							type: sType
						};
					} else {
						return {
							error: oError.error.message.value
						};
					}
				} else {
					return oError;
				}
			} catch (error) {
				//No valid JSON, try HTML
				var fakeElement = $('<div></div>');
				fakeElement.html(oErrorMessage);
				if (fakeElement && fakeElement.length > 0) {
					if (bWithErrorCode) {
						return {
							error: fakeElement[0].outerText,
							type: ErrorType.Error
						};
					} else {
						return {
							error: fakeElement[0].outerText
						};
					}
				}
			}
		}

		/**
		 * Parses messages from response headers.
		 * 
		 * @param {Object} oResponse	OData response containing messages.
		 * @param {Array} aMessages	Array if message extract from OData response.
		 */
		function fnParseMessageResponseHeader(oResponse, aMessages) {
			var sSapMessage, oSapMessage;
			if (oResponse && oResponse.headers) {
				if (oResponse.headers["sap-message"]) {
					sSapMessage = oResponse.headers["sap-message"];
					try {
						oSapMessage = JSON.parse(sSapMessage);
						if (oSapMessage && oSapMessage.hasOwnProperty("error")) {
							oSapMessage = oSapMessage.error;
						}
					} catch (sError) {
						jQuery.sap.log.error("sap-message json parse error: " + sError);
					}
					if (oSapMessage && oSapMessage.message) {
						aMessages.push(new sap.ui.core.message.Message({
							message: oSapMessage.message,
							type: ErrorType.toMessageType(oSapMessage.severity),
							code: oSapMessage.code
						}));
					}
					if (oSapMessage && oSapMessage.details && oSapMessage.details.length > 0) {
						for (var i = 0, iEnd = oSapMessage.details.length; i < iEnd; i++) {
							aMessages.push(new sap.ui.core.message.Message({
								message: oSapMessage.details[i].message,
								type: ErrorType.toMessageType(oSapMessage.details[i].severity),
								code: oSapMessage.details[i].code
							}));
						}
					}
				} else if (oResponse.hasOwnProperty("responseText")) {
					aMessages.push(fnParseErrorMessage(oResponse.responseText, true));
				}
			}
		}

		/**
		 * Parses messages from response body.
		 * 
		 * @param {Object} oResponse	OData response containing messages.
		 * @param {Array} aMessages	Array if message extract from OData response.
		 */
		function fnParseMessageResponseBatch(oResponse, aMessages) {
			if (oResponse) {
				var oBatchResponse = oResponse.__batchResponses ? oResponse.__batchResponses : oResponse.data ? oResponse.data.__batchResponses :
					undefined;
				if (oBatchResponse && oBatchResponse.length > 0) {
					for (var i = 0; i < oBatchResponse.length; i++) {
						if (oBatchResponse[i].hasOwnProperty("response")) {
							_fnParseMessageResponse(oBatchResponse[i].response, aMessages);
						} else if (oBatchResponse[i].hasOwnProperty("__changeResponses")) {
							_fnParseMessageChangeResponse(oBatchResponse[i].__changeResponses, aMessages);
						} else {
							fnParseMessageResponseHeader(oBatchResponse[i], aMessages);
						}
					}
				}
			}
		}

		/**
		 * Parses a message from response body.
		 * 
		 * @param {Object} oResponse	OData response containing messages.
		 * @param {Array} aMessages	Array if message extract from OData response.
		 */
		function _fnParseMessageResponse(oResponse, aMessages) {
			var sSapMessage;
			sSapMessage = oResponse.body;
			if (sSapMessage) {
				_fnParseMessage(sSapMessage, aMessages);
			}
		}

		/**
		 * Parses a message from response headers.
		 * 
		 * @param {Object} oResponse	OData response containing messages.
		 * @param {Array} aMessages	Array if message extract from OData response.
		 */
		function _fnParseMessageChangeResponse(oResponse, aMessages) {
			for (var i = 0; i < oResponse.length; i++) {
				fnParseMessageResponseHeader(oResponse[i], aMessages);
			}
		}

		/**
		 * Parses a message.
		 * 
		 * @param {Object} oResponse	OData response containing messages.
		 * @param {Array} aMessages	Array if message extract from OData response.
		 */
		function _fnParseMessage(oSAPMessage, aMessages) {
			var oSapMessage, oSapMessageDetail = {};
			try {
				oSapMessage = JSON.parse(oSAPMessage);
			} catch (sError) {
				jQuery.sap.log.error("sap-message json parse error: " + sError);
			}
			if (oSapMessage && oSapMessage.error) {
				oSapMessageDetail.code = oSapMessage.error.code;
				oSapMessageDetail.message = oSapMessage.error.message.value;
				oSapMessageDetail.type = ErrorType.toMessageType(ErrorType.Error);
				if (oSapMessage.error.innererror && oSapMessage.error.innererror.errordetails) {
					oSapMessageDetail = oSapMessage.error.innererror.errordetails;
					for (var j = 0; j < oSapMessageDetail.length; j++) {
						aMessages.push(new sap.ui.core.message.Message({
							message: oSapMessageDetail[j].hasOwnProperty("message") ? oSapMessageDetail[j].message : oSapMessageDetail[j].text,
							type: ErrorType.toMessageType(oSapMessageDetail[j].severity),
							code: oSapMessageDetail[j].code
						}));
					}
				} else {
					aMessages.push(new sap.ui.core.message.Message({
						message: oSapMessageDetail.hasOwnProperty("message") ? oSapMessageDetail.message : oSapMessageDetail.text,
						type: ErrorType.toMessageType(oSapMessageDetail.severity),
						code: oSapMessageDetail.code
					}));
				}
			}
		}

		return {
			ErrorType: ErrorType,
			parseErrorMessage: fnParseErrorMessage,
			parseMessageResponseHeader: fnParseMessageResponseHeader,
			parseMessageResponseBatch: fnParseMessageResponseBatch
		};
	}

	return getMethods();
}, true);

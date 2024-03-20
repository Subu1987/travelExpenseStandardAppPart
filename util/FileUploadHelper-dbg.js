/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
/*global jQuery: false, sap: false */
(function () {
	"use strict";
	jQuery.sap.declare("sap.fin.travel.lib.reuse.util.FileUploadHelper");
	jQuery.sap.require("sap.fin.travel.lib.reuse.util.MessageUtil");
	jQuery.sap.require("jquery.sap.resources");

	sap.fin.travel.lib.reuse.util.FileUploadHelper = {};

	/*****************************************************************************************************************
	 *  File Upload Helper
	 *****************************************************************************************************************/

	/**
	 * Proposing a generic file size exceed handler displaying a Message box pop up
	 * @param {Event} oEvent Description can be found at
	 * https://sapui5.hana.ondemand.com/#docs/api/symbols/sap.m.UploadCollection.html#event:fileSizeExceed and at https://www.w3.org/TR/FileAPI/#dfn-filelist
	 * @param {Int} iMaxFileSize Max size in Mb
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.fileSizeExceedHandler = function (oEvent, iMaxFileSize) {
		var aMessage = [];
		var sFileName = oEvent.getParameter("fileName");
		var sFileSize = oEvent.getParameter("fileSize");
		sFileSize = Math.round(sFileSize * 100) / 100;
		sFileSize += " MB";
		var sMaxFileSize = Math.round(iMaxFileSize * 100) / 100 + " MB";
		var oResourceBundle = sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();
		aMessage.push(oResourceBundle.getText("FILEUPLOAD_ERROR_FILE_SIZE", [sFileSize, sMaxFileSize]));
		sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({
			error: oResourceBundle.getText("FILEUPLOAD_ERROR_FILE_BEFORE_UPLOAD", sFileName),
			detail: aMessage.join("\n"),
			title: oResourceBundle.getText("ERROR")
		});
	};

	/**
	 * Proposing a generic file type mismatch handler displaying a Message box pop up
	 * @param {Event} oEvent Description can be found at
	 * https://sapui5.hana.ondemand.com/#docs/api/symbols/sap.m.UploadCollection.html#event:fileTypeMissmatch and at https://www.w3.org/TR/FileAPI/#dfn-filelist
	 * @param {Array} aAllowedMimeTypes List of allowed file types
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.fileTypeMissmatchHandler = function (oEvent, aAllowedMimeTypes) {
		var oResourceBundle = sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();
		sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({
			error: oResourceBundle.getText("FILEUPLOAD_ERROR_FILE_BEFORE_UPLOAD", oEvent.getParameter("fileName")),
			detail: oResourceBundle.getText("FILEUPLOAD_ERROR_FILE_EXTENSION", [oEvent.getParameter("mimeType"), aAllowedMimeTypes]),
			title: oResourceBundle.getText("ERROR"),
		});
	};

	/**
	 * Called before the upload is fired
	 * @param {Event} oEvent Before upload file event
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.beforeUploadFile = function (oEvent) {
		var oSource = oEvent.getSource();
		var oContext = oSource.getBindingContext();
		var filename = encodeURIComponent(oEvent.getParameter("files")[0].name);
		var oResourceBundle = sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();
		var bCreate = oEvent.getSource().getBindingContext().getProperty("Tripno") === sap.fin.travel.lib.reuse.util.TravelUtil.TripNumber.Initial;
		var aMessage = [];
		if (bCreate && !oEvent.getSource().getBindingContext().getProperty("Receiptno")) {
			// It is not possible to add attachment in creation mode only at hearder level
			aMessage.push(oResourceBundle.getText("FILEUPLOAD_ERROR_IN_CREATION_MODE_FILE_BEFORE_UPLOAD"));
		}
		if (aMessage.length > 0) {
			sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({
				error: oResourceBundle.getText("FILEUPLOAD_ERROR_FILE_BEFORE_UPLOAD", filename),
				detail: aMessage.join("\n"),
				title: oResourceBundle.getText("ERROR"),
			});
			// abord upload
			throw new Error("Abort upload because of errors");
		}

		// Set the upload URL for the current context
		oSource.setUploadUrl(oContext.getModel().sServiceUrl + oContext.sPath + "/Attachments");

		// Retrieve XSRF token
		var oModel = oContext.getModel();
		var sTokenName = "x-cs" + "rf-token";
		oModel.refreshSecurityToken();
		var sToken = oModel.getHeaders()[sTokenName];
		if (!sToken) {
			jQuery.sap.log.error("Could not get XSRF token");
			sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({
				error: oResourceBundle.getText("FILEUPLOAD_ERROR_TOKEN"),
				title: oResourceBundle.getText("ERROR"),
			});
			// abord upload
			throw new Error("Abort upload because of errors");
		}

		// Set header parameters
		var ctdisp = "attachment; filename=\"" + filename + "\"";
		var oCustomerHeaderToken, oCustomerHeaderXRQ, oCustomerHeaderCdisp, oCustomHeaderSlug, oCustomHeaderCtype;

		var aParams = oEvent.getSource().removeAllHeaderParameters();

		// Case of Business document (FileUploader)
		if (oEvent.getParameter("id").indexOf("bus_doc_file_uploader") > -1) {
			// Header Token
			oCustomerHeaderToken = new sap.ui.unified.FileUploaderParameter({
				name: sTokenName,
				value: sToken
			});
			oCustomerHeaderXRQ = new sap.ui.unified.FileUploaderParameter({
				name: "X-Requested-With",
				value: "XMLHttpRequest"
			});

			// Header Content-Disposition
			oCustomerHeaderCdisp = new sap.ui.unified.FileUploaderParameter({
				name: "Content-Disposition",
				value: ctdisp
			});
			oCustomHeaderSlug = new sap.ui.unified.FileUploaderParameter({
				name: "slug",
				value: encodeURIComponent(filename)
			});
			oCustomHeaderCtype = new sap.ui.unified.FileUploaderParameter({
				name: "Content-Type",
				value: "application/octet-stream"
			});

			aParams.forEach(function (oParam) {
				if (oParam.getId() === "Document-Type") {
					oSource.addHeaderParameter(oParam);
				}
			});

			// Case of GOS attachment (FileUploader from the UploadCollection)
		} else {
			// Header Token
			oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
				name: sTokenName,
				value: sToken
			});
			oCustomerHeaderXRQ = new sap.m.UploadCollectionParameter({
				name: "X-Requested-With",
				value: "XMLHttpRequest"
			});

			// Header Content-Disposition
			oCustomerHeaderCdisp = new sap.m.UploadCollectionParameter({
				name: "Content-Disposition",
				value: ctdisp
			});
			oCustomHeaderSlug = new sap.m.UploadCollectionParameter({
				name: "slug",
				value: encodeURIComponent(filename)
			});
			oCustomHeaderCtype = new sap.m.UploadCollectionParameter({
				name: "Content-Type",
				value: "application/octet-stream"
			});
		}
		oSource.addHeaderParameter(oCustomerHeaderToken);
		oSource.addHeaderParameter(oCustomerHeaderXRQ);
		oSource.addHeaderParameter(oCustomerHeaderCdisp);
		oSource.addHeaderParameter(oCustomHeaderCtype);
		oSource.addHeaderParameter(oCustomHeaderSlug);
	};

	/**
	 * In the past, we were parsing the added attachment and manually attaching it to the UploadCollection list. 
	 * We properly refresh the list from the backend.
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper._updateUploadCollection = function (oEvent, oUploadCollection) {
		/*
		// Add created item to the attachments list
		var oResponse = oEvent.getParameters().responseRaw ? oEvent.getParameters().responseRaw : oEvent.getParameters().getParameter(
			"responseRaw");
		var oXmlResponse = new DOMParser().parseFromString(oResponse, "text/xml");
		var oProperties = oXmlResponse.getElementsByTagName("m:properties")[0];

		var aAttributes = [
			new sap.m.ObjectAttribute({
				text: oProperties.getElementsByTagName("d:Uploadedby")[0].childNodes[0].nodeValue
			}),
			new sap.m.ObjectAttribute({
				text: oProperties.getElementsByTagName("d:Uploaddate")[0].childNodes[0].nodeValue
			})
		];

		if (oProperties.getElementsByTagName("d:Attachmenttype")[0].childNodes[0].nodeValue === "AL") {
			aAttributes.push(new sap.m.ObjectAttribute({
				text: oProperties.getElementsByTagName("d:Description")[0].childNodes[0].nodeValue
			}));
		}
		*/
		var oSource = oUploadCollection ? oUploadCollection : oEvent.getSource();
		oSource.getBinding("items").refresh();
	};

	/**
	 * Called when upload of a GOS attachment is finished (1st button)
	 * @param {Event} oEvent On Upload Complete event
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.onGOSUploadComplete = function (oEvent) {
		// Check if the Upload is successful
		var status = oEvent.getParameters().getParameter("status");
		if (status !== 201) {
			sap.fin.travel.lib.reuse.util.FileUploadHelper._fileUploadFailure(oEvent);
		} else {
			sap.fin.travel.lib.reuse.util.FileUploadHelper._updateUploadCollection(oEvent);
		}
	};

	/**
	 * Called when upload of a Business document is finished (last button)
	 * @param {Event} oEvent On Upload Complete event
	 * @param {sap.m.UploadCollection} oUploadCollection The UploadCollection used to display the whole list of attachments
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.onBusDocUploadComplete = function (oEvent, oUploadCollection) {
		var oSource = oEvent.getSource();
		// Check if the Upload is successful
		var status = oEvent.getParameters().status;
		if (status !== 201) {
			oSource.abort();
			sap.fin.travel.lib.reuse.util.FileUploadHelper._fileUploadFailure(oEvent);
		} else {
			sap.fin.travel.lib.reuse.util.FileUploadHelper._updateUploadCollection(oEvent, oUploadCollection);
		}

		// Reset file uploader
		oSource.clear();
		oSource.removeAllHeaderParameters();
	};

	/**
	 * Called when upload of URL or note is fired
	 * @param {string} sTitle Title of the note/link
	 * @param {string} sDescription Description of the note/link
	 * @param {boolean} bIsNote True if we upload a note, false if we upload a link
	 * @param {object} oController Controller of the view holding the fileupload control
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.uploadText = function (sTitle, sDescription, bIsNote, oController, fnSuccess, fnError) {
		var oContext = oController.getBindingContext();
		var oModel = oContext.getModel();
		sap.fin.travel.lib.reuse.util.PersistenceHelper.callFunction(oModel, {
			name: "/UploadText",
			urlParameters: {
				Pernr: oModel.getData(oContext.sPath).Pernr,
				Tripno: oModel.getData(oContext.sPath).Tripno,
				Title: sTitle,
				Text: sDescription,
				IsNote: bIsNote
			},
			success: function () {
				if (typeof fnSuccess === "function") {
					fnSuccess.apply(null, arguments);
				}
				// Refresh the attachments list
				oController.getBinding("items").refresh();
			},
			error: (typeof fnError === "function") ? fnError : sap.fin.travel.lib.reuse.util.FileUploadHelper._onError
		});
	};

	/**
	 * Handler for file delete
	 * @param {Event} oEvent File delete event
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper.deleteUploadedFile = function (oEvent) {
		var oSource = oEvent.getSource();

		var fnSuccess = jQuery.proxy(function () {
			oSource.getBinding("items").refresh();
		}, this);

		var mParameters = {
			success: fnSuccess,
			error: sap.fin.travel.lib.reuse.util.FileUploadHelper._onError
		};
		oSource.getModel().remove("/Attachments(" + encodeURI(oEvent.getParameter("documentId")) + ")", mParameters);
	};

	/**
	 * Handler for file upload failure
	 * @param {Event} oEvent The file upload failure event
	 * @private
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper._fileUploadFailure = function (oEvent) {

		var oFile = oEvent.getParameter("files");
		var fileName = oFile ? oFile[0].name : oEvent.getParameter("fileName");
		var responseRaw = oFile ? oFile[0].responseRaw : oEvent.getParameter("responseRaw");
		var oResourceBundle = sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();

		jQuery.sap.log.debug("Upload of file " + fileName + " failed!");

		var errorMessage;
		try {
			var xmlDoc = $.parseXML(responseRaw),
				responseXML = $(xmlDoc),
				message = responseXML.find("message");
			errorMessage = message[0].textContent;
		} catch (e) {
			errorMessage = responseRaw;
		}

		sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({
			error: errorMessage,
			title: oResourceBundle.getText("ERROR"),
		});
	};

	/**
	 * Display error message
	 * @param {object} oError Error
	 * @private
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper._onError = function (oError, test) {
		// var oResourceBundle = sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle();
		// sap.fin.travel.lib.reuse.util.MessageUtil.get().showMessage({
		// 	error: oError.message,
		// 	title: oResourceBundle.getText("ERROR")
		// });
	};

	/**
	 * Return the resource bundle for internationalized strings
	 * @private
	 * @returns {object} Resource Bundle
	 */
	sap.fin.travel.lib.reuse.util.FileUploadHelper._getResourceBundle = function () {
		if (!this.oResourceBundle) {
			this.oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fin.travel.lib.reuse");
		}
		return this.oResourceBundle;
	};
}());

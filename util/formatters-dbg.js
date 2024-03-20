/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
jQuery.sap.declare("sap.fin.travel.lib.reuse.util.formatters");

sap.fin.travel.lib.reuse.util.formatters = {
	/**
	 * If the provided {url} parameter is a url string, we try to get the relative path out of it.
	 * Otherwise we return the provided {url} parameter.
	 * @param {string} url URL to get the relative path
	 * @param {string} directLink URL for links attachment
	 * @returns {string} URL to the attachment
	 */
	/*eslint-disable sap-no-hardcoded-url*/
	getRelativeUrl: function (url, directLink) {
		if (directLink) {
			if (!/^https?:\/\//i.test(directLink)) {
				return "http://" + directLink;
			} else {
				return directLink;
			}
		}

		var sUrl = url;

		if (sUrl && typeof sUrl === "string") {
			/* eslint-disable sap-browser-api-error */
			var oLink = document.createElement("a");
			/* eslint-enable sap-browser-api-error */
			oLink.href = sUrl;
			sUrl = (oLink.pathname.charAt(0) === "/") ? oLink.pathname : "/" + oLink.pathname;
		}
		return sUrl;
	},
	/*eslint-enable sap-no-hardcoded-url*/

	/** 
	 * Generate the attachment ID
	 * Example: Pernr='00230690',Tripno='0000018727',AttachmentId='FOL29000000000004EXT43000000000001',Attachmenttype='BO'
	 * @param {string} sPernr Personal Number
	 * @param {string} sTripno Trip Number
	 * @param {string} sAttachmentId Attachment ID
	 * @param {string} sAttachmenttype Attachment Type
	 * @returns {string} Complete Attachment ID
	 */
	getAttachmentId: function (sPernr, sTripno, sAttachmentId, sAttachmenttype) {
		return "Pernr='" + sPernr + "',Tripno='" + sTripno + "',AttachmentId='" + sAttachmentId + "',Attachmenttype='" + sAttachmenttype + "'";
	},

	/**
	 * At the moment used for Attachment's UploadCollectionItem.visibleDelete property.
	 * Default for attachment editable is FALSE for display mode and TRUE for edit mode, unless stated otherwise (receipt has no property attachmenteditable for example and should not allow deletion in display mode)
	 */
	getAttachmentEditable: function(){
		var bAttachmentEditable = this.getParent().getBindingContext().getProperty("Attachmenteditable");
		var bDisplayMode = this.getParent().getBindingContext().getProperty("DisplayMode");
		return bAttachmentEditable === undefined ? !bDisplayMode : bAttachmentEditable;
	},


	getDescription: function (sAttachmentType, sDescription) {
		return sAttachmentType && sAttachmentType === "AL" ? sDescription : null;
	},

	insertSpaces: function (sMessage) {
		sMessage = sMessage.replace(/([a-z])([A-Z])/g, "$1 $2");
		sMessage = sMessage.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
		return sMessage;
	},

	formatDateTimeMedium: function (oDate) {
		var oFormatter = sap.ui.core.format.DateFormat.getDateTimeInstance({
			style: "medium"
		});
		return oFormatter.format(new Date(oDate));
	},
	
	formatDateTimeMediumUTC: function (oDate) {
		var oFormatter = sap.ui.core.format.DateFormat.getDateTimeInstance({
			style: "medium",
			UTC: true
		});
		return oFormatter.format(new Date(oDate));
	}
};

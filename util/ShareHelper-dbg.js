/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/AppComponent"
], function(AppComponent) {
	"use strict";

	function fnHandleEmail(oEvent) {
		var oGlobalModel = AppComponent.get().getGlobalModel();
		var sObjectTitle = oGlobalModel.getProperty("/share/title");
		var sObjectSubtitle = oGlobalModel.getProperty("/share/subTitle");
		var sEmailSubject = sObjectTitle;
		if (sObjectSubtitle) {
			sEmailSubject = sEmailSubject + " - " + sObjectSubtitle;
		}

		sap.m.URLHelper.triggerEmail(null, sEmailSubject, document.URL);
	}

	return {
		handleEmail: fnHandleEmail
	};

});

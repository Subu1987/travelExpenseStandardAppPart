/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";
	return Controller.extend("sap.fin.travel.lib.reuse.controller.NotFound", {
		onBeforeRendering: function() {
			var oMessagePage = this.getView().getContent()[0];
			oMessagePage.bindProperty("title", "/title");
			oMessagePage.bindProperty("text", "/text");
			oMessagePage.setIcon("sap-icon://error");
			oMessagePage.bindProperty("description", "/description");
		},

		onInit: function(){
			var oLastMessageModel = this.getOwnerComponent().getModel("lastMessage");
			this.getView().setModel(oLastMessageModel);
		}
	});
});

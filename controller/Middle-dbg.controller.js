/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";
	return Controller.extend("sap.fin.travel.lib.reuse.controller.Middle", {
		onInit: function() {
			//var oMiddlePageContainer = this.getView().byId("middlePageComponent");
			/*this.oGenericObjectPageComponent = this.getOwnerComponent().getMainController().getObjectPage();
			oMiddlePageContainer.setPropagateModel(true);
			oMiddlePageContainer.setComponent(this.oGenericObjectPageComponent);
			*/
		},
		
		onPress: function (evt) {
			//MessageToast.show(evt.getSource().getId() + " Pressed");
			/*var oMiddlePageContainer = this.getView().byId("middlePageComponent");
			var oMiddlePageContainer2 = this.getView().byId("middlePage2Component");
			oMiddlePageContainer.setPropagateModel(true);
			oMiddlePageContainer2.setPropagateModel(true);
			oMiddlePageContainer.setComponent(this.getOwnerComponent().getMainController().getObjectPage1());
			oMiddlePageContainer2.setComponent(this.getOwnerComponent().getMainController().getObjectPage2());*/
		}
	});
});

/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/fin/travel/lib/reuse/util/AppComponent"
], function(Controller,AppComponent) {
	"use strict";
	return Controller.extend("sap.fin.travel.lib.reuse.controller.Begin", {
		onInit: function() {
			var oBeginPageContainer = this.getView().byId("beginPageComponent");
			this.oGenericListPageComponent = AppComponent.get().getRootComponent();
			this.oGenericListPageComponent.then(function (res){
				oBeginPageContainer.setPropagateModel(true);
			oBeginPageContainer.setComponent(res);	
			});
			
			
			jQuery.noop();
		}
	});
});

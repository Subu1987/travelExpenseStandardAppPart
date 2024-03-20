/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/mvc/Controller", "sap/fin/travel/lib/reuse/util/AppComponent"], function(C, A) {
	"use strict";
	return C.extend("sap.fin.travel.lib.reuse.controller.Begin", {
		onInit: function() {
			var b = this.getView().byId("beginPageComponent");
			this.oGenericListPageComponent = A.get().getRootComponent();
			this.oGenericListPageComponent.then(function(r) {
				b.setPropagateModel(true);
				b.setComponent(r);
			});
			jQuery.noop();
		}
	});
});
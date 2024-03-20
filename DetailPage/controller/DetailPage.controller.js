/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/mvc/Controller", "sap/fin/travel/lib/reuse/util/AnnotationHelper", "sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/fin/travel/lib/reuse/util/AppContextHandler", "sap/fin/travel/lib/reuse/util/FragmentHelper"
], function(C, A, M, a, F) {
	"use strict";
	return C.extend("sap.fin.travel.lib.reuse.DetailPage.controller.DetailPage", {
		onInit: function() {
			$.noop();
		},
		onAfterRendering: function() {
			F.get().loadFragment({
				id: "TravelMessagePopoverFragmentID",
				name: "sap.fin.travel.lib.reuse.view.fragments.MessagePopover",
				models: {
					i18n: this.getView().getModel("i18n"),
					message: this.getView().getModel("message")
				}
			});
		},
		_getBreadcrumbs: function() {
			if (this.getView() === undefined) {
				return;
			}
			var b = this.getView().getContent()[0].getHeaderTitle().getBreadcrumbs();
			return b;
		},
		_setBreadcrumbs: function(e) {
			var b = e.slice();
			var B = this._getBreadcrumbs();
			if (B === undefined) {
				return;
			}
			B.removeAllLinks();
			var l = b.pop();
			var t = this;
			b.forEach(function(i) {
				var m = t.getView().getModel().getMetaModel();
				var E = m.getODataEntitySet(i);
				var s = E && E.entityType;
				var o = m.createBindingContext(m.getODataEntitySet(i, true));
				var c = m.createBindingContext(m.getODataEntityType(s, true));
				var T = c.getProperty("com.sap.vocabularies.UI.v1.HeaderInfo/Title/Value");
				var d = c.getProperty("com.sap.vocabularies.UI.v1.HeaderInfo/TypeName");
				var f = A.buildBreadCrumbExpression(c, T, d);
				if (t.extendP13nBreadCrumbExpression && typeof t.extendP13nBreadCrumbExpression === "function") {
					f = t.extendP13nBreadCrumbExpression({
						entitySet: l,
						breadcrumbFor: i,
						breadcrumbs: b,
						entityTypeContext: c,
						keyTitle: T,
						typeName: d,
						currentExpression: f,
						i: arguments[1]
					});
				}
				var L = new sap.m.Link({
					text: f,
					visible: "{= ${_global>/fcl/isFullScreen}}",
					press: t._eventHandler.onBreadCrumbUrlPressed
				});
				B.addLink(L);
			});
		},
		adjustDynamicValues: function(e) {
			this._setBreadcrumbs(e);
		}
	});
});
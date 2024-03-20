/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/fin/travel/lib/reuse/util/AnnotationHelper",
	"sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/fin/travel/lib/reuse/util/AppContextHandler",
	"sap/fin/travel/lib/reuse/util/FragmentHelper"
], function (Controller, AnnotationHelper, MessageUtil, AppContextHandler, FragmentHelper) {
	"use strict";

	return Controller.extend("sap.fin.travel.lib.reuse.DetailPage.controller.DetailPage", {

		onInit: function () {
			$.noop();
		},

		onAfterRendering: function () {
			FragmentHelper.get().loadFragment({
				id: "TravelMessagePopoverFragmentID",
				name: "sap.fin.travel.lib.reuse.view.fragments.MessagePopover",
				models: {
					i18n: this.getView().getModel("i18n"),
					message: this.getView().getModel("message")
				}
			});
		},

		_getBreadcrumbs: function () {
			//breadcrumb is located in header, which is located in a page which is the first element of the view
			if (this.getView() === undefined) {
				return;
			}
			var oBreadcrumbs = this.getView().getContent()[0].getHeaderTitle().getBreadcrumbs();
			return oBreadcrumbs;
		},

		/*
				_getODataModelForEntity: function (sEntitySet) {

					var oMetaModel = this.getView().getModel().getMetaModel();
					var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
					var sEntityType = oEntitySet && oEntitySet.entityType;
					if (!sEntityType) {
						return null;
					}
					var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(sEntitySet, true));
					var oEntityTypeContext = oMetaModel.createBindingContext(oMetaModel.getODataEntityType(sEntityType, true));
				},*/

		/**
		 * Depending on actual level of the DetailPage, we need to adjust the bread crumbs
		 *
		 * @parameter{array} aEntitySets is an array of string which contains the different entity set names (for example: TravelExpenses, Destinations, CostAssignments)
		 */
		_setBreadcrumbs: function (aEntitySets) {
			var aBreadcrumbs = aEntitySets.slice(); //clone array

			var oBreadcrumbs = this._getBreadcrumbs();
			if (oBreadcrumbs === undefined) {
				return;
			}
			//remove all links
			oBreadcrumbs.removeAllLinks();
			//recreate links
			var sLastEntity = aBreadcrumbs.pop(); //no breadcrumb for the last entity
			var that = this;
			aBreadcrumbs.forEach(function (item) {
				var oMetaModel = that.getView().getModel().getMetaModel();
				var oEntitySet = oMetaModel.getODataEntitySet(item);
				var sEntityType = oEntitySet && oEntitySet.entityType;
				var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(item, true));
				var oEntityTypeContext = oMetaModel.createBindingContext(oMetaModel.getODataEntityType(sEntityType, true));

				var oTitle = oEntityTypeContext.getProperty("com.sap.vocabularies.UI.v1.HeaderInfo/Title/Value");
				var oTypeName = oEntityTypeContext.getProperty("com.sap.vocabularies.UI.v1.HeaderInfo/TypeName");

				var sBreadCrumbExpression = AnnotationHelper.buildBreadCrumbExpression(oEntityTypeContext, oTitle, oTypeName);

				if (that.extendP13nBreadCrumbExpression && typeof that.extendP13nBreadCrumbExpression === "function") {
					sBreadCrumbExpression = that.extendP13nBreadCrumbExpression({
						entitySet: sLastEntity,
						breadcrumbFor: item,
						breadcrumbs: aBreadcrumbs,
						entityTypeContext: oEntityTypeContext,
						keyTitle: oTitle,
						typeName: oTypeName,
						currentExpression: sBreadCrumbExpression,
						i: arguments[1]
					});
				}

				var oLink = new sap.m.Link({
					text: sBreadCrumbExpression,
					visible: "{= ${_global>/fcl/isFullScreen}}",
					press: that._eventHandler.onBreadCrumbUrlPressed
				});

				oBreadcrumbs.addLink(oLink);
			});

		},

		/**
		 * Triggers internal logic to adjust breadcrumbs, shell navigation, etc.
		 * @parameter{array} aEntitySets is an array of string containing the different entity type names.
		 */
		adjustDynamicValues: function (aEntitySets) {
			this._setBreadcrumbs(aEntitySets);
		}

	});
});

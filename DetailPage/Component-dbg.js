/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/fin/travel/lib/reuse/util/BaseComponentHandler",
	"sap/fin/travel/lib/reuse/util/i18n"

], function (UIComponent, BaseComponentHandler, I18n) {
	"use strict";

	return UIComponent.extend("sap.fin.travel.lib.reuse.DetailPage.Component", {

		metadata: {
			manifest: "json", //Attention, fake usage for the build!!
			config: {
				fullWidth: true
			}
		},

		init: function () {
			//Calling private method activate for component instance to make sure that extension points are
			//loaded from URL-defined manifest
			try{
				//Customizing configuration no longer available above ui5 1.97.
				//If we are using [] within require, we do not control/understand the callback fn that were not called sometimes
				//If we are using solely the no array version, the CustomizingConfiguration was never loaded
				//This will dump in ui5 gt than 1.97, and we provide defensive code if for some reason the module is not loaded
				sap.ui.require(["sap/ui/core/CustomizingConfiguration"]);
				var CustomizingConfiguration= sap.ui.require("sap/ui/core/CustomizingConfiguration");
				if (undefined !== CustomizingConfiguration){
					CustomizingConfiguration.activateForComponentInstance(this);
				}
			} catch (e){
				jQuery.sap.log.warning("Customizing Configuration no longer available above ui5 1.97");
			}
			//this.getMetadata()._oManifest.init();
			// Set data model
			this.setModel(this.getComponentData().oModel);
			this.oRouter = this.getComponentData().oRouter;
			this.oAppManifest = this.getComponentData().oAppManifest;
			this.sEntitySet = this.getComponentData().sEntitySet;
			//XXX breadcrumbs should remain in the model!! component can be used at different levels
			this.aBreadCrumb = this.getComponentData().aBreadCrumb;
			this.oExtension = this.getComponentData().extension;

			//i18n default should be provided through the manifest (../i18n/i18n.properties)
			var oAppResourceBundle = this.getComponentData().oAppResourceBundle;
			var o18model = this.getModel("i18n");
			if (oAppResourceBundle) {
				oAppResourceBundle.aPropertyFiles[0].getKeys().forEach(function (key) {
					o18model.getResourceBundle().aPropertyFiles[0].setProperty(key, oAppResourceBundle.getText(key));
				});
			}

			// Call the init function of the parent
			UIComponent.prototype.init.apply(this, arguments);
		},

		// Called every time a detail view is opened.
		createContent: function () {
			var that = this;
			var sStableId = this.createId(this.sEntitySet);

			var oSettings = {
				extension: this.oExtension,
				entitySet: this.sEntitySet,
				controller: {
					name: "sap.fin.travel.lib.reuse.DetailPage.controller.DetailPage"
				},
				view: {
					id: sStableId,
					name: "sap.fin.travel.lib.reuse.DetailPage.view.DetailPage",
					level: 0
				}
			};

			// The view container is returned to the caller and will be cached. It contains our created view.
			this.oViewContainer = new sap.m.Page(this.createId("detailPage"), {
				showHeader: false
			});


			this.promiseComponentCreated = new Promise(function (resolve, reject) {
				that.getModel().getMetaModel().loaded().then(function () {
					BaseComponentHandler.createComponentContent(that, oSettings);
					resolve(that);
				});
			}).catch(function (error) {
				$.sap.log.error("Could not create component content : " + error);
			});
			return this.oViewContainer;
		},

		exit: function () {
			if (this.oViewContainer) {
				this.oViewContainer.destroy();
				delete this.oViewContainer;
			}
		}

	});
});

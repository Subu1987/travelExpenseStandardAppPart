/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
jQuery.sap.registerModulePath('CryptoJS', jQuery.sap.getModulePath("sap/fin/travel/lib/reuse") + '/thirdparty/CryptoJS/sha1');

sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/core/mvc/ViewType",
	"sap/fin/travel/lib/reuse/util/FCLayoutHandler",
	"sap/fin/travel/lib/reuse/util/EventHandler",
	"sap/fin/travel/lib/reuse/util/FormatHandler",
	"sap/fin/travel/lib/reuse/util/AnnotationHelper",
	"sap/fin/travel/lib/reuse/util/ConfigurationUtil",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/TravelUtil",
	"sap/fin/travel/lib/reuse/util/AppComponent",
	"sap/fin/travel/lib/reuse/util/StableIdDefinition",
	"sap/fin/travel/lib/reuse/util/StableIdHelper",
	"sap/fin/travel/lib/reuse/util/AppDescriptorUtil",
	"CryptoJS"
], function (BaseObject, ViewType, FCLayoutHandler, EventHandler, FormatHandler, AnnotationHelper, ConfigurationUtil, Utils, TravelUtil,
	AppComponent, StableIdDefinition, StableIdHelper, AppDescriptorUtil, CryptoJS) {
	"use strict";

	function getBreadCrumbInfo(aBreadCrumb) {
		if (Utils.isEmptyObjectOrString(aBreadCrumb)) {
			return undefined;
		}
		var aSections = aBreadCrumb;
		// remove the last one - this is the current shown section
		aSections.pop();
		var sPath = "";
		var delimiter = "";
		var aRet = [];
		for (var i = 0; i < aSections.length; i++) {
			sPath = sPath + delimiter + aSections[i];
			aRet.push(sPath);
			delimiter = "/";
		}
		return aRet;
	}

	/**
	 * Cache key is fundamental to ensure that views are properly regenerated when context change.
	 * Context can be: application (standard MTE or MTR, but other apps depending on customer enhancements), reuse version, and more specifically metadata version (views are generated given metadata mostly). 
	 * 
	 * The algorithm to detect metadata change is currently a simple sha1sum on service metadata json. This is not the best (there are several versions of json for a same service metadata for no reason. For example with or without namespace info), but this already provide perf enhancement (factor 3) for matched cache entries.
	 */
	function computeCacheKey(oComponent, oAppComponent) {
		var sServiceMetadataHash = CryptoJS.SHA1(JSON.stringify(oComponent.getModel().getServiceMetadata())).toString();
		var sAppId = oAppComponent.getId();
		var sAppCompVersion = oAppComponent.getManifestEntry("sap.app").applicationVersion.version;
		var sLibraryVersion = sap.ui.getCore().getLoadedLibraries()["sap.fin.travel.lib.reuse"];
		sLibraryVersion = sLibraryVersion && sLibraryVersion.version;
		var sCacheKey = sLibraryVersion + "-" + sAppId + "-" + sAppCompVersion + "-" + sServiceMetadataHash;
		return sCacheKey;
	}

	function getCacheKey() {
		return sApplicationCacheKey;
	}

	var BaseComponentHandler = BaseObject.extend("sap.fin.travel.lib.reuse.util.BaseComponentHandler");
	//var sEntitySet = "TravelRequests";

	/**
	 * Destroy should be called when leaving out an application to ensure that application cache key is properly refreshed afterwards
	 */
	BaseComponentHandler.destroy = function () {
		sApplicationCacheKey = undefined;
	};

	var sApplicationCacheKey = undefined;

	BaseComponentHandler.createComponentContent = function (oComponent, oSettings) {

		if (undefined === sApplicationCacheKey) {
			//the hash is used to properly handle view cache keys. We need to load it once.
			sApplicationCacheKey = computeCacheKey(oComponent, oComponent.getComponentData().oAppComponent);
		}

		var oMetaModel = oComponent.getModel().getMetaModel();
		var oEntitySet = oMetaModel.getODataEntitySet(oSettings.entitySet);
		var sEntityType = oEntitySet && oEntitySet.entityType;
		var sStableId = oSettings && oSettings.view && oSettings.view.id;
		if (!sEntityType) {
			return null;
		}
		var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(oSettings.entitySet, true));
		var oEntityTypeContext = oMetaModel.createBindingContext(oMetaModel.getODataEntityType(sEntityType, true));
		oComponent.setModel(new sap.ui.model.json.JSONModel(oSettings.view), "view");

		if (!oComponent.getAppComponent && oComponent.getComponentData().oAppComponent) {
			oComponent.getAppComponent = function () {
				return oComponent.getComponentData().oAppComponent;
			};
		}

		//The promise generates the view in a component's context then render the view.
		oComponent.promiseViewProcessed = new Promise(function (resolve, reject) {
			oComponent.runAsOwner(function () {
				var oController = BaseComponentHandler.createBaseController(oSettings.controller.name);
				var oPreprocessors = {
					xml: {
						bindingContexts: {
							entitySet: oEntitySetContext,
							entityType: oEntityTypeContext
						},
						models: {
							entitySet: oMetaModel,
							entityType: oMetaModel,
							parameter: BaseComponentHandler.createParameterModel(oComponent, sEntityType, oMetaModel, oSettings.entitySet)
						}
					}
				};

				//caching key - if reuse version of application version changes, we can invalidate existing views

				var sCacheKey = getCacheKey();
				oController.oPreprocessors = oPreprocessors;
				var oViewSettings = {
					async: true,
					preprocessors: oPreprocessors,
					id: sStableId,
					type: ViewType.XML,
					viewName: oSettings.view.name,
					height: "100%",
					controller: oController,
					cache: {
						keys: [sCacheKey]
					}
				};

				//extension
				oController.extension = oSettings.extension;

				var oView = sap.ui.view(oViewSettings);
				oComponent.oViewContainer.addContent(oView);
				oView.attachAfterInit(function () {
					resolve(oController);
				});

			});
		});

	};

	BaseComponentHandler.createBaseController = function (sControllerName) {
		//Extension: to make sure that a controller is in the SAP UI5's registry, one can use the following three lines to load the controller's implementation.
		//jQuery.sap.require({modName: sControllerName, type: "controller"});
		//var controllerImpl = jQuery.sap.getObject(sControllerName);
		//sap.ui.controller(sControllerName, controllerImpl); //no extension

		var oBaseController = sap.ui.controller(sControllerName);
		var fclHandler = new FCLayoutHandler(oBaseController);
		var eventHandler = new EventHandler(oBaseController);
		var formatHandler = new FormatHandler(oBaseController);

		oBaseController._fclHandler = {};
		oBaseController._eventHandler = {};
		oBaseController._formatHandler = {};
		jQuery.extend(oBaseController._fclHandler, fclHandler);
		jQuery.extend(oBaseController._eventHandler, eventHandler);
		jQuery.extend(oBaseController._formatHandler, formatHandler);

		oBaseController.getEventHandler = function () {
			return oBaseController._eventHandler;
		};

		return oBaseController;
	};

	BaseComponentHandler.createParameterModel = function (oComponent, sEntityType, oMetaModel, sEntitySet) {
		var oSettings = {
			pages: [],
			settings: []
		};
		//sap.fin.travel.lib.reuse
		AnnotationHelper.listAppPages(AppComponent.get().getConfig(), oSettings);
		return new sap.ui.model.json.JSONModel({
			entitySet: sEntitySet,
			entityType: sEntityType,
			appManifest: oComponent.oAppManifest.hasOwnProperty("sap.ui.generic.app") ? oComponent.oAppManifest : oComponent.oAppDescriptor,
			manifest: oComponent.getManifest(),
			extensionFacets: AppDescriptorUtil.prepareAfterFacet(oComponent.getManifest()),
			pages: oSettings.pages,
			settings: oSettings.settings,
			metaModel: oMetaModel,
			appComponentName: oComponent.getMetadata().getComponentName(),
			configuration: ConfigurationUtil.checkVersion(),
			helper: {
				bool: {
					"true": true,
					"false": false
				}
			},
			stableId: {
				definition: StableIdDefinition,
				aParameter: [],
				getStableId: StableIdHelper.getStableId
			},
			//valid only for ObjectPages. It's null in case of ListPage
			//breadCrumb: getBreadCrumbInfo(oComponent.aBreadCrumb),
			defaultButtons: TravelUtil.DefaultButtons
		});
	};

	return BaseComponentHandler;

}, true);

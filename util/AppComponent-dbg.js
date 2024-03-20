/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/model/Context",
	"sap/fin/travel/lib/reuse/util/FCLayoutUtil",
	"sap/f/routing/Router",
	"sap/fin/travel/lib/reuse/model/models",
	"sap/fin/travel/lib/reuse/util/PaginatorHelper",
	"sap/fin/travel/lib/reuse/util/NavigationUtil",
	"sap/ui/core/routing/HashChanger",
	"sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/fin/travel/lib/reuse/util/ODataModelUtil",
	"sap/fin/travel/lib/reuse/util/ShellUtil",
	"sap/fin/travel/lib/reuse/util/FragmentHelper",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/TravelUtil",
	"sap/fin/travel/lib/reuse/util/AppDescriptorUtil",
	"sap/fin/travel/lib/reuse/util/StateUtil",
	"sap/fin/travel/lib/reuse/util/BusyHelper"
], function (Context, FCLayoutUtil, Router, models, PaginatorHelper, NavigationUtil, HashChanger, MessageUtil,
	I18n, ODataModelUtil, ShellUtil, FragmentHelper, Utils, TravelUtil, AppDescriptorUtil, StateUtil, BusyHelper) {
	"use strict";

	var _oComponent;
	var _oSettings;
	var _oModel;

	/**
	 * There is one component per entityType.
	 * This map contains all the generated components.
	 * Key: name of the entity (for example, sap.fin.travel.mytravelrequestsv2.ListReport.TravelRequests)
	 * Value: component
	 */
	var mComponentInstances = new Map();
	var mComponentInstancesLock = new Map();
	/**
	 * Hold the deepest component's level (which is filled when parsing the manifest).
	 * It means 0 for the ListPage, 1 for the first obejct page, 2 for the sub-entity, etc.
	 */
	var iComponentDeepestLevel = 0;
	/**
	 * There is one component per entityType.
	 * This map contains all the generated components configuration.
	 * Key: name of the entity (for example, sap.fin.travel.mytravelrequestsv2.ListReport.TravelRequests)
	 * Value: contains object {id: string, pattern: string, level: integer, entity:string, resolve:function}
	 */
	var mComponentInstancesConf = new Map();
	var _oConfig;
	var oRouter;

	//boolean to know if app has been destroyed
	var bDestroyed;

	function pagesMap2Array(input) {
		var output = Object.keys(input).map(function (key) {
			var page = input[key];
			//add the key to the array for reference
			//page["id"] = key;
			//Recursive call for nested pages
			if (page.pages) {
				page.pages = pagesMap2Array(page.pages);
			}
			return input[key];
		});
		return output;
	}

	/**
	 * Taken from FE
	 *
	 * @return oConfig: this is a recursive array containing pages configuration from manifest.
	 * There is supposed to have only one page for the first level.
	 * Then, each sub-level might contains several pages.
	 * Structure is as follow:
	 * {component:{name string, entitySet string, navigationProperty? string, pages* component}
	 */
	function getConfig() {
		if (!_oConfig) {
			//We are currently reading manifest entries belonging to Fiori Element in sap.ui.generic.app.
			//If Fiori Element changes its structure definition, we might consider using our own setting file
			//or request an official manifest schema definition for entry 'sap.fin.travel.lib.reuse'
			if (_oSettings && _oSettings.hasOwnProperty("appDescriptor") && _oSettings.appDescriptor["sap.ui.generic.app"] != undefined) {
				// app descriptor is extenalized
				_oConfig = _oSettings.appDescriptor["sap.ui.generic.app"];
				// merge with the extended settings
				_oConfig = _oComponent.getManifestEntry("sap.ui.generic.app") != undefined ? AppDescriptorUtil.mergeDescriptors(_oConfig, _oComponent
					.getManifestEntry("sap.ui.generic.app")) : _oConfig;
			} else {
				// app descriptor is integrated
				_oConfig = _oComponent.getManifestEntry("sap.ui.generic.app");
			}
		}
		return _oConfig;
	}

	/**
	 * Wrapper to call sap.ui.component given the provided arguments.
	 * There is a convention for ListPage or DetailPage manifest url.
	 * ListPage manifest shall be called ListPage.manifest.json in the application
	 * DetailPage manifest shall be called Detail.manifest.json in the application
	 *
	 * @param {string} sComponentName Name of the component
	 * @param {string} sEntitySet entitySet name
	 * @param {array} aBreadCrumb
	 * @param {sId} Component id
	 */
	function createComponent(sComponentName, sEntitySet, oShell, aBreadCrumb, sId) {

		var oManifest;
		if (!Utils.isEmptyObjectOrString(_oSettings.manifest)) {
			if ("sap.fin.travel.lib.reuse.ListPage" === sComponentName) {
				oManifest = _oSettings.manifest.ListPage;
			} else if ("sap.fin.travel.lib.reuse.DetailPage" === sComponentName) {
				oManifest = _oSettings.manifest.DetailPage;
			}

			// Enrich the app descriptor extensions with extended entries
			var parentAppDescriptor = oManifest["sap.ui5"];
			var extAppDescriptor = _oComponent.getManifestEntry("sap.ui5");
			if (parentAppDescriptor) {
				if (extAppDescriptor.hasOwnProperty("extends")) {
					parentAppDescriptor.extends = parentAppDescriptor.extends || {};
					AppDescriptorUtil.overrideControllers(extAppDescriptor);
					parentAppDescriptor.extends = AppDescriptorUtil.mergeDescriptors(parentAppDescriptor.extends, extAppDescriptor.extends);
				}
			}
		} else {
			var sManifestUrl = jQuery.sap.getModulePath(_oSettings.manifestPath) + "/";
			if ("sap.fin.travel.lib.reuse.ListPage" === sComponentName) {
				sManifestUrl += "ListPage.manifest.json";
			} else if ("sap.fin.travel.lib.reuse.DetailPage" === sComponentName) {
				sManifestUrl += "DetailPage.manifest.json";
			}
			oManifest = sManifestUrl;
		}

		var comp = sap.ui.component({
			name: sComponentName,
			manifest: oManifest, //manifest json object, or for compatibility mode an URL to load the manifest from
			componentData: {
				oModel: _oModel,
				oRouter: oRouter,
				oAppDescriptor: _oSettings.appDescriptor,
				oAppManifest: _oComponent.getMetadata().getManifest(),
				oAppComponent: _oComponent,
				sEntitySet: sEntitySet,
				oShell: oShell,
				aBreadCrumb: aBreadCrumb,
				oAppResourceBundle: _oComponent.getResourceBundle(),
				extension: _oSettings.extension
			},
			id: sId
		});

		return comp;
	}

	/**
	 * This function creates a Promise which create a component corresponding to the provided config page.
	 * It creates the component for the given level
	 *
	 * @param {object} oPage: a page setting coming from the config
	 * @param {integer} iLevel: depth level which is propagated in the component
	 * @param {string} sPattern: URL path pattern which is propagated in the component
	 * @param {array} aBreadCrumb: Breadcrumb array that is propagated in the component
	 *
	 * @return {object} {id: string, pattern: string, level: integer, entity:string, resolve:function rturning a Promise}
	 *
	 */
	function doCreateComponent2(oPage, iLevel, sPattern, aBreadCrumb) {

		var sId = oPage.component.name + "." + oPage.entitySet;
		iComponentDeepestLevel = iComponentDeepestLevel < iLevel ? iLevel : iComponentDeepestLevel;

		var fnResolve = function (resolve) {
			var idm = oPage.component.name + "." + oPage.entitySet;
			if (jQuery.sap.log.Level.DEBUG === jQuery.sap.log.getLevel()){
				jQuery.sap.measure.start(idm, "Measurement of " + idm);
				//var t0 = performance.now();
			}
			
			var component = createComponent(oPage.component.name, oPage.entitySet, oPage.routingSpec, aBreadCrumb, sId);
			if (jQuery.sap.log.Level.DEBUG === jQuery.sap.log.getLevel()){
				//var t1 = performance.now();
				//jQuery.sap.log.info("Component created;" + component.getId() + ";" + iLevel + ";" + (t1 - t0) + " milliseconds.");
				jQuery.sap.measure.end(idm);
			}

			return component;
			/*component.then(function(oComponent) {
				resolve({
					component: oComponent,
					level: iLevel,
					pattern: sPattern
				});
			});*/
		};
		return {
			id: sId,
			pattern: sPattern,
			level: iLevel,
			entity: oPage.entitySet,
			resolve: fnResolve
		};

		//return new Promise(fnResolve);
	}

	/**
	 * This function process pages for a config. If no config is given, we retrieve the default config from the manifest.
	 * For each page in the config, we do create a promise that will resolve the component, and add the promise to the internal list.
	 * The different components are resolved recursively by calling doProcessPages for all subpages.
	 * The order is to first create the component, then trigger creation of all subordonate components, then resolve the promise with the created component as result.
	 *
	 * @param {object} oConfig: empty object, or a config structured with pages and component settings.
	 * @param {integer} iLevel: depth level. By default, the value corresponds to he begin column layout view level of the FlexibleColumnLayout (0)
	 * @param {string} sParentPattern: URL path pattern of the parent object. For instance, level 0 is an empty string, and others are the entitySet name along with pattern "keys1" for level 1 for example/
	 * @param {array} aParentBreadCrumb: Default is an empty array. Otherwise, it's filled with navigation property or entitySet name
	 *
	 * @return mComponentInstancesConf array containing the different component promises is returned.
	 *  */
	function _doProcessConfig(oConfig, iLevel, sParentPattern, aParentBreadCrumb) {
		if (jQuery.sap.log.Level.DEBUG === jQuery.sap.log.getLevel()){
			jQuery.sap.measure.setActive(true);
			jQuery.sap.measure.start("fi-fio-tv-component-creation", "Creation of the different promise's component for the application");
		}
		//contain list of all component's promises.

		oConfig = oConfig || getConfig();
		if (Utils.isEmptyObjectOrString(oConfig.pages)) {
			return [];
		}
		aParentBreadCrumb = aParentBreadCrumb || [];
		iLevel = iLevel || FCLayoutUtil.layout.beginColumn.level;
		sParentPattern = sParentPattern || "";

		$.each(oConfig.pages, function (i, e) {
			var sPattern = sParentPattern;
			var aBreadCrumb = Array.from(aParentBreadCrumb);
			if (iLevel > FCLayoutUtil.layout.beginColumn.level) {
				//sPattern = sParentPattern + "/" + e.entitySet + ":key:";
				//sPattern = sParentPattern + "/:bindPath:";
				sPattern = sParentPattern + "/" + e.entitySet + "({keys" + iLevel + "})"; //Can be aggregated with sParentPattern if we are able to match the context properly
				aBreadCrumb.push(e.navigationProperty || e.entitySet);
			} else if (iLevel === 0) { //save root component
				_oSettings.rootComponent = _oSettings.rootComponent || e.component && e.component.name && e.component.name.concat(".", e.entitySet);
			}

			var oRes = doCreateComponent2(e, iLevel, sPattern, aBreadCrumb);
			if (mComponentInstancesConf.has(oRes.id)) {
				mComponentInstancesConf.get(oRes.id).routes.push({
					level: oRes.level,
					pattern: oRes.pattern
				});
			} else {
				mComponentInstancesConf.set(oRes.id, {
					id: oRes.id,
					routes: [{
						level: oRes.level,
						pattern: oRes.pattern
					}],
					entity: oRes.entity,
					resolve: oRes.resolve
				});
			}

			_doProcessConfig(e, iLevel + 1, sPattern, aBreadCrumb);
		});

		if (jQuery.sap.log.Level.DEBUG === jQuery.sap.log.getLevel()){
			jQuery.sap.measure.end("fi-fio-tv-component-creation");
			jQuery.sap.measure.setActive(false);
		}
		return mComponentInstancesConf;
	}

	/**
	 * Provide first targets to the manually-handled router.
	 *
	 * It creates target for the different columns of the flexible column layout, and one for the generic notFound view.
	 */
	function _initRouter() {
		var sRootView = _oComponent.getId() + "---mainView";
		var res = {};
		res.targets = {
			list: {
				rootView: sRootView,
				viewName: "Begin",
				viewId: "BeginViewId",
				controlId: "fcl",
				controlAggregation: "beginColumnPages"
			},
			detail: {
				rootView: sRootView,
				viewName: "Middle",
				viewId: "MiddleViewId",
				controlId: "fcl",
				controlAggregation: "midColumnPages"
			},
			detaildetail: {
				rootView: sRootView,
				viewName: "DetailDetail",
				viewId: "EndViewId",
				controlId: "fcl",
				controlAggregation: "endColumnPages"
			},
			notFound: {
				rootView: sRootView,
				viewName: "NotFound",
				controlId: "fcl",
				controlAggregation: "midColumnPages" //, "endColumnPages"] //XXX not found can appear in midColumn or endColum depending on the level
			}
		};
		oRouter = new Router([], {
			async: true,
			controlId: "fcl",
			clearTarget: false,
			viewPath: "sap.fin.travel.lib.reuse.view",
			viewType: "XML",
			homeRoute: _oSettings.homeRoute
		}, _oComponent, []);
		oRouter.initialize(); //XXX bIgnoreInitialHash
		oRouter.getTargets().addTarget("list", res.targets.list);
		oRouter.getTargets().addTarget("detail", res.targets.detail);
		oRouter.getTargets().addTarget("detaildetail", res.targets.detaildetail);
		oRouter.getTargets().addTarget("notFound", res.targets.notFound);
	}

	/**
	 * Helper to retrieve view destination per depth level
	 */
	function getConfigFromLevel(iLevel) {
		var appId = _oComponent.getId();
		switch (iLevel) {
		case FCLayoutUtil.layout.beginColumn.level:
			return {
				target: ["list"],
				// layout: "OneColumn",
				viewId: "BeginViewId",
				container: appId + "---BeginViewId--beginPageComponent"
			};
		case FCLayoutUtil.layout.midColumn.level:
			return {
				target: ["list", "detail"],
				// layout: "TwoColumnsMidExpanded",
				viewId: "MiddleViewId",
				container: appId + "---MiddleViewId--middlePageComponent"
			};
		case FCLayoutUtil.layout.endColumn.level:
		default:
			//all components with depth >= 2 are put in the latest column
			return {
				target: ["list", "detail", "detaildetail"],
				// layout: "ThreeColumnsEndExpanded",
				viewId: "EndViewId",
				container: appId + "---EndViewId--detaildetailPageComponent"
			};

		}
	}

	// Determine path the component has to be bound to according to the event obtained from the router
	function fnDeterminePathFromRouteMatched(oEvent, sPattern) {
		var sPath, oKeys, sKey;
		if (sPattern) {
			sPath = sPattern;
		}
		if (!sPath) {
			return "";
		}
		if (sPath.indexOf("/") !== 0) {
			sPath = "/" + sPath;
		}
		oKeys = oEvent.getParameter("arguments");
		if (oKeys) {
			for (sKey in oKeys) {
				// replace each key in pattern with corresponding key in argument
				if (sKey !== "?query") {
					sPath = sPath.replace("{" + sKey + "}", oKeys[sKey]);
				}
			}
			return sPath;
		}
	}

	function fnComponentLoaded(conf, component, bindingPath) {
		//var oRouter = AppComponent.get().getRouter();
		var container = sap.ui.getCore().byId(conf.container);
		container.setPropagateModel(true);
		//var oInstance = container.getComponentInstance();
		//container.setComponent(undefined);
		//if (oInstance !== undefined && null !== oInstance) {
		//oInstance.unbindObject();

		//		}
		jQuery.sap.log.info("Component loaded: bindingPath=" + bindingPath + ", current component=" + container.getComponent() +
			", destination compomnent=" + component.getId() + ", container id=" + conf.container);
		//ComponentContainer will host a different component type. We can undbind the model
		if (container && container.getComponent() !== component.getId()) {
			container.unbindElement();
		}

		StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);
		container.setComponent(component);
		container.setVisible(true);
		container.bindElement({
			path: bindingPath,
			events: {
				change: function (oEvent) {
					BusyHelper.hide();
					StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);
					if (!container.getBindingContext()) {
						container.setVisible(false);
						//oEvent.getSource().getDataState().getChanges().modelMessages.value[0].type
						//in case of error detection, we try to prevent the Message dialog opening (defaults for all failed requests)
						var fnCallback = function(oError){
							container.getModel("lastMessage").setProperty("/text", oError.message);	
							container.getModel("lastMessage").setProperty("/title", I18n.get().getText("ST_ERROR"));	
							FCLayoutUtil.get().setNavigationBackLayout(FCLayoutUtil.layout.endColumn.level);
							oRouter.getTargets().display("notFound");

							
						};
						MessageUtil.get().preventNextShowMessage(fnCallback);
					}
				},
				dataRequested: function (oEvent) {
					// container.setBusy(true);
					//We hide the container in all case, but if the last action was a side effect. 
					if (StateUtil.hasState(StateUtil.SUBMIT_ON_SIDEFFECT) && true === StateUtil.getState(StateUtil.SUBMIT_ON_SIDEFFECT)){
						BusyHelper.hide();
						StateUtil.resetState(StateUtil.SUBMIT_ON_SIDEFFECT);
					}else{
						BusyHelper.show();
					}
				},
				dataReceived: function (oEvent) {
					BusyHelper.hide();

				}
			}
		});
		ShellUtil.get().setHierarchy(component);
		ShellUtil.get().setTitle(component, FCLayoutUtil.get().isFullScreen());
	}

	/**
	 * Return a promise which returns the component as a result.
	 *
	 * GetComponent expects that components are already prepared to be loaded in mComponentInstances map.
	 * Upon request, if the component is already loaded it is directly resolved to the promise. Otherwise, the resolution function is launched to load the component.
	 * There is one and only one resolution function launched for a given component name.
	 *
	 * @param {string} sComponentName the name of the required component
	 *
	 */
	function fnGetComponent(sComponentName) {
		if (bDestroyed === true) {
			throw new Error("Application is destroyed. Components could no longer be loaded!");
		}

		if (!mComponentInstancesConf.has(sComponentName)) {
			throw new Error("Component is not prepared for loading!");
		}

		//oComp contains {id: string, pattern: string, level: integer, entity:string, resolve:function}
		var oComp = mComponentInstancesConf.get(sComponentName);

		var oPromise = new Promise(function (resolve) {
			var oResolvFunc = function (comp) {
				if (!mComponentInstances.has(sComponentName)) {
					mComponentInstances.set(sComponentName, comp);
				}
				resolve(comp);
			};
			if (mComponentInstances.has(sComponentName)) {
				resolve(mComponentInstances.get(sComponentName));
			} else if (mComponentInstancesLock.has(sComponentName)) {
				mComponentInstancesLock.get(sComponentName).then(oResolvFunc);
			} else {
				var oPromiseComp = Promise.resolve().then(oComp.resolve);
				mComponentInstancesLock.set(sComponentName, oPromiseComp);
				oPromiseComp.then(oResolvFunc);
			}
		});

		return oPromise;
	}

	/**
	 * Assumes that we are only looking for corresponding DetailPage component
	 *
	 * @return: Promise to the component
	 */
	function fnGetComponentFromName(sName) {
		var component = undefined;
		mComponentInstancesConf.forEach(function (v, k) {
			if (k.endsWith("DetailPage." + sName)) {
				component = fnGetComponent(v.id);
			}
		});
		if (undefined === component) {
			throw new Error("Could not retrieve component from its name '" + sName + "'. Could not complete");
		}
		return component;
	}

	/**
	 * Function to unbind element from container.
	 * @param {int} iLevel: depth level from which we unbind elements. For instance, iLevel === 1 (first ObjectPage), we unbind elements from components/containers of depth 2, 3, 4, etc. (if they have been loaded))
	 *
	 */
	function _fnUnbindContainer(iLevel) {
		var actualLevelConf = getConfigFromLevel(iLevel);
		//jQuery.sap.log.setLevel(jQuery.sap.log.Level.INFO);

		jQuery.sap.log.info("Unbind container: deepestLevel=" + iComponentDeepestLevel + ", iLevel=" + iLevel);
		for (var i = iLevel + 1; i <= iComponentDeepestLevel; ++i) {
			var conf = getConfigFromLevel(i);
			var container = conf && sap.ui.getCore().byId(conf.container);

			if (actualLevelConf.container === conf.container) {
				jQuery.sap.log.info("Unbind container is skipped at level=" + i + " for container=" + conf.container);
				//unbind once, then that's enough!
				//container.unbindElement();
				break;
			}
			if (container) {
				jQuery.sap.log.info("Unbind container for level=" + i + " for container=" + conf.container);
				container.unbindElement();
			}
		}
	}

	/**
	 * This function create a route entry for each of the component promise configuration previously read.
	 * It also attaches the route matched event handler to trigger navigation and component container rebinding.
	 *
	 * We do assume mComponentInstancesConf is properly loaded
	 *
	 */
	function _doConfigureRoutes() {
		//var t0 = performance.now();
		var that = this;

		//forcing adding leading slash that will be removed at first routing load
		if (HashChanger.getInstance().getHash() === ""){
			HashChanger.getInstance().replaceHash("/");
		}else if (HashChanger.getInstance().getHash().startsWith("/")){
			HashChanger.getInstance().replaceHash("/" + HashChanger.getInstance().getHash());
		}

		//For each promises, we get the component and store it in the component map.
		//Then, we create the route and attach a generic binding behaviour when route is matched.
		//For instance, /TravelRequests(Pernr='00181086',Tripno='0000019085') path will match the TravelRequests detail page. The component will get its context bound to this path.
		mComponentInstancesConf.forEach(function (compInstanceConfValue, compInstanceConfKey) {
			
			

			compInstanceConfValue.routes.forEach(function (v, k) {
				var conf = getConfigFromLevel(v.level);
				var sRouteName = v.pattern || compInstanceConfValue.id;
				oRouter.addRoute({
					name: sRouteName,
					pattern: v.pattern,
					target: conf.target,
					layout: conf.layout
				});

				//console.log("Adding route for pattern " + v.pattern);
				oRouter.getRoute(sRouteName).attachPatternMatched(function (
					oEvent) {

					//Backward navigation should be prevented if the destination trip is a newly created trip whereas there is none in the cluster.
					var sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
					var oCurrentTripContext = ODataModelUtil.get().getCurrentTripContext();
					var sDestinationTripNo = sHash.match(/Tripno='(\d+)'/) && sHash.match(/Tripno='(\d+)'/)[1];
					var sDestinationPernr = sHash.match(/Pernr='(\d+)'/) && sHash.match(/Pernr='(\d+)'/)[1];
					if (!Utils.isEmptyObjectOrString(oCurrentTripContext.BindingPath) && !Utils.isEmptyObjectOrString(sDestinationTripNo)) {
						//XXX if we are leaving an initial trip to another one, we might notify/warn the user. Currently, a hard redirection is performed
						//backward navigation with initial trip involved
						var sCurrentTripNo = oCurrentTripContext && oCurrentTripContext.Tripno;

						switch (sap.ui.core.routing.History
							.getInstance().getDirection()) {
						case sap.ui.core.routing.HistoryDirection.Backwards:
							if (!Utils.isEmptyObjectOrString(sDestinationTripNo) && !Utils.isEmptyObjectOrString(sCurrentTripNo) && TravelUtil.TripNumber
								.Initial !==
								//we are trying to navigate back to an initial trip. This is not possible.
								sCurrentTripNo && TravelUtil.TripNumber.Initial === sDestinationTripNo) {
								window.history.back(); //continue going back!!
								return;
							}
							break;

						case sap.ui.core.routing.HistoryDirection.Forwards:
							if (!Utils.isEmptyObjectOrString(sDestinationTripNo) && !Utils.isEmptyObjectOrString(sCurrentTripNo) && TravelUtil.TripNumber
								.Initial !==
								//we are trying to navigate back to an initial trip. This is not possible.
								sCurrentTripNo && TravelUtil.TripNumber.Initial === sDestinationTripNo) {
								window.history.forward(); //continue going forward!!
								return;
							}
							break;
						}

						//forward navigation with initial trip involved

						//invalidate trip header only if trip number are different to refresh it if we navigate to it
						var sContextTripNo = oCurrentTripContext.BindingPath.match(/Tripno='(\d+)'/) && oCurrentTripContext.BindingPath.match(
							/Tripno='(\d+)'/)[1];
						var aPath = [];
						if (sDestinationTripNo !== sContextTripNo) {
							var sDestinationTripContextPath = oCurrentTripContext.BindingPath.replace(/Tripno='\d+'/,
								"Tripno='" + sDestinationTripNo + "'");
							if (sDestinationTripNo !== TravelUtil.TripNumber.Initial){
								_oModel.invalidateEntry(sDestinationTripContextPath);
								Object.getOwnPropertyNames(_oModel.getObject("/")).filter(function (e) {
									if (e.indexOf("Tripno='" + sDestinationTripNo + "'") > -1) {
										_oModel.invalidateEntry("/" + e);
									}
								});
							}

							//invalidate initial entries only when trip was inital before.
							if (sContextTripNo === TravelUtil.TripNumber.Initial) {
								Object.getOwnPropertyNames(_oModel.getObject("/")).filter(function (e) {
									if (e.indexOf("Tripno='" + TravelUtil.TripNumber.Initial + "'") > -1) {
										_oModel.invalidateEntry("/" + e);
									}
								});
							}
						}
					}

					var path = fnDeterminePathFromRouteMatched(oEvent, v.pattern);
					//No need to change binding of the root view (corresponding to the ListPage)
					if (Utils.isEmptyObjectOrString(path)) {
						//trip context exists (pernr and tripno), we unlock the trip through an exit application
						if (!Utils.isEmptyObjectOrString(oCurrentTripContext.Pernr) && !Utils.isEmptyObjectOrString(oCurrentTripContext.Tripno)) {
							var listPageComponentPromise = fnGetComponent(_oSettings.rootComponent);
							listPageComponentPromise.then(function (comp) {
								comp.exitApplication();
							});
						}

						NavigationUtil.navigateToRoot();
						ShellUtil.get().clearShell();
						_fnUnbindContainer(0);
						return;
					}
					var bindPaths = NavigationUtil.bindingPaths(path).paths;
					var tripBindingPath = v.level === FCLayoutUtil.layout.beginColumn.level ? path : bindPaths[0];
					ODataModelUtil.get().saveCurrentTripContext({
						BindingPath: tripBindingPath
					});
					NavigationUtil.adjustLayout();
					//for each parent path, we determine if the component is present in the column and assign the binding context if necessary
					//XXX order of requests should be respected. Level 1 (Trvel request) before Level 2 (cost assignments for example)
					var aComponentPromisesConf = [];
					var aComponentPromises = [];

					$.each(bindPaths, function (j, bindingPath) {
						var level = j + 1;
						var conf = getConfigFromLevel(level);
						var component;
						if (level !== v.level) {
							var sName = /\/(\w+)\(/.exec(bindingPath);
							sName = sName && sName[1];
							if (Utils.isEmptyObjectOrString(sName)) {
								throw new Error("Could not determine component name. Could not complete");
							}
							component = fnGetComponentFromName(sName);
						} else {
							component = fnGetComponent(compInstanceConfValue.id);
						}

						aComponentPromisesConf.push({
							conf: conf,
							level: level,
							bindingPath: bindingPath
						});
						aComponentPromises.push(component);
					});
					//finalize component loading all at once (generation completed for the required components)
					Promise.all(aComponentPromises).then(function (aComponents) {
						var highestLevel;
						//ordered list of entity set (for example: TravelExpenses, Destinations, CostAssignments)
						var aEntitySet = aComponents.map(function (item) {
							return item.sEntitySet;
						});
						aComponents.forEach(function (comp, i) {
							var oConf = aComponentPromisesConf[i];
							highestLevel = highestLevel && highestLevel > oConf.level ? highestLevel : oConf.level;
							comp.promiseComponentCreated.then(function (oComp) {
								//Adjust dynamic values, ie level, breadcrumbs, shell navigation, etc.
								var oViewModel = oComp.getModel("view");
								oViewModel.setProperty("/level", oConf.level);
								comp.promiseViewProcessed.then(function (oController) {
									if (oController && oController.adjustDynamicValues && typeof oController.adjustDynamicValues === "function") {
										oController.adjustDynamicValues(aEntitySet);
									}
								});
								/*
								if (comp.getRootControl && typeof comp.getRootControl === "function") {
								  var aContentAggregation = comp.getRootControl().getAggregation("content");
								  if (aContentAggregation && aContentAggregation.length > 0) {
								    var oFirstView = aContentAggregation[0];
								    if (oFirstView && oFirstView.getController && typeof oFirstView.getController === "function") {
								      var oController = oFirstView.getController();
								      if (oController && oController.adjustDynamicValues && typeof oController.adjustDynamicValues === "function") {
								        oController.adjustDynamicValues(aEntitySet);
								      }
								    }
								  }
								}
								*/
								fnComponentLoaded(oConf.conf, oComp, oConf.bindingPath);
							});
						});
						//All required components are know being loaded/bound to the according component container.
						//We'd like to make sure that all other component containers (higher than the highest loaded and required container) are unbounded
						var iLevel = highestLevel;
						_fnUnbindContainer(iLevel);
					});

				}, that);

				if (compInstanceConfValue.id.indexOf("ListPage") != -1) {
					fnGetComponent(compInstanceConfValue.id).then(function(comp){
						//initial app component loaded, we set the initial layout and hash
						var sHash = HashChanger.getInstance().getHash();
						if (sHash === "/"){ //root
							FCLayoutUtil.get().setNavigationLayout("", 0, true);
							HashChanger.getInstance().replaceHash("");
						}else if (sHash.indexOf("/") === 0){
							HashChanger.getInstance().replaceHash(sHash.substring(1));
						}else {
							HashChanger.getInstance().replaceHash("/" + sHash);
						}
						
					}); //force loading
				}
			});
		});

	}

	/**
	 * AppComponent instance does initialize all components provided by the Reuse
	 */
	function createInstance(oComponent, oModel, oSettings) {
		bDestroyed = false;
		_oComponent = oComponent;
		_oModel = oModel;
		// In case of externalized app descriptor we simulate 'sap.ui.generic.app' entry
		oSettings.appDescriptor = {
			"sap.ui.generic.app": oSettings.appDescriptor
		};
		_oSettings = oSettings;

		oComponent.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
		oComponent.setModel(models.createDeviceModel(), "device");
		oComponent.setModel(models.createGlobalModel(oComponent), "_global");
		_initRouter();
		_doProcessConfig();
		_doConfigureRoutes();

		oComponent.oShellServicePromise =
			oComponent.getService("ShellUIService").catch(function () {
				jQuery.sap.log.warning("No ShellService available");
			});

		I18n.init(oComponent);
		_oModel.attachRequestFailed(function (oError) {
			var bFromRequestFailed = true;
			MessageUtil.get().showMessage(oError, bFromRequestFailed);
		});
		oComponent.setModel(new sap.ui.model.json.JSONModel({}), "lastMessage");

		function fnGetRouter() {
			return oRouter;
		}

		function fnGetShellService() {
			return oComponent.oShellServicePromise;
		}

		function fnUpdateGlobalModel(sPath, oValue) {
			var oGlobalModel = oComponent.getModel("_global");
			var oContext = new Context(oGlobalModel, "/");
			oGlobalModel.setProperty(sPath, oValue, oContext);
		}

		function fnGetGlobalModel() {
			return oComponent.getModel("_global");
		}

		function fnEagerLoad(iMillisecs) {
			var timeout = iMillisecs;
			var step = iMillisecs > 2000 ? iMillisecs - 1000 : 1000;

			mComponentInstancesConf.forEach(function (v, k) {
				//eager load the components with a bit of delay
				var s = new Date().getSeconds();
				setTimeout(function () {
					try {
						fnGetComponent(v.id); //force creating the component and loading all dependencies
					} catch (e) {
						$.sap.log.error("Component could not be loaded:" + e);
					}
				}, timeout);
				timeout = timeout + step;
			});
		}

		function fnGetModel() {
			return _oModel;
		}

		/**
		 * AppComponent destroy needs to make sure that no objects handled by the framework remain in memory.
		 * We do safely destroy the different objects to free IDs and reallow further app init
		 *
		 * Currently, it means:
		 * <ul>
		 * <li>free up the pointer to the application component</li>
		 * <li>free up settings that were passed as parameter</li>
		 * <li>free up the pointer to the OData model</li>
		 * <li>free up the config that was based from manifest</li>
		 * <li>destroy oRouter</li>
		 * <li>destroy each of the created components (ListPage, ObjectPages)</li>
		 * <li>free up internal maps to handle component loading</li>
		 * </ul>
		 *
		 * @param {function} fnCallback callback function for the ExitApplication function imports. It is executed in case of function import success or error.
		 * @return a Promise that destruction is complete
		 */
		function fnDestroy(fnCallback) {
			return new Promise(function (resolve) {
				var fnSuccessOrError = function () {
					_oComponent = null;
					_oSettings = null;
					_oModel = null;

					mComponentInstances.forEach(function (v, k) {
						v.destroy();
					});

					mComponentInstances = new Map();
					mComponentInstancesLock = new Map();
					mComponentInstancesConf = new Map();
					_oConfig = null;
					oRouter.destroy();
					oRouter = null;

					I18n.destroy();

					if (fnCallback && "function" === typeof fnCallback) {
						fnCallback(arguments);
					}
					resolve();
				};

				var listPageComponentPromise = fnGetComponent(_oSettings.rootComponent);
				//timing is important. We retrieve the component, then we indicate that it is destroyed.
				bDestroyed = true;
				listPageComponentPromise.then(function (comp) {
					comp.exitApplication({
						fnSuccess: fnSuccessOrError,
						fnError: fnSuccessOrError,
						bDestroy: true
					});
				});
			});

		}

		try{
			//Customizing configuration no longer available above ui5 1.97.
			//using synchronous require, but loading through asynchronous require... 
			//If we are using [] within require, we do not control/understand the callback fn that were not called sometimes
			//If we are using solely the no array version, the CustomizingConfiguration was never loaded
			//This will dump in ui5 gt than 1.97, and we provide defensive code if for some reason the module is not loaded
			sap.ui.require(["sap/ui/core/CustomizingConfiguration"]);
			var CustomizingConfiguration = sap.ui.require("sap/ui/core/CustomizingConfiguration");
			if (undefined !== CustomizingConfiguration){
				// monkey patch the sap.ui.core.CustomizingConfiguration#getControllerExtension:
				var fGetControllerExtension = CustomizingConfiguration.getControllerExtension;
				CustomizingConfiguration.getControllerExtension = function (sControllerName, vObject) {
					//var oComponent = fnGetComponent(vObject),
					//	sComponentId = oComponent && oComponent.getId(),
					/*if (sControllerName.startsWith("sap.fin.travel.lib.reuse.DetailPage")){
						//vObject= sControllerName;
						//Component id provided by vObject is the actual extension key in the DetailPage manifest
						//Controller name is too generic as all the different DetailPages do have the name sap.fin.travel.lib.reuse.DetailPage.controller.DetailPage
						sControllerName = vObject;
						jQuery.noop();
					}*/
					var oResultConfig = fGetControllerExtension.call(CustomizingConfiguration, sControllerName, vObject);
					return oResultConfig;
				};
			}
		} catch (e){
			jQuery.sap.log.warning("Customizing Configuration no longer available above ui5 1.97");
		}

		

		return {
			getConfig: getConfig,
			getRouter: fnGetRouter,
			getGlobalModel: fnGetGlobalModel,
			updateGlobalModel: fnUpdateGlobalModel,
			getAppModel: fnGetModel,
			getComponent: fnGetComponent,
			getRootComponent: function () {
				return fnGetComponent(_oSettings.rootComponent);
			},
			getShellService: fnGetShellService,
			destroy: fnDestroy,
			eagerLoad: fnEagerLoad,
			isDestroyed: function () {
				return bDestroyed;
			}
		};
	}

	var _oInstance;
	var _oDestroyPromise;

	return {

		get: function () {
			if (!_oInstance) {
				throw new Error("AppComponent has not been initialized yet.");
			}
			return _oInstance;
		},

		/*
		 * Init the AppComponent according to the giving private global model.
		 * One and only one instance shall be created.
		 */
		init: function (oComponent, oFCL, oModel, oSettings) {
			var fnInit = function () {
				_oInstance = createInstance(oComponent, oModel, oSettings);
				//init FCL layout looking first if app descriptor is externalized
				FCLayoutUtil.init(oFCL, _oInstance, getConfig());
				PaginatorHelper.init(_oInstance);
				ODataModelUtil.init(_oInstance);
				ShellUtil.init(_oInstance);

				/*
				var sHash = HashChanger.getInstance().getHash();
				if (sHash.indexOf("/") === 0) {
					sHash = sHash.slice(1);
				} else {
					sHash = "/".concat(sHash);
				}

				NavigationUtil.navigate(sHash);
				NavigationUtil.adjustLayout();
				*/

				//_oInstance.eagerLoad(5000);
			};
			//if a destroy is still in progress, wait a bit for the initialization
			if (_oDestroyPromise) {
				_oDestroyPromise.then(fnInit);
			} else {
				fnInit();
			}

		},

		destroy: function (fnCallback) {
			if (!_oInstance) {
				throw new Error("AppComponent has not been initialized yet.");
			}
			_oDestroyPromise = _oInstance.destroy(fnCallback);
			_oDestroyPromise.then(function () {
				//Destroy is real now, we can no longer use the created instance
				_oInstance = null;
				FCLayoutUtil.destroy();
				PaginatorHelper.destroy();
				ODataModelUtil.destroy();
				ShellUtil.destroy();
				FragmentHelper.destroy();
				_oDestroyPromise = null;
			});

		}
	};
}, true);

/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/formatters",
	"sap/fin/travel/lib/reuse/util/i18n"
], function (Formatters, I18n) {
	"use strict";

	var _oInstance;

	function createInstance(oAppComponent) {

		function fnSetHierarchy(oComponent) {
			var sLocation = location.hash;
			var currentHierarchy = oAppComponent.getGlobalModel().getProperty("/hierarchy/main").reverse();
			var oHierarchy = {
				title: oComponent.oComponentData.oShell && I18n.get().resolveText(oComponent.oComponentData.oShell.headerTitle),
				icon: oComponent.oComponentData.oShell && oComponent.oComponentData.oShell.typeImageUrl,
				subtitle: "",
				intent: sLocation
			};

			if (oComponent.getModel("view").getProperty("/level") > currentHierarchy.length) {
				currentHierarchy.push(oHierarchy);
			} else if (oComponent.getModel("view").getProperty("/level") < currentHierarchy.length) {
				currentHierarchy.pop();
			} else {
				currentHierarchy.pop();
				currentHierarchy.push(oHierarchy);
			}
			for (var i = 0; i < currentHierarchy.length; i++) {
				var aLocation = sLocation.split("/");
				var aIntent = aLocation.slice(0, aLocation.length - (oComponent.getModel("view").getProperty("/level") - (i + 1)));
				currentHierarchy[i].intent = decodeURI(aIntent.join("/"));
			}
			currentHierarchy = currentHierarchy.reverse();
			oAppComponent.getShellService().then(function (oService) {
				if (oService) {
					oService.setHierarchy(oAppComponent.getGlobalModel().getProperty("/hierarchy/main").concat(oAppComponent.getGlobalModel().getProperty(
						"/hierarchy/app")));
				}
			});
		}

		function fnClearHierarchy() {
			oAppComponent.getGlobalModel().setProperty("/hierarchy/main", []);
			oAppComponent.getShellService().then(function (oService) {
				if (oService) {
					oService.setHierarchy([]);
					oService.setTitle(I18n.get().resolveText(oAppComponent.getGlobalModel().getProperty("/share/appTitle")));
				}
			});
		}

		function fnSetTitle(oComponent, bIsFullScreen) {
			oAppComponent.getShellService().then(function (oService) {
				if (oService) {
					oService.setTitle(bIsFullScreen ? I18n.get().resolveText(oComponent.oComponentData.oShell.headerTitle) : I18n.get().resolveText(
						oAppComponent.getGlobalModel()
						.getProperty("/share/appTitle")));
				}
			});
		}

		function fnClearShell() {
			fnClearHierarchy();
		}

		return {
			setHierarchy: fnSetHierarchy,
			clearHierarchy: fnClearHierarchy,
			clearShell: fnClearShell,
			setTitle: fnSetTitle
		};
	}

	return {
		// variables
		get: function () {
			if (!_oInstance) {
				throw new Error("ShellUtil has not been initialized yet.");
			}
			return _oInstance;
		},

		/*
		 * Init the ShellUtil according to the giving AppComponent.
		 * One and only one instance shall be created.
		 */
		init: function (oAppComponent) {
			if (_oInstance) {
				this.destroy();
			}
			_oInstance = createInstance(oAppComponent);
		},

		destroy: function () {
			_oInstance = null;
		}

	};
}, true);

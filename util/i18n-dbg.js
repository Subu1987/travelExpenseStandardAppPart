/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/resource/ResourceModel"
], function (BaseObject, ResourceModel) {
	"use strict";

	var _oInstance;

	function createInstance(oAppComponent) {

		var _resourceModel;

		function fnGetResourceModel() {
			if (!_resourceModel) {
				_resourceModel = new ResourceModel({
					bundleName: "sap.fin.travel.lib.reuse.i18n.i18n",
					locale: sap.ui.getCore().getConfiguration().getLanguage()
				});
			}
			return _resourceModel;
		}

		function fnResolveText() {
			// First we are looking into the extended projet resource bundle
			if (oAppComponent.getResourceBundle() && oAppComponent.getResourceBundle().hasText(arguments[0])) {
				return oAppComponent.getResourceBundle().getText.apply(oAppComponent.getResourceBundle(), arguments);
			}
			// Finaly we are looking into the parent resource bundle
			var oParentResourceBundle = fnGetResourceModel().getResourceBundle();
			return oParentResourceBundle.getText.apply(oParentResourceBundle, arguments);
		}

		function fnGetText(oController) {
			// Check if oController context is provided.
			if (oController && typeof oController === "object") {
				var aArgs = Array.prototype.slice.call(arguments, 1);
				// First we are looking into the extended projet resource bundle
				if (oAppComponent.getResourceBundle() && oAppComponent.getResourceBundle().hasText(aArgs[0])) {
					return oAppComponent.getResourceBundle().getText.apply(oAppComponent.getResourceBundle(), aArgs);
				}
				// Finaly we are looking into the parent resource bundle
				var oResourceBundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
				if (oResourceBundle && oResourceBundle.hasText(aArgs[0])) {
					return oResourceBundle.getText.apply(oResourceBundle, aArgs);
				}
				return jQuery.sap.formatMessage(aArgs[0], aArgs.slice(1));
			} else {
				// First we are looking into the extended projet resource bundle
				if (oAppComponent.getResourceBundle() && oAppComponent.getResourceBundle().hasText(arguments[0])) {
					return oAppComponent.getResourceBundle().getText.apply(oAppComponent.getResourceBundle(), arguments);
				}
				// Finaly we are looking into the parent resource bundle
				var oParentResourceBundle = fnGetResourceModel().getResourceBundle();
				return oParentResourceBundle.getText.apply(oParentResourceBundle, arguments);
			}
		}

		function fnHasText(oController) {
			// Check if oController context is provided.
			if (oController && typeof oController === "object") {
				var aArgs = Array.prototype.slice.call(arguments, 1);
				// First we are looking into the extended projet resource bundle
				if (oAppComponent.getResourceBundle() && oAppComponent.getResourceBundle().hasText(aArgs[0])) {
					return true;
				}
				// Finaly we are looking into the parent resource bundle
				var oResourceBundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
				if (oResourceBundle && oResourceBundle.hasText(aArgs[0])) {
					return true;
				}
			} else {
				// First we are looking into the extended projet resource bundle
				if (oAppComponent.getResourceBundle() && oAppComponent.getResourceBundle().hasText(arguments[0])) {
					return true;
				}
				// Finaly we are looking into the parent resource bundle
				var oParentResourceBundle = fnGetResourceModel().getResourceBundle();
				if (oParentResourceBundle && oParentResourceBundle.hasText(arguments[0])) {
					return true;
				}
			}
			return false;
		}

		function fnGetModel() {
			return oAppComponent.getResourceModel();
		}

		return {
			getText: fnGetText,
			resolveText: fnResolveText,
			getModel: fnGetModel,
			hasText: fnHasText
		};
	}

	return {
		get: function () {
			if (!_oInstance) {
				throw new Error("I18n has not been initialized yet.");
			}
			return _oInstance;
		},

		init: function (oAppComponent) {
			_oInstance = _oInstance || createInstance(oAppComponent);
		},

		destroy: function () {
			_oInstance = null;
		}

	};
}, true);

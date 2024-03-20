/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/Utils"
], function (Utils) {
	"use strict";

	function getMethods() {

		/**
		 * Deeply merge (recurisively and property by property) a list of JSON format object into one single object and return it .
		 * This method is used to merge parent application descriptors file with the extended one.
		 * 
		 * @param {Array} Args array of descritor file (JSON format) to be merge.
		 * @return {object} prev an object in JSON format.
		 **/
		function fnMergeDescriptors() {
			var aArgs = Array.prototype.slice.call(arguments, 0);

			return aArgs.reduce(function (prev, obj) {
				if (prev == undefined) {
					return obj;
				}
				if (obj == undefined) {
					return prev;
				}
				Object.keys(obj).forEach(function (key) {
					var pVal = prev[key];
					var oVal = obj[key];

					if (Utils.isOfTypes([pVal, oVal], [Utils.TypesUtil.OBJECT])) {
						prev[key] = fnMergeDescriptors(pVal, oVal);
					} else {
						prev[key] = oVal;
					}
				});
				return prev;
			});
		}

		/**
		 * Override parent application descriptor controller entries with value of extended application descriptor file.
		 * 
		 * @param {object} oAppDescriptor application descriptor file of the extended application
		 * @return {object} new application descriptor file.
		 **/
		function fnOverrideControllers(oAppDescriptor) {
			var sListPage, oListPage, sDetailPage, oDetailPage;
			Object.keys(oAppDescriptor).forEach(function (key) {
				var oVal = oAppDescriptor[key];
				if (key.indexOf("controller.ListPageExtension") != -1) {
					sListPage = key;
					oListPage = oAppDescriptor[key];
				}
				if (key.indexOf("controller.DetailPageExtension") != -1) {
					sDetailPage = key;
					oDetailPage = oAppDescriptor[key];
				}
				if (Utils.isOfTypes([oVal], [Utils.TypesUtil.OBJECT])) {
					fnOverrideControllers(oVal);
				}
			});

			if (sListPage != undefined && !Utils.isEmptyObjectOrString(sListPage)) {
				if (sListPage !== oListPage.controllerName) {
					// Controller has been overrided. Overrided controller name has to be propagated to ensure multiple controler extension
					oListPage.controllerNames = [sListPage];
				}
				oAppDescriptor["sap.fin.travel.lib.reuse.ListPage.controller.ListPage"] = oListPage;
				delete oAppDescriptor[sListPage];
			}
			if (sDetailPage != undefined && !Utils.isEmptyObjectOrString(sDetailPage)) {
				if (sDetailPage !== oDetailPage.controllerName) {
					// Controller has been overrided. Overrided controller name has to be propagated to ensure multiple controler extension
					oDetailPage.controllerNames = [sDetailPage];
				}
				oAppDescriptor["sap.fin.travel.lib.reuse.DetailPage.controller.DetailPage"] = oDetailPage;
				delete oAppDescriptor[sDetailPage];
			}
		}

		function fnGetFeature(oAppDescriptor, sFeatureName) {
			var oFeature;
			if (oAppDescriptor && oAppDescriptor.hasOwnProperty("settings") && oAppDescriptor.settings.hasOwnProperty("fin.travel.lib.reuse")) {
				oFeature = oAppDescriptor.settings["fin.travel.lib.reuse"][sFeatureName];
			}
			return oFeature;
		}

		function fnPrepareExtensionAfterFacets(oExtensions) {
			var oExtensionAfterFacets = [];
			if (oExtensions && oExtensions.hasOwnProperty("sap.ui5") && oExtensions["sap.ui5"].hasOwnProperty("extends") && oExtensions["sap.ui5"]
				["extends"].hasOwnProperty("extensions") && oExtensions["sap.ui5"]["extends"]["extensions"].hasOwnProperty("sap.ui.viewExtensions") &&
				oExtensions["sap.ui5"]["extends"]["extensions"]["sap.ui.viewExtensions"].hasOwnProperty(
					"sap.fin.travel.lib.reuse.DetailPage.view.fragments.Sections")) {
				var oSectionExtensions = oExtensions["sap.ui5"]["extends"]["extensions"]["sap.ui.viewExtensions"][
					"sap.fin.travel.lib.reuse.DetailPage.view.fragments.Sections"
				];
				for (var extension in oSectionExtensions) {
					if (extension.startsWith("AfterFacet")) {
						oExtensionAfterFacets.push({
							name: extension,
							facet: oSectionExtensions[extension],
							stableId: extension.replace(/\|/g, '::')
						});
					}
				}
			}
			return oExtensionAfterFacets;
		}

		return {
			mergeDescriptors: fnMergeDescriptors,
			overrideControllers: fnOverrideControllers,
			getFeature: fnGetFeature,
			prepareAfterFacet: fnPrepareExtensionAfterFacets
		};
	}

	return getMethods();
}, true);

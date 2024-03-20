/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

	function getMethods() {
		var oGlobal = {
			objectPageDynamicHeader: "1.54.3",
			smartFieldCheckValuesValidity: "1.64",
			commandExecution: "1.70",
			isTransient: "1.94",
			smartFilterBarFilterData: "1.99"
		};

		/**
		 * Retunrs true if oVersionToCompare is equals and above of oSAPUIVersion.
		 **/
		function fnCompareVersion(oVersionToCompare, oSAPUIVersion) {
			var iSAPVersion, iVersionToCompare;
			var aSAPversions = oSAPUIVersion.split(".");
			var aVersionsToCompare = oVersionToCompare.split(".");
			if (aSAPversions.length < 3) {
				jQuery.sap.log.error("SAP UI5 version cannot be found!");
				return false;
			}
			for (var i = 0; i < aSAPversions.length; i++) {
				if (aVersionsToCompare.length >= i + 1) {
					iSAPVersion = parseInt(aSAPversions[i], 10);
					iVersionToCompare = parseInt(aVersionsToCompare[i], 10);
					if (iSAPVersion > iVersionToCompare) {
						return true;
					} else if (iSAPVersion < iVersionToCompare) {
						return false;
					}
				}
			}
			return true;
		}

		/**
		 * Check all oGlobal property version againts current SAP UI5 version.
		 **/
		function fnCheckVersion() {
			var oVersionCheck = {
				sapUIVersion: sap.ui.version
			};
			for (var property in oGlobal) {
				oVersionCheck[property] = fnCompareVersion(oGlobal[property], oVersionCheck.sapUIVersion);
			}
			return oVersionCheck;
		}

		return {
			global: oGlobal,
			checkVersion: fnCheckVersion,
			compareVersion: fnCompareVersion
		};
	}

	return getMethods();
}, true);

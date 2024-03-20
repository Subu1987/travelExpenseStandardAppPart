/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

	function getMethods() {

		function fnGetCustomData(oObject, sKey) {
			if (oObject && oObject.getCustomData() && oObject.getCustomData().length > 0) {
				for (var i = 0; i < oObject.getCustomData().length; i++) {
					if (oObject.getCustomData()[i] && sKey === oObject.getCustomData()[i].getKey()) {
						return oObject.getCustomData()[i].getValue();
					}
				}
			}
			$.sap.log.warning("Custom Data not defined: " + sKey);
			return "";
		}

		function fnGetObjectCustomData(oElement) {
			var oCustomData = {};
			if (oElement instanceof sap.ui.core.Element) {
				oElement.getCustomData().forEach(function (oCustomDataElement) {
					oCustomData[oCustomDataElement.getKey()] = oCustomDataElement.getValue();
				});
			}
			return oCustomData;
		}

		return {
			getCustomData: fnGetCustomData,
			getObjectCustomData: fnGetObjectCustomData
		};
	}

	return getMethods();
}, true);

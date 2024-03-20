/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/m/Table"
], function (ResponsiveTable) {
	"use strict";

	function getMethods() {

		/*
		 * Returns an ancestoral SmartTable of the given element or null
		 *
		 * @param {sap.ui.core.Element} oSourceControl The element where to start searching for a ancestoral SmartTable
		 * @returns {sap.ui.comp.smarttable.SmartTable} The ancestoral SmartTable or null
		 * @public
		 */
		function fnGetSmartTable(oSourceControl) {
			var oCurrentControl = oSourceControl;
			while (oCurrentControl) {
				if (fnIsSmartTable(oCurrentControl)) {
					return oCurrentControl;
				}
				oCurrentControl = oCurrentControl.getParent && oCurrentControl.getParent();
			}
			return null;
		}

		/*
		 * Returns an ancestoral table of the given element or null
		 *
		 * @param {sap.ui.core.Element} oSourceControl The element where to start searching for a ancestoral table
		 * @returns {sap.ui.table.Table|sap.m.Table|sap.ui.comp.smarttable.SmartTable} The ancestoral table or null
		 * @public
		 */
		function fnGetOwnerControl(oSourceControl) {
			var oCurrentControl = oSourceControl;
			while (oCurrentControl) {
				if (oCurrentControl instanceof ResponsiveTable || fnIsUiTable(oCurrentControl) || fnIsSmartTable(oCurrentControl)) {
					return oCurrentControl;
				}
				oCurrentControl = oCurrentControl.getParent && oCurrentControl.getParent();
			}
			return null;
		}
		
		/*
		 * Returns an ancestoral class of the given element or null
		 *
		 * @param {sap.ui.core.Element} oSourceControl The element where to start searching for a ancestoral class
		 * @param {String} sClass The class of the oSourceControl requested parent
		 * @returns {sap.ui.core.Element} The ancestoral class or null
		 * @public
		 */
		function fnGetOwnerControlByClass(oSourceControl, sClass) {
			var oCurrentControl = oSourceControl;
			while (oCurrentControl) {
				if (fnIsControlOfType(oCurrentControl, sClass)) {
					return oCurrentControl;
				}
				oCurrentControl = oCurrentControl.getParent && oCurrentControl.getParent();
			}
			return null;
		}

		/*
		 * Returns an ancestoral dialog/popover of the given element or null
		 *
		 * @param {sap.ui.core.Element} oSourceControl The element where to start searching for a ancestoral dialog/popover
		 * @returns {sap.m.MessagePopover|sap.m.Popover|sap.m.ResponsivePopover|sap.m.Dialog|sap.m.SelectDialog} The ancestoral dialog/popover or null
		 * @public
		 */
		function fnGetDialogPopup(oSourceControl) {
			var oCurrentControl = oSourceControl;
			while (oCurrentControl) {
				if (fnIsDialogPopover(oCurrentControl)) {
					return oCurrentControl;
				}
				oCurrentControl = oCurrentControl.getParent && oCurrentControl.getParent();
			}
			return null;
		}

		function fnIsSmartTable(oControl) {
			return fnIsControlOfType(oControl, "sap/ui/comp/smarttable/SmartTable");
		}

		function fnIsUiTable(oControl) {
			return fnIsControlOfType(oControl, "sap/ui/table/Table");
		}

		function fnIsDialogPopover(oControl) {
			return fnIsControlOfType(oControl, "sap/m/MessagePopover") || fnIsControlOfType(oControl, "sap/m/Popover") || fnIsControlOfType(
				oControl, "sap/m/ResponsivePopover") || fnIsControlOfType(oControl, "sap/m/Dialog") || fnIsControlOfType(oControl,
				"sap/m/SelectDialog");
		}

		function fnIsControlOfType(oControl, sPathToType) {
			var FNClass = sap.ui.require(sPathToType);
			return typeof FNClass === "function" && (oControl instanceof FNClass);
		}

		return {
			getSmartTable: fnGetSmartTable,
			getOwnerControl: fnGetOwnerControl,
			getDialogPopup: fnGetDialogPopup,
			getOwnerControlByClass: fnGetOwnerControlByClass
		};
	}

	return getMethods();
}, true);

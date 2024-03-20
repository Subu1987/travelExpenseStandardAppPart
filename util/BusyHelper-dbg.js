/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/BusyIndicator"
], function(BusyIndicator) {
	"use strict";

	var DEFAULT_DELAY = 0;

	function fnShow(oControl, iDelay) {
		if (oControl) {
			oControl.setBusyIndicatorDelay(iDelay ? iDelay : DEFAULT_DELAY);
			oControl.setBusy(true);
		} else {
			BusyIndicator.show(iDelay ? iDelay : DEFAULT_DELAY);
		}
	}

	function fnHide(oControl) {
		if (oControl) {
			oControl.setBusy(false);
		} else {
			BusyIndicator.hide();
		}
	}

	return {
		show: fnShow,
		hide: fnHide
	};

});

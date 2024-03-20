/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/base/Object", "sap/fin/travel/lib/reuse/util/FCLayoutUtil", "sap/fin/travel/lib/reuse/util/NavigationUtil"],
	function(B, F, N) {
		"use strict";

		function g(c) {
			function h() {
				F.get().setFullScreenLayout(c.getOwnerComponent());
			}

			function a() {
				F.get().setExitFullScreenLayout(c.getOwnerComponent());
			}

			function b() {
				F.get().setCloseScreenLayout(c.getView().getModel("view").getProperty("/level"));
				N.navigateBack(c.getView().getModel("view").getProperty("/level"));
			}
			return {
				handleClose: b,
				handleExitFullScreen: a,
				handleFullScreen: h
			};
		}
		return B.extend("sap.fin.travel.lib.reuse.util.FCLayoutHandler", {
			constructor: function(c) {
				jQuery.extend(this, g(c));
			}
		});
	});
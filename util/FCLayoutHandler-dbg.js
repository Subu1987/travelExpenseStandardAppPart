/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"sap/fin/travel/lib/reuse/util/FCLayoutUtil",
	"sap/fin/travel/lib/reuse/util/NavigationUtil"
], function(BaseObject, FCLayoutUtil, NavigationUtil) {
	"use strict";

	function getMethods(oController) {

		function handleFullScreen() {
			FCLayoutUtil.get().setFullScreenLayout(oController.getOwnerComponent());
		}

		function handleExitFullScreen() {
			FCLayoutUtil.get().setExitFullScreenLayout(oController.getOwnerComponent());
		}

		function handleClose() {
			FCLayoutUtil.get().setCloseScreenLayout(oController.getView().getModel("view").getProperty("/level"));
			NavigationUtil.navigateBack(oController.getView().getModel("view").getProperty("/level"));
		}

		return {
			handleClose: handleClose,
			handleExitFullScreen: handleExitFullScreen,
			handleFullScreen: handleFullScreen
		};
	}

	return BaseObject.extend("sap.fin.travel.lib.reuse.util.FCLayoutHandler", {
		/**
		 * @param {object} JSONModel model for the flexible layout, such as the one created by FlexibleColumnLayoutSemanticHelper
		 */
		constructor: function(oController) {
			jQuery.extend(this, getMethods(oController));
		}
	});

});

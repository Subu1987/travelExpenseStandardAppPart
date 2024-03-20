/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"sap/m/DraftIndicatorState"
], function (JSONModel, Device, DraftIndicatorState) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createGlobalModel: function (oComponent) {
			var oModel = {
				draft: DraftIndicatorState.Clear,
				fcl: {},
				fclSettings: oComponent.getManifestEntry("/sap.ui.generic.app/settings/flexibleColumnLayout"),
				paginator: {
					navUpEnabled: false,
					navDownEnabled: false
				},
				share: {
					appTitle: oComponent.getManifestEntry("/sap.app/title"),
					title: oComponent.getManifestEntry("/sap.app/title"),
					subTitle: oComponent.getManifestEntry("/sap.app/description"),
					icon: oComponent.getManifestEntry("/sap.ui/icons/favIcon"),
					customUrl: ""
				},
				hierarchy: {
					app: {
						title: oComponent.getManifestEntry("/sap.app/title"),
						icon: oComponent.getManifestEntry("/sap.ui/icons/icon"),
						intent: location.hash
					},
					main: []
				},
				userprofile: {},
				detailPage: {
					multipleViews: {
						selectedKey: {}
					}
				},
				app: {
					level: 0
				}
			};
			var oJSONModel = new JSONModel(oModel);
			oJSONModel.setDefaultBindingMode("OneWay");
			return oJSONModel;
		}

	};
});

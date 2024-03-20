/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/Device", "sap/m/DraftIndicatorState"], function(J, D, a) {
	"use strict";
	return {
		createDeviceModel: function() {
			var m = new J(D);
			m.setDefaultBindingMode("OneWay");
			return m;
		},
		createGlobalModel: function(c) {
			var m = {
				draft: a.Clear,
				fcl: {},
				fclSettings: c.getManifestEntry("/sap.ui.generic.app/settings/flexibleColumnLayout"),
				paginator: {
					navUpEnabled: false,
					navDownEnabled: false
				},
				share: {
					appTitle: c.getManifestEntry("/sap.app/title"),
					title: c.getManifestEntry("/sap.app/title"),
					subTitle: c.getManifestEntry("/sap.app/description"),
					icon: c.getManifestEntry("/sap.ui/icons/favIcon"),
					customUrl: ""
				},
				hierarchy: {
					app: {
						title: c.getManifestEntry("/sap.app/title"),
						icon: c.getManifestEntry("/sap.ui/icons/icon"),
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
			var j = new J(m);
			j.setDefaultBindingMode("OneWay");
			return j;
		}
	};
});
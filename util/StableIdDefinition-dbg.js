/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

	return {
		parameters: ["sSmartTableId", "sProperty", "sQuickVariantKey", "sEntityName"],
		types: {
			TableColumn: {
				DataField: {
					parameters: ["sSmartTableId", "sProperty", "sQuickVariantKey"],
					value: function (oParams) {
						return oParams.sSmartTableId + "-TableColumn-DataField-" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key :
							"NoVariant") + "-" + oParams.sProperty.replace("/", "_");
					}
				},
				ColumnListItem: {
					parameters: ["sSmartTableId", "sProperty", "sQuickVariantKey"],
					value: function (oParams) {
						return oParams.sSmartTableId + "-TableColumn-ColumnListItem-" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key :
							"NoVariant") + "-" + oParams.sProperty.replace("/", "_");
					}
				}
			},
			ListPageTable: {
				ColumnListItem: {
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::ListPageTable:::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key : "NoVariant") +
							":::ColumnListItem";
					}
				},
				VBox: {
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::ListPageTable:::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key : "NoVariant") + ":::VBox";
					}
				},
				Label: {
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::ListPageTable:::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key : "NoVariant") + ":::Label";
					}
				},
				ObjectMarker: {
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::ListPageTable:::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key : "NoVariant") + ":::ObjectMarker";
					}
				}
			},
			DetailPageTable: {
				ColumnListItem: {
					parameters: ["sEntityName"],
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::DetailPageTable:::" + oParams.sEntityName + ":::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key :
							"NoVariant") + ":::ColumnListItem";
					}
				},
				VBox: {
					parameters: ["sEntityName"],
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::DetailPageTable:::" + oParams.sEntityName + ":::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key :
							"NoVariant") + ":::VBox";
					}
				},
				Label: {
					parameters: ["sEntityName"],
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::DetailPageTable:::" + oParams.sEntityName + ":::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key :
							"NoVariant") + ":::Label";
					}
				},
				ObjectMarker: {
					parameters: ["sEntityName"],
					optionalParameters: ["sQuickVariantKey"],
					value: function (oParams) {
						return "travel:::DetailPageTable:::" + oParams.sEntityName + ":::" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key :
							"NoVariant") + ":::ObjectMarker";
					}
				}
			},
			DataField: {
				Text: {
					parameters: ["sSmartTableId", "sProperty", "sQuickVariantKey"],
					value: function (oParams) {
						return oParams.sSmartTableId + "-DataField-Text-" + (oParams.sQuickVariantKey ? oParams.sQuickVariantKey.key : "NoVariant") + "-" +
							oParams.sProperty.replace("/", "_") + "-Text";
					}
				}
			}
		}
	};
});

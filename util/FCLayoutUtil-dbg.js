/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"sap/fin/travel/lib/reuse/util/formatters",
	"sap/fin/travel/lib/reuse/util/ShellUtil",
	"sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/CustomDataUtil"
], function (FlexibleColumnLayoutSemanticHelper, Formatters, ShellUtil, Utils, CustomDataUtil) {
	"use strict";

	var _oInstance;

	var layout = {
		beginColumn: {
			level: 0,
			layout: "OneColumn"
		},
		midColumn: {
			level: 1,
			layout: "TwoColumnsMidExpanded",
			fullLayout: "MidColumnFullScreen"
		},
		endColumn: {
			level: 2,
			layout: "EndColumnFullScreen",
			fullLayout: "EndColumnFullScreen"
		},
		deeperColumn: {
			level: 3,
			layout: "EndColumnFullScreen"
		}
	};

	function createInstance(oFCL, oAppComponent, oAppSettings) {
		var oFCLayout = oFCL;
		layout.endColumn.layout = oAppSettings.settings.flexibleColumnLayout.defaultThreeColumnLayoutType;
		for (var listEntry in oAppSettings.pages) {
			_handleAppSettings(oAppSettings.pages[listEntry].pages, 1);
		}

		var oFCLayoutHelper = FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCLayout, {
			defaultTwoColumnLayoutType: oAppSettings.settings.flexibleColumnLayout.defaultTwoColumnLayoutType,
			defaultThreeColumnLayoutType: oAppSettings.settings.flexibleColumnLayout.defaultThreeColumnLayoutType
		});

		/**
		 * Looking into application pages settings, check if columnLayout property has been defined and create the corresponding entry in layout object.
		 * 
		 * For exemple: 
		 * In extended Travel Expense project you can define:
		 * "pages": {
		 *		"ObjectPage|CostAssignments": {
		 *			"navigationProperty": "CostAssignments",
		 *			"entitySet": "CostAssignments",
		 *			"routingSpec": {
		 *				"routeName": "#CostAssignments",
		 *				"headerTitle": "COST_ASSIGNMENT",
		 *				"typeImageUrl": "sap-icon://circle-task-2"
		 *			},
		 *			"component": {
		 *				"name": "sap.fin.travel.lib.reuse.DetailPage",
		 *				"settings": {
		 *					"allowDeepLinking": true,
		 *					"columnLayout": "ThreeColumnsMidExpanded"
		 *				}
		 *			}
		 *		}
		 *	}
		 * Then in layout, new entry will be added:
		 * TravelExpenses.CostAssignments: {
		 *		level: 2,
		 *		layout: "ThreeColumnsMidExpanded",
		 *		fullLayout: "EndColumnFullScreen"
		 * }
		 * 
		 **/
		function _handleAppSettings(oAppPagesSettings, level, sEntry) {
			for (var prop in oAppPagesSettings) {
				var sKey = prop.split("|").pop();
				var newEntry = sEntry != undefined ? sEntry + "." + sKey : sKey;
				if (oAppPagesSettings[prop].hasOwnProperty("component") && oAppPagesSettings[prop].component.hasOwnProperty("settings") &&
					oAppPagesSettings[prop].component.settings.hasOwnProperty("columnLayout") && level == layout.endColumn.level) {
					layout[newEntry] = {
						level: level,
						fullLayout: "EndColumnFullScreen",
						layout: oAppPagesSettings[prop].component.settings.columnLayout
					};
				} else {
					if (oAppPagesSettings[prop].hasOwnProperty("pages")) {
						_handleAppSettings(oAppPagesSettings[prop].pages, level + 1, newEntry);
					}
				}
			}
		}

		function _getCustomLayout(sPath, iLevel, bInPlace) {
			var aPath = sPath.split("/"),
				sKey;
			while (aPath.length > 0) {
				var sExtractPath = aPath.shift();
				if (sExtractPath != undefined && sExtractPath.length > 0) {
					sKey = sKey == undefined ? sExtractPath.split("(").shift() : sKey + "." + sExtractPath.split("(").shift();
				}
			}
			if (layout.hasOwnProperty(sKey)) {
				return layout[sKey].layout;
			}
			return undefined;
		}

		function updateFCLModel() {
			oAppComponent.updateGlobalModel("/fcl", oFCLayoutHelper.getCurrentUIState());
		}

		function setLayout(sFCLayout) {
			oFCLayout.setLayout(sFCLayout);
			updateFCLModel();
		}

		/**
		 * Provides forward layout navigation. It means that by default, it takes the iLevel and set the next known layout.
		 * For instance, mid goes to end. Begin goes to mid. And end goes to end.
		 * If there is inPlace layout boolean parameter set, the layout is set to its corresponding level (begin for begin, mid for mid, and end for end)
		 * 
		 * sPaht is used to check in for an given path a custom layout has been defined.
		 */
		function setNavigationLayout(sPath, iLevel, bInPlace) {
			var sLayout = _getCustomLayout(sPath, iLevel, bInPlace);
			if (sLayout == undefined) {
				if (iLevel === layout.beginColumn.level) {
					sLayout = bInPlace ? layout.beginColumn.layout : (oFCLayoutHelper.getCurrentUIState().isFullScreen ? layout.midColumn.fullLayout :
						layout.midColumn.layout);
				} else if (iLevel === layout.midColumn.level) {
					sLayout = bInPlace ? layout.midColumn.layout : (oFCLayoutHelper.getCurrentUIState().isFullScreen ? layout.endColumn.fullLayout :
						layout.endColumn.layout);
				} else if (iLevel === layout.endColumn.level) {
					sLayout = (oFCLayoutHelper.getCurrentUIState().isFullScreen ? layout.endColumn.fullLayout : layout.endColumn.layout);
				} else {
					//level greater than endcolumn, 
					sLayout = layout.deeperColumn.layout;
				}
			}
			if (!Utils.isEmptyObjectOrString(sLayout)) {
				oAppComponent.updateGlobalModel("/app/level", iLevel);
				setLayout(sLayout);
			}
		}

		function setNavigationBackLayout(iLevel) {
			var bFullScreen = oFCLayoutHelper.getCurrentUIState().isFullScreen;
			switch (iLevel) {
			case layout.beginColumn.level:
				break;
			case layout.midColumn.level:
				setLayout(layout.beginColumn.layout);
				break;
			case layout.endColumn.level:
				setLayout(bFullScreen ? layout.midColumn.fullLayout : layout.midColumn.layout);
				break;
			default:
				setLayout(bFullScreen ? layout.endColumn.fullLayout : layout.endColumn.layout);
				break;
			}
		}

		function setFullScreenLayout(oComponent) {
			var oCurrentState = oFCLayoutHelper.getCurrentUIState();
			if (oComponent.getModel("view").getProperty("/level") === layout.midColumn.level) {
				setLayout(oCurrentState.actionButtonsInfo.midColumn.fullScreen);
			} else if (oComponent.getModel("view").getProperty("/level") === layout.endColumn.level) {
				setLayout(oCurrentState.actionButtonsInfo.endColumn.fullScreen);
			}
			ShellUtil.get().setTitle(oComponent, fnIsFullScreen());
		}

		function setExitFullScreenLayout(oComponent) {
			var oCurrentState = oFCLayoutHelper.getCurrentUIState();
			if (oComponent.getModel("view").getProperty("/level") === layout.midColumn.level) {
				setLayout(oCurrentState.actionButtonsInfo.midColumn.exitFullScreen);
			} else if (oComponent.getModel("view").getProperty("/level") === layout.endColumn.level) {
				setLayout(oCurrentState.actionButtonsInfo.endColumn.exitFullScreen);
			}
			ShellUtil.get().setTitle(oComponent, fnIsFullScreen());
		}

		function setCloseScreenLayout(iLevel) {
			var oCurrentState = oFCLayoutHelper.getCurrentUIState();
			if (iLevel === layout.midColumn.level) {
				setLayout(oCurrentState.actionButtonsInfo.midColumn.closeColumn);
			} else if (iLevel === layout.endColumn.level) {
				setLayout(oCurrentState.actionButtonsInfo.endColumn.closeColumn);
			}
		}

		function fnIsFullScreen() {
			return oAppComponent.getGlobalModel().getProperty("/fcl").isFullScreen;
		}

		function fnGetLayout() {
			return oAppComponent.getGlobalModel().getProperty("/fcl").layout;
		}

		return {
			// methods
			setNavigationLayout: setNavigationLayout,
			setNavigationBackLayout: setNavigationBackLayout,
			setFullScreenLayout: setFullScreenLayout,
			setExitFullScreenLayout: setExitFullScreenLayout,
			setCloseScreenLayout: setCloseScreenLayout,
			setLayout: setLayout,
			updateFCLModel: updateFCLModel,
			isFullScreen: fnIsFullScreen,
			getLayout: fnGetLayout
		};
	}

	return {
		// variables
		layout: layout,
		get: function () {
			if (!_oInstance) {
				throw new Error("FCLLayout has not been initialized yet.");
			}
			return _oInstance;
		},

		/*
		 * Init the FCLayoutUtil according to the giving FCL control and AppComponent.
		 * One and only one instance shall be created.
		 */
		init: function (oFCL, oAppComponent, oAppSettings) {
			if (_oInstance) {
				this.destroy();
			}
			_oInstance = createInstance(oFCL, oAppComponent, oAppSettings);
		},

		destroy: function () {
			_oInstance = null;
		}

	};
}, true);

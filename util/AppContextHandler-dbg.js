/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/NavigationUtil",
	"sap/fin/travel/lib/reuse/util/FCLayoutUtil",
	"sap/ui/core/routing/HashChanger",
	"sap/fin/travel/lib/reuse/util/CustomDataUtil",
	"sap/fin/travel/lib/reuse/util/ControlUtil"
], function (NavigationUtil, FCLayoutUtil, HashChanger, CustomDataUtil, ControlUtil) {
	"use strict";

	function getMethods() {

		function _fnGetReferenceEntity() {
			var oBindPaths = NavigationUtil.bindingPaths(HashChanger.getInstance().getHash()).paths;
			if (oBindPaths && oBindPaths.length > 0) {
				var sDeepestPath = NavigationUtil.bindingPaths(HashChanger.getInstance().getHash()).paths.pop();
				return sDeepestPath && sDeepestPath.split('/')[1].split('(')[0];
			}
			return "";
		}

		function fnGetTargetMessageButton(bIsVisible) {
			var bIsFullScreen = FCLayoutUtil.get().isFullScreen();
			var sLayoutType = FCLayoutUtil.get().getLayout();
			var oButton;
			if (sLayoutType !== "OneColumn") {
				$("[id*=travelDetailPageFooterToolbar]").each(function (i, j) {
					var oFooterbar = sap.ui.getCore().byId(j.id);
					if (oFooterbar && oFooterbar.getMetadata().getName() === "sap.m.OverflowToolbar") {
						var oObjectPageLayout = ControlUtil.getOwnerControlByClass(oFooterbar, "sap/uxap/ObjectPageLayout");
						if (bIsVisible || oObjectPageLayout.getShowFooter()) {
							var iCurrentViewLevel = NavigationUtil.bindingPaths(HashChanger.getInstance().getHash()).depth;
							var iViewCustomData = CustomDataUtil.getCustomData(oFooterbar, "ViewLevel");
							var sRefEntity = CustomDataUtil.getCustomData(oFooterbar, "RefEntity");
							if (!bIsFullScreen || sLayoutType === "MidColumnFullScreen") {
								if (iViewCustomData == 1) {
									oButton = oFooterbar.getContent()[0];
									return;
								}
							} else if (iViewCustomData == iCurrentViewLevel && sRefEntity === _fnGetReferenceEntity()) {
								oButton = oFooterbar.getContent()[0];
								return;
							}
						}
					}
				});
			}
			return oButton;
		}

		return {
			getTargetMessageButton: fnGetTargetMessageButton
		};
	}

	return getMethods();
}, true);

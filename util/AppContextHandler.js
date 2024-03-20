/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/fin/travel/lib/reuse/util/NavigationUtil","sap/fin/travel/lib/reuse/util/FCLayoutUtil","sap/ui/core/routing/HashChanger","sap/fin/travel/lib/reuse/util/CustomDataUtil","sap/fin/travel/lib/reuse/util/ControlUtil"],function(N,F,H,C,a){"use strict";function g(){function _(){var b=N.bindingPaths(H.getInstance().getHash()).paths;if(b&&b.length>0){var d=N.bindingPaths(H.getInstance().getHash()).paths.pop();return d&&d.split('/')[1].split('(')[0];}return"";}function G(I){var b=F.get().isFullScreen();var l=F.get().getLayout();var B;if(l!=="OneColumn"){$("[id*=travelDetailPageFooterToolbar]").each(function(i,j){var f=sap.ui.getCore().byId(j.id);if(f&&f.getMetadata().getName()==="sap.m.OverflowToolbar"){var o=a.getOwnerControlByClass(f,"sap/uxap/ObjectPageLayout");if(I||o.getShowFooter()){var c=N.bindingPaths(H.getInstance().getHash()).depth;var v=C.getCustomData(f,"ViewLevel");var r=C.getCustomData(f,"RefEntity");if(!b||l==="MidColumnFullScreen"){if(v==1){B=f.getContent()[0];return;}}else if(v==c&&r===_()){B=f.getContent()[0];return;}}}});}return B;}return{getTargetMessageButton:G};}return g();},true);

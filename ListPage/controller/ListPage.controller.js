/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/mvc/Controller"],function(C){"use strict";return C.extend("sap.fin.travel.lib.reuse.ListPage.controller.ListPage",{onInit:function(){this._eventHandler.initListPageFilterBar();this.oRouter=this.getOwnerComponent().getRouter();}});},true);

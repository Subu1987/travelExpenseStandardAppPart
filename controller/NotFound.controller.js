/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/mvc/Controller"],function(C){"use strict";return C.extend("sap.fin.travel.lib.reuse.controller.NotFound",{onBeforeRendering:function(){var m=this.getView().getContent()[0];m.bindProperty("title","/title");m.bindProperty("text","/text");m.setIcon("sap-icon://error");m.bindProperty("description","/description");},onInit:function(){var l=this.getOwnerComponent().getModel("lastMessage");this.getView().setModel(l);}});});

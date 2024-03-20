/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
/* global mytravelandexpense */
jQuery.sap.declare("sap.fin.travel.lib.reuse.controls.IconSwitchRenderer");
jQuery.sap.require("sap.ui.core.Renderer");

sap.fin.travel.lib.reuse.controls.IconSwitchRenderer = {};
sap.fin.travel.lib.reuse.controls.IconSwitchRenderer.render = function(oRm, oControl){
    if(!oControl.getVisible()){
        return;
    }
    oRm.write("<div tabindex=\"0\" ");
    oRm.writeControlData(oControl);
    var size = sap.ui.core.theming.Parameters.get("sapUiMarginLarge");
    var state = oControl.getState();
    var bActiveState = oControl.getActiveState();
    var disabled = !oControl.getEnabled();
    oRm.addStyle("width", size);
    oRm.addStyle("height", size);
    oRm.addStyle("line-height", size);
    oRm.addStyle("font-size",sap.ui.core.theming.Parameters.get("sapMFontHeader2Size"));
    if(state === bActiveState){
        oRm.addStyle("border-color",sap.ui.core.theming.Parameters.get("sapUiActive"));
        oRm.addStyle("background-color",sap.ui.core.theming.Parameters.get("sapUiActive"));
        oRm.addStyle("color",sap.ui.core.theming.Parameters.get("sapUiContentContrastTextColor"));
    }
    else{
        oRm.addStyle("border-color",sap.ui.core.theming.Parameters.get("sapUiListBorderColor"));
        oRm.addStyle("background-color",sap.ui.core.theming.Parameters.get("sapUiListBackground"));
        oRm.addStyle("color",sap.ui.core.theming.Parameters.get("sapUiPageHeaderTextColor"));
    }
    oRm.writeStyles();
    oRm.addClass("TecIconSwitch");
    if(disabled){
        oRm.addClass("TecIconSwitchDisabled");
    }
    oRm.writeClasses();
    oRm.write(">"); // first level div

	
    // Image
    if (oControl.getIcon()){
    	var sTooltip = oControl.getAggregation("tooltip") || "";
    	var sSwitchStatusTooltip = state === bActiveState ? oControl.getModel("i18n").getResourceBundle().getText("ICON_SWITCH_IS_ON") : oControl.getModel("i18n").getResourceBundle().getText("ICON_SWITCH_IS_OFF");
    	var sDisabledTooltip = disabled ?  oControl.getModel("i18n").getResourceBundle().getText("ICON_SWITCH_IS_DISABLED") : "";
        
        var sFinalTooltip = sTooltip + " " + sSwitchStatusTooltip;
        if (disabled){
            //indicate that switch is disabled, even if switch status is ON
            sFinalTooltip = sFinalTooltip + ", " + sDisabledTooltip;
        }
        
		oControl._oImage.setAlt(sFinalTooltip);
		oControl._oImage.setTooltip(sFinalTooltip);
        oRm.renderControl(oControl._oImage);
    }
    oRm.write("</div>");

};

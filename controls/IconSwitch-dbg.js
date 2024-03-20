/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
jQuery.sap.declare("sap.fin.travel.lib.reuse.controls.IconSwitch");
jQuery.sap.require("sap.ui.core.Control");
jQuery.sap.require("sap.ui.core.IconPool");

jQuery.sap.includeStyleSheet(jQuery.sap.getModulePath("sap.fin.travel.lib.reuse.controls.IconSwitch", ".css"));

sap.ui.core.Control.extend("sap.fin.travel.lib.reuse.controls.IconSwitch", {
    metadata : {

        // ---- control specific ----
        properties : {
            "icon" : {type : "sap.ui.core.URI", group : "Misc", defaultValue : ""},
            "tooltip" : {type : "string", group : "Misc", defaultValue : ""},
            "visible" : {type : "boolean", group : "Misc", defaultValue : true},
            "enabled" : {type : "boolean", group : "Misc", defaultValue : true},
            "state" : {type : "boolean", group : "Misc", defaultValue : true},
            "activeState" : {type : "boolean", group : "Misc", defaultValue : true}
        },
        events : {
            "press": {}
        }
    },

    init: function () {
        this._oImage = null;
        this.attachBrowserEvent("keydown", $.proxy(function(e){
			 switch(e.keyCode){
				case 13: //enter key
       				case 32: //space key
					this.ontap(e);
					break;
			 }
        }, this));
        
    },

    setIcon: function (sValue, bInvalidate) {

        //first non empty value creates the image
        if (sValue) {
            if (!this._oImage) {
                this._oImage = sap.ui.core.IconPool.createControlByURI({src: sValue, densityAware: true}, sap.m.Image);
                this._oImage.addStyleClass("TecIconSwitchImg");
                this._oImage.setDecorative(false);
            }
            else {
                this._oImage.setSrc(sValue);
            }
        }

        return this.setProperty("icon", sValue, bInvalidate);
    },
    
    ontap : function(oEvent){
        if(this.getEnabled()){
            this.setState(!this.getState());
            this.firePress(oEvent);
        }
    },
    exit: function() {
        if (this._oImage) {
            this._oImage.destroy();
            this._oImage = null;
        }
    }
});

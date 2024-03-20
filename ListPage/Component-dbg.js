/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/fin/travel/lib/reuse/util/BaseComponentHandler",
  "sap/fin/travel/lib/reuse/util/PersistenceHelper",
  "sap/fin/travel/lib/reuse/util/ODataModelUtil",
  "sap/ui/thirdparty/datajs"
], function(UIComponent, BaseComponentHandler, PersistenceHelper, ODataModelUtil, OData) {
  "use strict";

  return UIComponent.extend("sap.fin.travel.lib.reuse.ListPage.Component", {

    metadata: {
      manifest: "json", //Attention, fake usage for the build!!
      config: {
        fullWidth: true
      }
    },

    init: function() {
      //preparing application unload
      var oModel = this.getComponentData().oModel;
      var that = this;

      //SignOut does prevent any call trough regular ODataModel/datajs. To perform our proper clean-up, we do manually call the ExitApplication function import
      if (sap.ushell && sap.ushell.Container) {
        var fnLogout = function(oEvent) {

          if (!that.bExitCalled) {
            var sSelectedPernr = ODataModelUtil.get().getCurrentTripContext().Pernr;

            var sServiceUrl = oModel.sServiceUrl;
            var mHeaders = oModel.getHeaders(); //retrieve x-csrf-token
            var sCsrfToken = mHeaders["x-csrf-token"];
            var sMethod = "POST";
            var urlParameters = ["Pernr='" + sSelectedPernr + "'", "NewPernr=''"];
            var aAllUrlParameters = [];
            aAllUrlParameters = aAllUrlParameters.concat(oModel["aUrl" + "Params"]); //aUrlParams is a private member, but there is no alternative at the moment
            aAllUrlParameters = aAllUrlParameters.concat(urlParameters);
            var sUrl = sServiceUrl + "/ExitApplication?" + aAllUrlParameters.join("&");

						var sOrigin = "";
						if (window.location["orig" + "in"]){
							sOrigin = window.location["orig" + "in"];
						}else{
							sOrigin = window.location.protocol + "//" + window.location.host;
						}

            var sDestinationUrl = sOrigin + sUrl;
            $.ajax({
              url: sDestinationUrl,
              type: 'post',
              headers: {
                "X-CSRF-Token": sCsrfToken
              }
            });
            that.bExitCalled = true;
          }

          sap.ushell.Container.detachLogoutEvent(fnLogout);

          oEvent.preventDefault(); // causes delay of logout by 1 sec
        };

        sap.ushell.Container.attachLogoutEvent(fnLogout);
      }

      $(window).bind("beforeunload", function() {

        if (!that.bExitCalled) {
          var sSelectedPernr = ODataModelUtil.get().getCurrentTripContext().Pernr;

          //invoke ExitApplication function import through datajs to have a synchronous call
          var sServiceUrl = oModel.sServiceUrl;
          var mHeaders = oModel.getHeaders(); //retrieve x-csrf-token
          var sMethod = "POST";
          var urlParameters = ["Pernr='" + sSelectedPernr + "'", "NewPernr=''"];
          var aAllUrlParameters = [];
          aAllUrlParameters = aAllUrlParameters.concat(oModel["aUrl" + "Params"]); //aUrlParams is a private member, but there is no alternative at the moment
          aAllUrlParameters = aAllUrlParameters.concat(urlParameters);
          var sUrl = sServiceUrl + "/ExitApplication?" + aAllUrlParameters.join("&");

          //In case of chrome browser
          var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
          var bAsync = isChrome;

          //no callback needed as we are completely exiting the application after the complete unload
          OData.request({
            headers: {
              "X-CSRF-Token": mHeaders["x-csrf-token"]
            },
            async: bAsync, //works only under SAP data-js framework
            method: "POST",
            requestUri: sUrl,
            data: undefined
          }, function() {
            //success

          }, function() {
            //error
          });
          that.bExitCalled = true;
        }
      });

      //Calling private method activate for component instance to make sure that extension points are
      //loaded from URL-defined manifest
      try{
			//Customizing configuration no longer available above ui5 1.97.
        	//If we are using [] within require, we do not control/understand the callback fn that were not called sometimes
			//If we are using solely the no array version, the CustomizingConfiguration was never loaded
			//This will dump in ui5 gt than 1.97, and we provide defensive code if for some reason the module is not loaded
			sap.ui.require(["sap/ui/core/CustomizingConfiguration"]);
			var CustomizingConfiguration= sap.ui.require("sap/ui/core/CustomizingConfiguration");
			if (undefined !== CustomizingConfiguration){
				CustomizingConfiguration.activateForComponentInstance(this);
			}
		} catch (e){
			jQuery.sap.log.warning("Customizing Configuration no longer available above ui5 1.97");
		}

      this.setModel(oModel);
      this.oRouter = this.getComponentData().oRouter;
      this.oAppManifest = this.getComponentData().oAppManifest;
      this.sEntitySet = this.getComponentData().sEntitySet;
      //this.iLevel = this.getComponentData().iLevel;
      this.oExtension = this.getComponentData().extension;

      //i18n default should be provided through the manifest (../i18n/i18n.properties)
      var oAppResourceBundle = this.getComponentData().oAppResourceBundle;
      var o18model = this.getModel("i18n");
      if (oAppResourceBundle) {
        oAppResourceBundle.aPropertyFiles[0].getKeys().forEach(function(key) {
          o18model.getResourceBundle().aPropertyFiles[0].setProperty(key, oAppResourceBundle.getText(key));
        });
      }

      // Call the init function of the parent
      UIComponent.prototype.init.apply(this, arguments);
    },

    
    destroy: function() {
      BaseComponentHandler.destroy(); //properly clean handler (for cache mechanism across apps)
      UIComponent.prototype.destroy.apply(this, arguments);
    },
    

    exit: function() {
      if (this.oViewContainer) {
        this.oViewContainer.destroy();
        delete this.oViewContainer;
      }
    },

    createContent: function() {
      var that = this;
      var oSettings = {
        entitySet: this.sEntitySet,
        extension: this.oExtension,
        controller: {
          name: "sap.fin.travel.lib.reuse.ListPage.controller.ListPage"
        },
        view: {
          id: "listPageView",
          name: "sap.fin.travel.lib.reuse.ListPage.view.ListPage",
          level: 0
        }
      };

      // The view container is returned to the caller and will be cached. It contains our created view.
      this.oViewContainer = new sap.m.Page(this.createId("rootPage"), {
        showHeader: false
      });

      this.getModel().getMetaModel().loaded().then(function() {
        BaseComponentHandler.createComponentContent(that, oSettings);
      }).catch(function(error) {
        $.sap.log.error("Could not create component content : " + error);
      });

      return this.oViewContainer;
    },

    getRouter: function() {
      return this.oRouter;
    },

    /**
     * This methods exposes the ExitApplication function import call. Only the ListPage knows which user is being selected,
     * therefore component proposes to call itself the exit application.
     * This main usage is on application exit, with the possibility to call callback functions
     *
     * @param {map} parameters: {
     *    fnSuccess: callback function in case of ExitApplication function import success,
     *    fnError: callback function in case of ExitApplication function import error,
     *    bDestroy: indicator that we are leaving the application. We can use a raw request to ensure that request is sent. Callbacks would not be called
     *
     */
    exitApplication: function(mParameters) {
      mParameters = mParameters || {};

      //We are trying to exit the application. A super application unload might already have triggered the ExitApplication call.
      //In this case, we directly call the call back function.
      if (this.bExitCalled === true) {
        if ("function" === typeof mParameters.fnSuccess) {
          mParameters.fnSuccess();
        }
        return;
      }

      var sSelectedPernr = ODataModelUtil.get().getCurrentTripContext().Pernr;
      var oModel = this.getModel();

      //do not provide a new pernr when leaving the app, otherwise backend get the profile back and lock again the app
      var sNewPernr = sSelectedPernr;
      if (mParameters && mParameters.bDestroy === true) {
        sNewPernr = "";
      }

      //Exit Application - Unlock Employee Number
      PersistenceHelper.callFunction(oModel, {
        name: "/ExitApplication",
        success: mParameters.fnSuccess,
        error: mParameters.fnError,
        urlParameters: {
          Pernr: sSelectedPernr,
          NewPernr: sNewPernr
        }
      });
    }

  });
});

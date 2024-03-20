/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
jQuery.sap.registerModulePath('CryptoJS',jQuery.sap.getModulePath("sap/fin/travel/lib/reuse")+'/thirdparty/CryptoJS/sha1');sap.ui.define(["sap/ui/base/Object","sap/ui/core/mvc/ViewType","sap/fin/travel/lib/reuse/util/FCLayoutHandler","sap/fin/travel/lib/reuse/util/EventHandler","sap/fin/travel/lib/reuse/util/FormatHandler","sap/fin/travel/lib/reuse/util/AnnotationHelper","sap/fin/travel/lib/reuse/util/ConfigurationUtil","sap/fin/travel/lib/reuse/util/Utils","sap/fin/travel/lib/reuse/util/TravelUtil","sap/fin/travel/lib/reuse/util/AppComponent","sap/fin/travel/lib/reuse/util/StableIdDefinition","sap/fin/travel/lib/reuse/util/StableIdHelper","sap/fin/travel/lib/reuse/util/AppDescriptorUtil","CryptoJS"],function(B,V,F,E,a,A,C,U,T,b,S,c,d,e){"use strict";function g(k){if(U.isEmptyObjectOrString(k)){return undefined;}var l=k;l.pop();var p="";var m="";var r=[];for(var i=0;i<l.length;i++){p=p+m+l[i];r.push(p);m="/";}return r;}function f(o,i){var k=e.SHA1(JSON.stringify(o.getModel().getServiceMetadata())).toString();var l=i.getId();var m=i.getManifestEntry("sap.app").applicationVersion.version;var L=sap.ui.getCore().getLoadedLibraries()["sap.fin.travel.lib.reuse"];L=L&&L.version;var n=L+"-"+l+"-"+m+"-"+k;return n;}function h(){return s;}var j=B.extend("sap.fin.travel.lib.reuse.util.BaseComponentHandler");j.destroy=function(){s=undefined;};var s=undefined;j.createComponentContent=function(o,i){if(undefined===s){s=f(o,o.getComponentData().oAppComponent);}var m=o.getModel().getMetaModel();var k=m.getODataEntitySet(i.entitySet);var l=k&&k.entityType;var n=i&&i.view&&i.view.id;if(!l){return null;}var p=m.createBindingContext(m.getODataEntitySet(i.entitySet,true));var q=m.createBindingContext(m.getODataEntityType(l,true));o.setModel(new sap.ui.model.json.JSONModel(i.view),"view");if(!o.getAppComponent&&o.getComponentData().oAppComponent){o.getAppComponent=function(){return o.getComponentData().oAppComponent;};}o.promiseViewProcessed=new Promise(function(r,t){o.runAsOwner(function(){var u=j.createBaseController(i.controller.name);var P={xml:{bindingContexts:{entitySet:p,entityType:q},models:{entitySet:m,entityType:m,parameter:j.createParameterModel(o,l,m,i.entitySet)}}};var v=h();u.oPreprocessors=P;var w={async:true,preprocessors:P,id:n,type:V.XML,viewName:i.view.name,height:"100%",controller:u,cache:{keys:[v]}};u.extension=i.extension;var x=sap.ui.view(w);o.oViewContainer.addContent(x);x.attachAfterInit(function(){r(u);});});});};j.createBaseController=function(i){var o=sap.ui.controller(i);var k=new F(o);var l=new E(o);var m=new a(o);o._fclHandler={};o._eventHandler={};o._formatHandler={};jQuery.extend(o._fclHandler,k);jQuery.extend(o._eventHandler,l);jQuery.extend(o._formatHandler,m);o.getEventHandler=function(){return o._eventHandler;};return o;};j.createParameterModel=function(o,i,m,k){var l={pages:[],settings:[]};A.listAppPages(b.get().getConfig(),l);return new sap.ui.model.json.JSONModel({entitySet:k,entityType:i,appManifest:o.oAppManifest.hasOwnProperty("sap.ui.generic.app")?o.oAppManifest:o.oAppDescriptor,manifest:o.getManifest(),extensionFacets:d.prepareAfterFacet(o.getManifest()),pages:l.pages,settings:l.settings,metaModel:m,appComponentName:o.getMetadata().getComponentName(),configuration:C.checkVersion(),helper:{bool:{"true":true,"false":false}},stableId:{definition:S,aParameter:[],getStableId:c.getStableId},defaultButtons:T.DefaultButtons});};return j;},true);
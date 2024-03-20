/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([],function(){"use strict";function g(){var G={objectPageDynamicHeader:"1.54.3",smartFieldCheckValuesValidity:"1.64",commandExecution:"1.70",isTransient:"1.94",smartFilterBarFilterData:"1.99"};function c(v,s){var S,V;var a=s.split(".");var b=v.split(".");if(a.length<3){jQuery.sap.log.error("SAP UI5 version cannot be found!");return false;}for(var i=0;i<a.length;i++){if(b.length>=i+1){S=parseInt(a[i],10);V=parseInt(b[i],10);if(S>V){return true;}else if(S<V){return false;}}}return true;}function C(){var v={sapUIVersion:sap.ui.version};for(var p in G){v[p]=c(G[p],v.sapUIVersion);}return v;}return{global:G,checkVersion:C,compareVersion:c};}return g();},true);

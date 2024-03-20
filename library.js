/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["jquery.sap.global","sap/ui/core/library","sap/ui/core/IconPool"],function(q,l,i){"use strict";sap.ui.getCore().initLibrary({name:"sap.fin.travel.lib.reuse",version:"2.0.49",dependencies:["sap.ui.core"],types:[],interfaces:[],controls:["sap.fin.travel.lib.reuse.controls.Attachments","sap.fin.travel.lib.reuse.controls.UploadCollectionExtension","sap.fin.travel.lib.reuse.util.formatters"],elements:[]});this.sStyleSheetId="TravelLibReuseStyleSheet";q.sap.includeStyleSheet(q.sap.getModulePath("sap.fin.travel.lib.reuse.css.travellibreuse",".css"),this.sStyleSheetId);i.addIcon("custom-add-attachment","customIcons","custom-icons","0061");i.addIcon("custom-add-link","customIcons","custom-icons","0062");i.addIcon("custom-add-note","customIcons","custom-icons","0063");if(!String.prototype.startsWith){Object.defineProperty(String.prototype,'startsWith',{value:function(s,p){return this.substr(!p||p<0?0:+p,s.length)===s;}});}if(!String.prototype.endsWith){String.prototype.endsWith=function(s,t){if(t===undefined||t>this.length){t=this.length;}return this.substring(t-s.length,t)===s;};}if(!Array.from){Array.from=(function(){var t=Object.prototype.toString;var a=function(f){return typeof f==='function'||t.call(f)==='[object Function]';};var b=function(v){var n=Number(v);if(isNaN(n)){return 0;}if(n===0||!isFinite(n)){return n;}return(n>0?1:-1)*Math.floor(Math.abs(n));};var m=Math.pow(2,53)-1;var c=function(v){var d=b(v);return Math.min(Math.max(d,0),m);};return function from(d){var C=this;var e=Object(d);if(d==null){throw new TypeError('Array.from requires an array-like object - not null or undefined');}var f=arguments.length>1?arguments[1]:void undefined;var T;if(typeof f!=='undefined'){if(!a(f)){throw new TypeError('Array.from: when provided, the second argument must be a function');}if(arguments.length>2){T=arguments[2];}}var g=c(e.length);
// 13. If IsConstructor(C) is true, then
var A=a(C)?Object(new C(g)):new Array(g);var k=0;var h;while(k<g){h=e[k];if(f){A[k]=typeof T==='undefined'?f(h,k):f.call(T,h,k);}else{A[k]=h;}k+=1;}A.length=g;return A;};}());}if(!Array.prototype.find){Object.defineProperty(Array.prototype,'find',{value:function(p){if(this==null){throw new TypeError('"this" is null or not defined');}var o=Object(this);var a=o.length>>>0;if(typeof p!=='function'){throw new TypeError('predicate must be a function');}var t=arguments[1];var k=0;while(k<a){var b=o[k];if(p.call(t,b,k,o)){return b;}k++;}return undefined;},configurable:true,writable:true});}return sap.fin.travel.lib.reuse;},false);
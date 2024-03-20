/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([],function(){"use strict";var s=new Map();return{getState:function(i){return s.get(i);},setState:function(i,v){s.set(i,v);},hasState:function(i){return s.has(i);},resetState:function(i){return s.delete(i);},SUBMIT_ON_SIDEFFECT:"SIDEEFFECT"};},true);

/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

    var mStates = new Map();
    
	/**
	 * 
	 */
	return {
        getState: function(id){ return mStates.get(id); },
        setState: function(id, val){ mStates.set(id, val); }, 
        hasState: function(id){ return mStates.has(id); },
        resetState: function(id) { return mStates.delete(id); },
        SUBMIT_ON_SIDEFFECT: "SIDEEFFECT"
    };

}, true);

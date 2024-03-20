/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([],function(){"use strict";function g(){function G(o,k){if(o&&o.getCustomData()&&o.getCustomData().length>0){for(var i=0;i<o.getCustomData().length;i++){if(o.getCustomData()[i]&&k===o.getCustomData()[i].getKey()){return o.getCustomData()[i].getValue();}}}$.sap.log.warning("Custom Data not defined: "+k);return"";}function f(e){var c={};if(e instanceof sap.ui.core.Element){e.getCustomData().forEach(function(C){c[C.getKey()]=C.getValue();});}return c;}return{getCustomData:G,getObjectCustomData:f};}return g();},true);

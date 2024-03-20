/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([],function(){"use strict";return{toUTC:function(d){var n=null;if(d){n=new Date(d);n=new Date(n.getTime()-n.getTimezoneOffset()*60000);}return n;},retrieveUTCDateFromPickerEvent:function(e){var d,u;d=e.getSource().getDateValue();if(typeof d==="undefined"){d=e.getParameter("newValue");}u=this.toUTC(d);return u;}};});

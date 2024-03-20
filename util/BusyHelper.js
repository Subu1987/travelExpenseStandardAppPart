/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/BusyIndicator"],function(B){"use strict";var D=0;function s(c,d){if(c){c.setBusyIndicatorDelay(d?d:D);c.setBusy(true);}else{B.show(d?d:D);}}function h(c){if(c){c.setBusy(false);}else{B.hide();}}return{show:s,hide:h};});

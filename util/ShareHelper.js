/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/fin/travel/lib/reuse/util/AppComponent"],function(A){"use strict";function h(e){var g=A.get().getGlobalModel();var o=g.getProperty("/share/title");var O=g.getProperty("/share/subTitle");var E=o;if(O){E=E+" - "+O;}sap.m.URLHelper.triggerEmail(null,E,document.URL);}return{handleEmail:h};});

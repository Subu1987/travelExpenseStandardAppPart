/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/core/Control", "sap/ui/core/Icon", "sap/m/Label"], function(C, I, L) {
	"use strict";
	return C.extend("mytravelandexpense.uilib.control.IconWithNumber", {
		metadata: {
			properties: {
				count: {
					type: "string",
					defaultValue: 0
				}
			},
			aggregations: {
				_icon: {
					type: "sap.ui.core.Icon",
					multiple: false,
					visibility: "hidden"
				},
				_label: {
					type: "sap.m.Label",
					multiple: false,
					visibility: "hidden"
				}
			},
			events: {
				press: {}
			}
		},
		init: function() {
			var t = this.getAggregation("tooltip");
			this.setAggregation("_icon", new I({
				src: "sap-icon://attachment",
				decorative: true,
				width: "40%"
			}));
			this.setAggregation("_label", new L());
		},
		renderer: function(r, c) {
			var t = c.getAggregation("tooltip");
			r.write("<div");
			r.writeControlData(c);
			r.addStyle("color", sap.ui.core.theming.Parameters.get("sapUiBrand"));
			r.writeStyles();
			r.addClass("TecIconWithNumber");
			r.writeClasses();
			r.write(">");
			var i = c.getAggregation("_icon");
			var l = c.getAggregation("_label");
			i.setAlt(t);
			i.setTooltip(t);
			l.setTooltip(t);
			l.setText([c.getProperty("count")]);
			r.renderControl(c.getAggregation("_icon"));
			r.renderControl(c.getAggregation("_label"));
			r.write("</div>");
		},
		ontap: function(e) {
			e.setMarked();
			if (this.getVisible()) {
				if ((e.originalEvent && e.originalEvent.type === "touchend")) {
					this.focus();
				}
				this.firePress({});
			}
		},
		onkeyup: function(e) {
			if (e.which === jQuery.sap.KeyCodes.SPACE || e.which === jQuery.sap.KeyCodes.ENTER) {
				e.setMarked();
				this.firePress({});
			}
		}
	});
});
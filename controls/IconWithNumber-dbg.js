/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/core/Icon",
	"sap/m/Label"
], function (Control, Icon, Label) {
	"use strict";
	return Control.extend("mytravelandexpense.uilib.control.IconWithNumber", {
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
				/**
				 * Fired when the user clicks or taps on the control.
				 */
				press: {}
			}
		},
		init: function () {

			var sTooltip = this.getAggregation("tooltip");

			this.setAggregation("_icon", new Icon({
				src: "sap-icon://attachment",
				decorative: true,
				width: "40%"
			}));

			this.setAggregation("_label", new Label());
		},
		renderer: function (oRM, oControl) {
			var sTooltip = oControl.getAggregation("tooltip");

			oRM.write("<div");
			oRM.writeControlData(oControl);
			oRM.addStyle("color", sap.ui.core.theming.Parameters.get("sapUiBrand"));
			oRM.writeStyles();
			oRM.addClass("TecIconWithNumber");
			oRM.writeClasses();
			oRM.write(">");

			var oIcon = oControl.getAggregation("_icon");
			var oLabel = oControl.getAggregation("_label");

			oIcon.setAlt(sTooltip);
			oIcon.setTooltip(sTooltip);
			oLabel.setTooltip(sTooltip);
			oLabel.setText([oControl.getProperty("count")]);

			oRM.renderControl(oControl.getAggregation("_icon"));
			oRM.renderControl(oControl.getAggregation("_label"));
			oRM.write("</div>");
		},
		/**
		 * Function is called when tap occurs on the control.
		 * @param {jQuery.Event} oEvent - the touch event.
		 * @private
		 */
		ontap: function (oEvent) {

			// mark the event for components that needs to know if the event was handled by the button
			oEvent.setMarked();

			// fire tap event
			if (this.getVisible()) {
				// note: on mobile, the press event should be fired after the focus is on the button
				if ((oEvent.originalEvent && oEvent.originalEvent.type === "touchend")) {
					this.focus();
				}

				this.firePress({ /* no parameters */ });
			}
		},
		/**
		 * Handle the key up event for SPACE and ENTER.
		 *
		 * @param {jQuery.Event} oEvent - the keyboard event.
		 * @private
		 */
		onkeyup: function (oEvent) {

			if (oEvent.which === jQuery.sap.KeyCodes.SPACE || oEvent.which === jQuery.sap.KeyCodes.ENTER) {

				// mark the event for components that needs to know if the event was handled by the button
				oEvent.setMarked();

				this.firePress({ /* no parameters */ });
			}
		}
	});
});

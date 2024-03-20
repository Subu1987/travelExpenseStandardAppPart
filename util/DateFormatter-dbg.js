/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function() {
	"use strict";

	return {
		/**
		 * Use the result of this method to update a property value in the model
		 * on a change event when a date is changed
		 * @param {Date} oDate : Date date to convert to UTC
		 * @return {*}
		 */
		toUTC: function(oDate) {
			var oNewDate = null;
			if (oDate) {
				oNewDate = new Date(oDate);
				oNewDate = new Date(oNewDate.getTime() - oNewDate.getTimezoneOffset() * 60000);
			}
			return oNewDate;
		},

		/**
		 * Utility function that returns a Date object brought by a DatePicker or DateTimePicker event
		 * @param {Event} oEvent Date or Datetime picker event
		 * @returns {Date} the new date object brought by the event
		 */
		retrieveUTCDateFromPickerEvent: function(oEvent) {
			//if the event comes from a datetime picker
			var oDate, oUTCDate;
			oDate = oEvent.getSource().getDateValue();

			//if the event comes from a date picker
			if (typeof oDate === "undefined") {
				oDate = oEvent.getParameter("newValue");
			}
			oUTCDate = this.toUTC(oDate);
			return oUTCDate;
		}

	};

});

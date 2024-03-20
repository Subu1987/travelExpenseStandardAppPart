/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/PersistenceHelper",
	"sap/fin/travel/lib/reuse/util/TravelUtil",
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/ui/model/resource/ResourceModel",
	"sap/fin/travel/lib/reuse/util/DateFormatter",
	"sap/fin/travel/lib/reuse/util/MessageUtil",
	"sap/ui/core/MessageType",
	"sap/m/MessageToast",
	"sap/fin/travel/lib/reuse/util/FragmentHelper",
	"sap/fin/travel/lib/reuse/util/MessageParser"
], function (PersistenceHelper, Travel, I18n, ResourceModel, DateFormatter, MessageUtil, MessageType, MessageToast, FragmentHelper,
	MessageParser) {
	"use strict";

	var sTripBreakFragmentId = "TripBreakFragmentId"; //const
	var oTripBreakDialogModel = new sap.ui.model.json.JSONModel();

	/**
	 * Handle trip break action. It displays a dialog to capture necessary inputs.
	 * There are calls to GetMaxOccurences function imports when needed, and upon trip break creation, a function import call to CreateTripBreak is performed.
	 * We assume that event is triggered from a button within the entity set table toolbar (smarttable is two parents away from the button)
	 *
	 * @param {object} oEventControl
	 * @param {object} oController mandatory as we do need to access the model of the controller for backend call to the function imports
	 */
	function onAddEntryTripBreakDestination(oEventControl, oController) {
		var oMainSource = oEventControl.getSource();
		//1 - Open the dialog to get input values
		FragmentHelper.get().loadFragment({
			id: sTripBreakFragmentId,
			name: "sap.fin.travel.lib.reuse.view.fragments.TripBreak",
			controller: this,
			models: {
				i18n: oController.getView().getModel("i18n")
			}
		}).then(function (oTripBreakFragment) {
			oTripBreakFragment.addCustomData(new sap.ui.core.CustomData({
				key: "oParent",
				value: null
			}));

			//attach model to the fragment. i18n model used for these controls has to be in the reuse namespace. We do not look for other components' i18n
			oTripBreakFragment.setModel(oTripBreakDialogModel, "tripBreakDialogModel");

			//attach events to the different inputs
			var recComboBox = sap.ui.core.Fragment.byId(sTripBreakFragmentId, "recurrenceInput");
			recComboBox.attachSelectionChange(oController, fnHandleTripBreakRecurrenceChange);

			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "submitButton").attachPress(oController, fnCreateTripBreak);
			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "cancelButton").attachPress(function (oEvent) {
				oTripBreakFragment.close();
			});

			//smart table containing the button (smarttable > toolbar > button)
			oTripBreakFragment.data("oSmartTable", oMainSource.getParent().getParent());

			//set local model
			var oTripObject = oMainSource.getModel().getObject(oMainSource.getBindingContext().getPath());
			if (!oTripObject.Datedep) {
				MessageToast.show(I18n.get().getText(oController, "TRIP_BREAK_REQUIRES_START_DATE"));
				return;
			}

			var oStartDateTime = oTripObject.Datedep && oTripObject.Datedep.getTime();
			oStartDateTime = oTripObject.Timedep && oTripObject.Timedep.ms ? oStartDateTime + oTripObject.Timedep.ms : oStartDateTime;
			var oTBStart = new Date(oStartDateTime + 60000);
			var oTBEnd = new Date(oStartDateTime + 2 * 60000);
			var sTripno = oTripObject.Tripno;
			var sPernr = oTripObject.Pernr;

			var jsonData = {
				startDate: oTBStart,
				endDate: oTBEnd,
				recurrence: "N",
				number: "1",
				numberEditable: false,
				pernr: sPernr,
				tripno: sTripno,
				stripMessage: "",
				stripType: MessageType.None
			};
			oTripBreakDialogModel.setData(jsonData);

			//adjust values in the
			var oStartDate = oTripObject.Datedep;
			var oEndDate = oTripObject.Datearr;
			if (oEndDate === null) {
				oEndDate = oStartDate;
			}

			//Control do not check min date and max date properly. Input is displayed in UTC (but actual value is a javascript date), and the UTC display is verified against these min date and max date which are a javascript date object. As a consequence, min dates and max dates are checking for a range which is completely incorrect.
			//we deactivate these checks as irrelevant...
			/*sap.ui.core.Fragment.byId(sTripBreakFragmentId, "startDateInput").setMinDate(
				new Date(oStartDate.getUTCFullYear(), oStartDate.getUTCMonth(), oStartDate.getUTCDate(), oStartDate.getUTCHours(), oStartDate.getUTCMinutes(),
					oStartDate.getUTCSeconds()));
			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "startDateInput").setMaxDate(
				new Date(oEndDate.getUTCFullYear(), oEndDate.getUTCMonth(), oEndDate.getUTCDate(), oEndDate.getUTCHours(), oEndDate.getUTCMinutes(),
					oEndDate.getUTCSeconds()));
			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "endDateInput").setMinDate(
				new Date(oStartDate.getUTCFullYear(), oStartDate.getUTCMonth(), oStartDate.getUTCDate(), oStartDate.getUTCHours(), oStartDate.getUTCMinutes(),
					oStartDate.getUTCSeconds()));
			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "endDateInput").setMaxDate(
				new Date(oEndDate.getUTCFullYear(), oEndDate.getUTCMonth(), oEndDate.getUTCDate(), oEndDate.getUTCHours(), oEndDate.getUTCMinutes(),
					oEndDate.getUTCSeconds()));
			*/
			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "recurrenceInput").setSelectedKey("N");

			sap.ui.core.Fragment.byId(sTripBreakFragmentId, "numberTripBreakInput").setValueState(sap.ui.core.ValueState.None);

			oTripBreakFragment.open();
		});
	}

	function fnCreateTripBreak(oEvent, oController) {
		var oEventSource = oEvent.getSource();
		//prevent confirm if the number field is in value state error.
		var numberInput = sap.ui.core.Fragment.byId(sTripBreakFragmentId, "numberTripBreakInput");
		if (numberInput !== undefined && sap.ui.core.ValueState.Error === numberInput.getValueState()) {
			return;
		}

		var mParameters = {
			BeginDate: oTripBreakDialogModel.getProperty("/startDate"),
			EndDate: oTripBreakDialogModel.getProperty("/endDate"),
			Number: oTripBreakDialogModel.getProperty("/number"),
			Recurrence: oTripBreakDialogModel.getProperty("/recurrence"),
			Pernr: oTripBreakDialogModel.getProperty("/pernr"),
			Tripno: oTripBreakDialogModel.getProperty("/tripno")
		};

		var fnError = function (oData, oResponse) {
			//error should already be displayed. Nothing changed, error remains on the display
			if (oResponse === undefined) {
				return;
			}
			var error = MessageUtil.get().getErrorMessageResponse(oResponse);
			oTripBreakDialogModel.setProperty("/stripMessage", error.hasOwnProperty("message") ? error.message : error);
			var sErrorType = error.hasOwnProperty("type") ? MessageParser.ErrorType.toMessageType(error.type) : MessageType.Error;
			oTripBreakDialogModel.setProperty("/stripType", sErrorType);
		};

		var fnSuccess = function (oData, oResponse) {
			//check for potential errors: if there is no response, we verify if strip message is filled.
			//If there is a response, we verify if the functional error are there

			//Otherwise, in case of success, refresh the table and close the dialog.
			var oTripBreakFragment = FragmentHelper.get().getFragment(sTripBreakFragmentId);
			if (oTripBreakFragment) {
				var oSmartTable = oTripBreakFragment.data("oSmartTable");
				oSmartTable.rebindTable();
				oTripBreakFragment.close();
			}
		};

		var fnSuccessSubmit = function () {
			PersistenceHelper.callFunction(oController.getView().getModel(), {
				name: "/CreateTripBreak",
				settings: {
					async: true,
				},
				source: oEventSource,
				urlParameters: mParameters,
				success: fnSuccess,
				functionalError: fnError,
				error: fnError
			});
		};

		PersistenceHelper.submitChanges(oController.getView().getModel(), {
			source: oEventSource,
			success: fnSuccessSubmit,
			functionalError: fnSuccessSubmit, //in case of functional error in the global model, we still try to create the trip break
			error: fnError,
			submitChangeOrigin: PersistenceHelper.SUBMIT_CHANGE_ORIGIN.ACTION,
		});

	}

	function fnHandleTripBreakNumberChange(oEvent, oController) {
		var result = Number(oEvent.getSource().getValue());
		//0 is not a valid value for trip break, we put the field in error
		if (result > 0) {
			// use the value from the control that may have been changed by the validator
			oEvent.getSource().setValue(result);
			//Get binding property
			var property = oEvent.getSource().getBindingInfo("value").binding.getPath();
			oTripBreakDialogModel.setProperty(property, result);
		} else {
			oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			oEvent.getSource().setValueStateText(I18n.get().getText(oController, "TRIP_BREAK_RECURRENCE_ERROR"));
			oEvent.getSource().focus();
		}
	}

	function fnHandleTripBreakRecurrenceChange(oEvent, oController) {
		var oEventSource = oEvent.getSource();
		var that = this;
		if (oEvent.getParameter("selectedItem")) {
			oTripBreakDialogModel.setProperty("/recurrence", oEvent.getParameter("selectedItem").getProperty("key"));
		} else {
			oTripBreakDialogModel.setProperty("/recurrence", "N");
		}
		if (oTripBreakDialogModel.getProperty("/recurrence") === "N") {
			oTripBreakDialogModel.setProperty("/number", "1");
			oTripBreakDialogModel.setProperty("/numberEditable", false);
		} else {
			oTripBreakDialogModel.setProperty("/numberEditable", true);
			var fnSuccess = function (oData) {
				oTripBreakDialogModel.setProperty("/number", oData.GetMaxOccurences.Value);
			};

			var mParameters = {
				BeginDate: oTripBreakDialogModel.getProperty("/startDate"),
				EndDate: oTripBreakDialogModel.getProperty("/endDate"),
				Recurrence: oTripBreakDialogModel.getProperty("/recurrence"),
				Pernr: oTripBreakDialogModel.getProperty("/pernr"),
				Tripno: oTripBreakDialogModel.getProperty("/tripno")
			};

			PersistenceHelper.callFunction(oController.getView().getModel(), {
				name: "/GetMaxOccurences",
				urlParameters: mParameters,
				source: oEventSource,
				success: fnSuccess,
				settings: {
					async: true
				}
			});
		}
	}

	//holds functional action
	return {
		handleAddTripBreak: onAddEntryTripBreakDestination
	};

});

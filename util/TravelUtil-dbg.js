/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

	/**
	 * Return various value related to a Travel Request entity and its associated entities. 
	 */
	return {
		TripNumber: {
			Initial: "0000000000",
			Mask: "9999999999"
		},
		Destination: {
			Main: "M",
			Additional: "N",
			TripBreak: "D"
		},
		PersistenceStatus: {
			New: 0,
			Save: 2
		},
		UserAction: {
			AutoSave: 1,
			Save: 2,
			Submit: 3,
			Draft: 4
		},
		TravelServices: {
			Flight: "OF",
			Hotel: " H",
			Car: "CE",
			Train: "OT"
		},
		DefaultButtons: {
			"AddListPage": "AddButtonListPageID",
			"AddExtendedListPage": "AddExtendedButtonListPageID",
			"CopyListPage": "CopyButtonListPageID",
			"DeleteListPage": "DeleteEntryButtonListPageID",
			"ExportListPage": "ExportButtonListPageID",
			"EditDetailPage": "EditButtonDetailPageID",
			"CopyDetailPage": "CopyButtonDetailPageID",
			"DeleteDetailPage": "DeleteButtonDetailPageID",
			"ExportDetailPage": "ExportButtonDetailPageID",
			"ShareDetailPage": "ShareButtonDetailPageID",
			"SaveAndSubmitFooterBar": "SaveAndSubmitFooterBarID",
			"ApplyFooterBar": "ApplyFooterBarID",
			"SaveFooterBar": "SaveFooterBarID",
			"SaveDraftFooterBar": "SaveDraftFooterBarID",
			"CancelFooterBar": "CancelFooterBarID"
		},
		Features: {
			"CheckMandatoryField": "checkMandatoryField"
		}
	};

}, true);

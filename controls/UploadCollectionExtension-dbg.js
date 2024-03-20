/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
// 
sap.ui.define([
		"jquery.sap.global",
		"jquery.sap.resources",
		"./../library",
		"sap/m/UploadCollection",
		"sap/fin/travel/lib/reuse/util/formatters",
		"sap/fin/travel/lib/reuse/util/FileUploadHelper",
		"sap/m/library",
		"sap/fin/travel/lib/reuse/util/TravelUtil",
		"sap/ui/model/json/JSONModel",
		"sap/fin/travel/lib/reuse/util/MessageParser",
		"sap/fin/travel/lib/reuse/util/Utils"
	],
	function (jQuery, resources, library, UploadCollection, formatter, FileUploadHelper, MobileLibrary, TravelUtil, JSONModel, MessageParser, Utils) {
		"use strict";
		var UploadCollectionExtension = UploadCollection.extend("sap.fin.travel.lib.reuse.controls.UploadCollectionExtension", {
			renderer: "sap.m.UploadCollectionRenderer"
		});

		/**
		 * Initialization hook, creating composite parts
		 */
		UploadCollectionExtension.prototype.init = function () {
			var that = this;

			this.bindProperty("uploadEnabled", {
				path: "Tripno",
				formatter: function (iValue) {
					return 0 !== parseInt(iValue);
				}
			});

			this.bFirstRender = true;
			this.sContextPath = "/";

			this.oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fin.travel.lib.reuse");

			// Create file uploader for Business Documents
			this.oFileUploader = new sap.ui.unified.FileUploader(this.getId() + "-bus_doc_file_uploader", {
				sendXHR: true,
				useMultipart: false,
				enabled: {
					parts: [
						{path: "Tripno"},
						{path: "Receiptno"}
					],
					formatter: function (sTripNo, sReceiptNo) {
						return 0 !== parseInt(sTripNo) || sReceiptNo != undefined;
					}	
				},
				placeholder: "test1",
				sameFilenameAllowed: true,
				change: function (oEvent) {
					FileUploadHelper.beforeUploadFile(oEvent);
				},
				typeMissmatch: function (oEvent) {
					FileUploadHelper.fileTypeMissmatchHandler(oEvent, that.oFileUploader.getMimeType());
				},
				fileSizeExceed: function (oEvent) {
					FileUploadHelper.fileSizeExceedHandler(oEvent, that.oFileUploader.getMaximumFileSize());
				},
				uploadComplete: function (oEvent) {
					FileUploadHelper.onBusDocUploadComplete(oEvent, that);
				}
			});

			// Execute standard control method
			sap.m.UploadCollection.prototype.init.apply(this, arguments);

			this.bindProperty("noDataText", {
				parts: [
					{path: "Tripno"},
					{path: "Receiptno"}
				],
				formatter: function (sTripNo, sReceiptNo) {
					return (0 === parseInt(sTripNo) && sReceiptNo == undefined) ? this.oResourceBundle.getText("ATTACHMENT_NO_DATA_UNSAVED_TRIP") : "";
				}
			});

			this.bindProperty("noDataDescription", {
				parts: [
					{path: "Tripno"},
					{path: "Receiptno"}
				],
				formatter: function (sTripNo, sReceiptNo) {
					return (0 === parseInt(sTripNo) && sReceiptNo == undefined) ? "" : this._isDragAndDropAllowed() ? this.oResourceBundle.getText("ATTACHMENT_NO_DATA_DRAG_DROP") :
						this.oResourceBundle
						.getText("ATTACHMENT_NO_DATA");
				}
			});

			// Attach event handlers 
			this.attachChange(FileUploadHelper.beforeUploadFile); // For GOS attachments
			this.attachUploadComplete(FileUploadHelper.onGOSUploadComplete);
			this.attachFileDeleted(FileUploadHelper.deleteUploadedFile);
		};

		UploadCollectionExtension.prototype.onBeforeRendering = function () {
			// Execute standard control method
			sap.m.UploadCollection.prototype.onBeforeRendering.apply(this, arguments);

			var that = this;

			// Hide the label
			this.getToolbar().getAggregation("content")[0].setVisible(false);

			// Hide the standar "+" button
			// Can't be done with setVisible(false) because otherwise the File Uploader
			// is not completely instanciated and doesn't work
			this.getToolbar().getAggregation("content")[2].addStyleClass("sapUiHiddenPlaceholder");

			// Sometime BindingContext is not yet defined
			this._buildControl();
			// Make sure binding context is set properly before building the control
			this.attachModelContextChange(function () {
				that._buildControl();
			});
		};

		UploadCollectionExtension.prototype._createIcon = function (item) {
			// Execute standard control method
			var oItemIcon = sap.m.UploadCollection.prototype._createIcon.apply(this, arguments);

			// In case the item is a link (mimetype empty), change the icon
			if (!item.getProperty("mimeType")) {
				oItemIcon.setSrc("sap-icon://chain-link");
			} else if (item.getProperty("mimeType") === "text/plain" && !item.getProperty("fileName").toLowerCase().endsWith(".txt")) {
				oItemIcon.setSrc("sap-icon://notes");
			}
			return oItemIcon;
		};

		UploadCollectionExtension.prototype._onItemPressed = function (event, item) {
			if (item.hasListeners("press")) {
				item.firePress();
			} else if (this.sErrorState !== "Error" && jQuery.trim(item.getProperty("url"))) {
				this._triggerLink(event, item);
			}
		};

		UploadCollectionExtension.prototype._triggerLink = function (event, item) {
			if (this.editModeItem) {
				//In case there is a list item in edit mode, the edit mode has to be finished first.
				this._handleOk(event, this.editModeItem, true);
				if (this.sErrorState === "Error") {
					//If there is an error, the link of the list item must not be triggered.
					return;
				}
				this.sFocusId = event.getParameter("id");
			}
			MobileLibrary.URLHelper.redirect(item.getProperty("url"), true);
		};

		UploadCollectionExtension.prototype.setUploadEnabled = function (bUploadEnabled) {
			// Execute standard control method
			var oUploadCollection = sap.m.UploadCollection.prototype.setUploadEnabled.apply(this, arguments);

			// Update the custom buttons
			var oAddAttachmentButton = sap.ui.getCore().byId(this.getId() + "-addAttachmentButton");
			if (oAddAttachmentButton) {
				oAddAttachmentButton.setEnabled(bUploadEnabled);
			}
			var oAddNoteButton = sap.ui.getCore().byId(this.getId() + "-addNoteButton");
			if (oAddNoteButton) {
				oAddNoteButton.setEnabled(bUploadEnabled);
			}
			var oAddLinkButton = sap.ui.getCore().byId(this.getId() + "-addLinkButton");
			if (oAddLinkButton) {
				oAddLinkButton.setEnabled(bUploadEnabled);
			}
			var oAddBusDocButton = sap.ui.getCore().byId(this.getId() + "-addBusDocButton");
			if (oAddBusDocButton) {
				oAddBusDocButton.setEnabled(bUploadEnabled);
			}

			return oUploadCollection;
		};

		UploadCollectionExtension.prototype._isDragAndDropAllowed = function () {
			// Execute standard control method
			var bIsDragAndDropEnabled = sap.m.UploadCollection.prototype._isDragAndDropAllowed.apply(this, arguments);

			var oBindingContext = this.getBindingContext();
			var bAttaEnabled, bArlEnabled;
			if (oBindingContext) {
				var oConfig = oBindingContext.getProperty("/UserProfiles('" + oBindingContext.getProperty("Pernr") + "')");
				bAttaEnabled = oConfig && oConfig.Attaenabled;
				bArlEnabled = oConfig && oConfig.Arlenabled;
			}
			return bIsDragAndDropEnabled && bAttaEnabled && !bArlEnabled;
		};

		UploadCollectionExtension.prototype.exit = function () {
			// Destroy all elements with stable ids
			this.oFileUploader.destroy();
			var aTbContent = this.getToolbar() && this.getToolbar().getAggregation("content");
			/*eslint-disable guard-for-in*/
			for (var i in aTbContent) {
				aTbContent[i].destroy();
			}
			/*eslint-enable guard-for-in*/
			if (this.oAddBusDocDialog) {
				this.oAddBusDocDialog.destroy();
			}
			if (this.oAddNoteDialog) {
				this.oAddNoteDialog.destroy();
			}
			if (this.oAddLinkDialog) {
				this.oAddLinkDialog.destroy();
			}

			// Execute standard control method
			sap.m.UploadCollection.prototype.exit.apply(this, arguments);
		};

		UploadCollectionExtension.prototype._buildControl = function () {
			var that = this, bInReceipt, docTypeForReceipt = "HRITRV_UPL";
			bInReceipt = false;
			if (that.getBindingContext() && that.getBindingContext().getPath() !== that.sContextPath) {
				// The same FileUploader is used, so we need to update the binding context
				that.oFileUploader.setBindingContext(that.getBindingContext());
				that.sContextPath = that.getBindingContext().getPath();
				
				// Add the new list of buttons at first rendering
				if (that.bFirstRender) {

					var oBindingContext = that.getBindingContext();
					var oConfig = oBindingContext.getProperty("/UserProfiles('" + oBindingContext.getProperty("Pernr") + "')");
					var bUrlAttachment = "${true}"; // Initialy no restriction for ArchiveLink attachments button
					var bAttachmentEditable = "{Attachmenteditable}"; //If disabled, no possibility to delete items nor upload link, note, or BO attachments
					
					//Attachment at receipt level - Only ArchiveLink attachments supported
					if (oBindingContext.getProperty("Receiptno")) {
						bInReceipt = true;
						oConfig.Attaenabled = false;
						oConfig.Noteenabled = false;
						oConfig.Urlenabled = false;
						bUrlAttachment = "!${DisplayMode}"; // In case of receipt ArchiveLink attachments button is visible only on edit mode.
					}
	
					// GOS attachments button
					if (oConfig && oConfig.Attaenabled) {
						that.getToolbar().addContent(
							new sap.m.Button({
								id: that.getId() + "-addAttachmentButton",
								icon: "sap-icon://customIcons/custom-add-attachment",
								enabled: "{= parseInt(${Tripno}) !== 0}",
								visible: bAttachmentEditable,
								type: sap.m.ButtonType.Transparent,
								tooltip: that.oResourceBundle.getText("ADD_ATTACHMENT"),
								press: function () {
									// Use the file uploader from Upload Collection
									var sTouchEvent = 'onclick' in window ? 'click' : 'touchstart';
									$(that._oFileUploader.oFileUpload).trigger(sTouchEvent);
								}
							})
						);

					}

					// Note button
					if (oConfig && oConfig.Noteenabled) {
						var fnAddNoteDialogResetAndClose = function () {
							sap.ui.getCore().byId(that.getId() + "-note_name").setValue("");
							sap.ui.getCore().byId(that.getId() + "-note_descrip").setValue("");
							that.oAddNoteDialog.close();
						};
						that.getToolbar().addContent(
							new sap.m.Button({
								id: that.getId() + "-addNoteButton",
								icon: "sap-icon://customIcons/custom-add-note",
								enabled: "{= parseInt(${Tripno}) !== 0}",
								visible: bAttachmentEditable,
								type: sap.m.ButtonType.Transparent,
								tooltip: that.oResourceBundle.getText("ADD_NOTE"),
								press: function (oEvent) {
									var oSource = oEvent.getSource();
									// Create the dialog to create notes if it doesn't exist
									if (!that.oAddNoteDialog) {
										that.oAddNoteDialog = new sap.m.Dialog({
											title: that.oResourceBundle.getText("ADD_NOTE"),
											content: [new sap.ui.layout.VerticalLayout({
												class: "sapUiContentPadding",
												visible: "{= ${uploadCollectionModel>/stripMessage}.length > 0}",
												width: "100%",
												content: new sap.m.MessageStrip({
													text: "{uploadCollectionModel>/stripMessage}",
													type: "{uploadCollectionModel>/stripType}",
													showIcon: true
												})
											}), new sap.ui.layout.form.Form({
												editable: true,
												layout: new sap.ui.layout.form.ResponsiveGridLayout(),
												formContainers: [
													new sap.ui.layout.form.FormContainer({
														formElements: [
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("NOTE_TITLE"),
																	labelFor: that.getId() + "-note_name",
																	required: true
																}),
																fields: new sap.m.Input(that.getId() + "-note_name", {
																	maxLength: 50
																})
															}),
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("NOTE_TEXT"),
																	labelFor: that.getId() + "-note_descrip",
																	required: true
																}),
																fields: new sap.m.TextArea(that.getId() + "-note_descrip", {})
															})
														]
													})
												]
											})],
											beginButton: new sap.m.Button({
												text: that.oResourceBundle.getText("ADD"),
												type: "Emphasized",
												press: function () {
													var sName = sap.ui.getCore().byId(that.getId() + "-note_name").getValue();
													if (oSource.getBindingContext().getProperty("Tripno") === sap.fin.travel.lib.reuse.util.TravelUtil.TripNumber.Initial) {
														// It is not possible to add attachment in creation mode
														sap.m.MessageBox.show(
															that.oResourceBundle.getText("NOTEUPLOAD_ERROR_NOTE_BEFORE_UPLOAD", sName), {
																icon: sap.m.MessageBox.Icon.ERROR,
																title: that.oResourceBundle.getText("ERROR"),
																details: that.oResourceBundle.getText("FILEUPLOAD_ERROR_IN_CREATION_MODE_FILE_BEFORE_UPLOAD"),
																actions: [sap.m.MessageBox.Action.CLOSE]
															});
														return;
													}
													var sDescrip = sap.ui.getCore().byId(that.getId() + "-note_descrip").getValue();
													if (!sName || !sDescrip || sName.trim().length === 0 || sDescrip.trim().length === 0) {
														sap.m.MessageToast.show(that.oResourceBundle.getText("REQ_FIELD_ALERT"));
														return;
													}
													var fnError = function (oError) {
														var oUploadCollectionModel = that.oAddNoteDialog.getModel("uploadCollectionModel");
														if (sap.fin.travel.lib.reuse.util.MessageUtil.get().handleMessageResponse(oError)) {
															var error = sap.fin.travel.lib.reuse.util.MessageUtil.get().getErrorMessageResponse(oError);
															oUploadCollectionModel.setProperty("/stripMessage", error.hasOwnProperty("message") ? error.message : error);
															var sErrorType = error.hasOwnProperty("type") ? MessageParser.ErrorType.toMessageType(error.type) : sap.ui.core.MessageType.Error;
															oUploadCollectionModel.setProperty("/stripType", sErrorType);
														} else {
															oUploadCollectionModel.setProperty("/stripMessage", sap.fin.travel.lib.reuse.util.MessageUtil.get().getErrorMessage(
																oError));
															oUploadCollectionModel.setProperty("/stripType", sap.ui.core.MessageType.Error);
														}
													};
													var fnSuccess = function () {
														var oUploadCollectionModel = that.oAddNoteDialog.getModel("uploadCollectionModel");
														oUploadCollectionModel.setProperty("/stripMessage", "");
														oUploadCollectionModel.setProperty("/stripType", sap.ui.core.MessageType.None);
														fnAddNoteDialogResetAndClose();
													};
													sap.fin.travel.lib.reuse.util.FileUploadHelper.uploadText(sName, sDescrip, true, that, fnSuccess, fnError);
												}
											}),
											endButton: new sap.m.Button({
												text: that.oResourceBundle.getText("CANCEL"),
												press: fnAddNoteDialogResetAndClose
											})
										});
										that.oAddNoteDialog.setModel(new sap.ui.model.json.JSONModel({
											stripMessage: "",
											stripType: sap.ui.core.MessageType.None
										}), "uploadCollectionModel");
									}
									var oUploadCollectionModel = that.oAddNoteDialog.getModel("uploadCollectionModel");
									oUploadCollectionModel.setProperty("/stripMessage", "");
									oUploadCollectionModel.setProperty("/stripType", sap.ui.core.MessageType.None);
									that.oAddNoteDialog.open();
								}
							})
						);
					}

					// URL button
					if (oConfig && oConfig.Urlenabled) {
						var fnAddLinkDialogResetAndClose = function () {
							sap.ui.getCore().byId(that.getId() + "-link_name").setValue("");
							sap.ui.getCore().byId(that.getId() + "-link_descrip").setValue("");
							that.oAddLinkDialog.close();
						};
						that.getToolbar().addContent(
							new sap.m.Button({
								id: that.getId() + "-addLinkButton",
								icon: "sap-icon://customIcons/custom-add-link",
								enabled: "{= parseInt(${Tripno}) !== 0}",
								visible: bAttachmentEditable,
								type: sap.m.ButtonType.Transparent,
								tooltip: that.oResourceBundle.getText("ADD_LINK"),
								press: function (oEvent) {
									var oSource = oEvent.getSource();
									// Create the dialog to create notes if it doesn't exist
									if (!that.oAddLinkDialog) {
										that.oAddLinkDialog = new sap.m.Dialog({
											title: that.oResourceBundle.getText("ADD_LINK"),
											content: [new sap.ui.layout.VerticalLayout({
												class: "sapUiContentPadding",
												visible: "{= ${uploadCollectionModel>/stripMessage}.length > 0}",
												width: "100%",
												content: new sap.m.MessageStrip({
													text: "{uploadCollectionModel>/stripMessage}",
													type: "{uploadCollectionModel>/stripType}",
													showIcon: true
												})
											}), new sap.ui.layout.form.Form({
												editable: true,
												layout: new sap.ui.layout.form.ResponsiveGridLayout(),
												formContainers: [
													new sap.ui.layout.form.FormContainer({
														formElements: [
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("LINK_TITLE"),
																	labelFor: that.getId() + "-link_name",
																	required: true
																}),
																fields: new sap.m.Input(that.getId() + "-link_name", {
																	maxLength: 50
																})
															}),
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("LINK_URL"),
																	labelFor: that.getId() + "-link_descrip",
																	required: true
																}),
																fields: new sap.m.Input(that.getId() + "-link_descrip", {
																	type: sap.m.InputType.Url
																})
															})
														]
													})
												]
											})],
											beginButton: new sap.m.Button({
												text: that.oResourceBundle.getText("ADD"),
												type: "Emphasized",
												press: function () {
													var sName = sap.ui.getCore().byId(that.getId() + "-link_name").getValue();
													if (oSource.getBindingContext().getProperty("Tripno") === sap.fin.travel.lib.reuse.util.TravelUtil.TripNumber.Initial) {
														// It is not possible to add attachment in creation mode
														sap.m.MessageBox.show(
															that.oResourceBundle.getText("LINKUPLOAD_ERROR_LINK_BEFORE_UPLOAD", sName), {
																icon: sap.m.MessageBox.Icon.ERROR,
																title: that.oResourceBundle.getText("ERROR"),
																details: that.oResourceBundle.getText("FILEUPLOAD_ERROR_IN_CREATION_MODE_FILE_BEFORE_UPLOAD"),
																actions: [sap.m.MessageBox.Action.CLOSE]
															});
														return;
													}
													var sDescrip = sap.ui.getCore().byId(that.getId() + "-link_descrip").getValue();
													if (!sName || !sDescrip || sName.trim().length === 0 || sDescrip.trim().length === 0) {
														sap.m.MessageToast.show(that.oResourceBundle.getText("REQ_FIELD_ALERT"));
														return;
													}
													var fnError = function (oError) {
														var oUploadCollectionModel = that.oAddLinkDialog.getModel("uploadCollectionModel");
														if (sap.fin.travel.lib.reuse.util.MessageUtil.get().handleMessageResponse(oError)) {
															var error = sap.fin.travel.lib.reuse.util.MessageUtil.get().getErrorMessageResponse(oError);
															oUploadCollectionModel.setProperty("/stripMessage", error.hasOwnProperty("message") ? error.message : error);
															var sErrorType = error.hasOwnProperty("type") ? MessageParser.ErrorType.toMessageType(error.type) : sap.ui.core.MessageType.Error;
															oUploadCollectionModel.setProperty("/stripType", sErrorType);
														} else {
															oUploadCollectionModel.setProperty("/stripMessage", sap.fin.travel.lib.reuse.util.MessageUtil.get().getErrorMessage(
																oError));
															oUploadCollectionModel.setProperty("/stripType", sap.ui.core.MessageType.Error);
														}
													};
													var fnSuccess = function () {
														var oUploadCollectionModel = that.oAddLinkDialog.getModel("uploadCollectionModel");
														oUploadCollectionModel.setProperty("/stripMessage", "");
														oUploadCollectionModel.setProperty("/stripType", sap.ui.core.MessageType.None);
														fnAddLinkDialogResetAndClose();
													};
													sap.fin.travel.lib.reuse.util.FileUploadHelper.uploadText(sName, sDescrip, false, that, fnSuccess, fnError);
												}
											}),
											endButton: new sap.m.Button({
												text: that.oResourceBundle.getText("CANCEL"),
												press: fnAddLinkDialogResetAndClose
											})
										});
										that.oAddLinkDialog.setModel(new sap.ui.model.json.JSONModel({
											stripMessage: "",
											stripType: sap.ui.core.MessageType.None
										}), "uploadCollectionModel");
									}
									var oUploadCollectionModel = that.oAddLinkDialog.getModel("uploadCollectionModel");
									oUploadCollectionModel.setProperty("/stripMessage", "");
									oUploadCollectionModel.setProperty("/stripType", sap.ui.core.MessageType.None);
									that.oAddLinkDialog.open();
								}
							})
						);
					}

					// ArchiveLink attachments button
					if (oConfig && oConfig.Arlenabled) {
						var fnAddBusDocDialogResetAndClose = function () {
							sap.ui.getCore().byId(that.getId() + "-bus_doc_type_select").setSelectedItemId("");
							sap.ui.getCore().byId(that.getId() + "-bus_doc_descrip").setValue("");
							that.oFileUploader.clear();
							var aParams = that.oFileUploader.removeAllHeaderParameters();
							aParams.forEach(function (oParam) {
								oParam.destroy();
							});
							that.oAddBusDocDialog.close();
						};
						var sDocDescription;
						that.getToolbar().addContent(
							new sap.m.Button({
								id: that.getId() + "-addBusDocButton",
								icon: "sap-icon://add-document",
								enabled: {
									parts: [
										{path: "Tripno"},
										{path: "Receiptno"}
									],
									formatter: function (sTripNo, sReceiptNo) {
										return 0 !== parseInt(sTripNo) || sReceiptNo != undefined;
									}	
								},
								visible: bInReceipt ? "{= " + bUrlAttachment + "}" : bAttachmentEditable, //receipt level, only edit mode possible. header level, GOSINDISPLAY can its say
								type: sap.m.ButtonType.Transparent,
								tooltip: that.oResourceBundle.getText("ADD_BUS_DOC"),
								press: function () {
									// Create the dialog to create business documents if it doesn't exist
									sDocDescription = "";
									if (!that.oAddBusDocDialog) {
										that.oAddBusDocDialog = new sap.m.Dialog({
											title: that.oResourceBundle.getText("ADD_BUS_DOC"),
											content: new sap.ui.layout.form.Form({
												editable: true,
												layout: new sap.ui.layout.form.ResponsiveGridLayout(),
												formContainers: [
													new sap.ui.layout.form.FormContainer({
														formElements: [
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("DOC_TYPE"),
																	labelFor: that.getId() + "-bus_doc_type_select",
																	required: true,
																	visible: !bInReceipt
																}),
																fields: new sap.m.Select(that.getId() + "-bus_doc_type_select", {
																	change: function (oEvent) {
																		// Update the HTTP header parameter
																		var oParam = that.oFileUploader.removeHeaderParameter("Document-Type");
																		if (oParam) {
																			oParam.destroy();
																		}
																		var oDocTypeId = oEvent.getSource().getSelectedItem().getKey();
																		that.oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter("Document-Type", {
																			name: "Document-Type",
																			value: bInReceipt?docTypeForReceipt:oDocTypeId
																		}));

																		// Dynamically change the FileUploader properties according to the selected document type
																		var oDocType = that.getModel().getProperty("/DocumentTypes('" + oDocTypeId + "')");
																		that.oFileUploader.setMimeType(oDocType.AllowedMimetypes.split(";"));
																		that.oFileUploader.setMaximumFileSize(parseFloat(oDocType.MaxSize) / 1024 / 1024);
																	},
																	visible: !bInReceipt,
																	forceSelection: bInReceipt
																})
															}),
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("FILE_PATH"),
																	labelFor: that.getId() + "-bus_doc_file_uploader",
																	required: true
																}),
																fields: that.oFileUploader
															}),
															new sap.ui.layout.form.FormElement({
																label: new sap.m.Label({
																	text: that.oResourceBundle.getText("DESCRIPTION"),
																	labelFor: that.getId() + "-bus_doc_descrip"
																}),
																fields: new sap.m.Input(that.getId() + "-bus_doc_descrip", {
																	liveChange: function (oEvent) {
																		sDocDescription = oEvent.getSource().getValue();
																	},
																	maxLength: 60
																})
															})
														]
													})
												]
											}),
											beginButton: new sap.m.Button({
												text: that.oResourceBundle.getText("UPLOAD"),
												type: "Emphasized",
												press: function () {
													if (!sap.ui.getCore().byId(that.getId() + "-bus_doc_type_select").getSelectedItemId() || !that.oFileUploader.getValue()) {
														sap.m.MessageToast.show(that.oResourceBundle.getText("REQ_FIELD_ALERT"));
														return;
													}
													
													//retrieve doc description if any
													if (!Utils.isEmptyObjectOrString(sDocDescription)){
													that.oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
																			name: "Document-Description",
																			value: encodeURI(sDocDescription)
																		}));
													}
													
													
													that.oFileUploader.upload();
													fnAddBusDocDialogResetAndClose();
												}
											}),
											endButton: new sap.m.Button({
												text: that.oResourceBundle.getText("CANCEL"),
												press: fnAddBusDocDialogResetAndClose
											})
										});

										// Retrieve document types
										var oModel = that.getModel();
										that.oAddBusDocDialog.setModel(oModel);
										that.oAddBusDocDialog.setBindingContext(that.getBindingContext());
										sap.ui.getCore().byId(that.getId() + "-bus_doc_type_select").bindItems("/DocumentTypes",
											new sap.ui.core.Item({
												key: "{DocType}",
												text: "{Descr}"
											})
										);
									}
									that.oAddBusDocDialog.open();
								}
							})
						);
					}
				}

				that.bFirstRender = false;
			}
		};

		return UploadCollectionExtension;
	}, /* bExport= */ true);

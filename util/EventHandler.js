/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/base/Object", "sap/ui/model/Context", "sap/ui/core/XMLTemplateProcessor", "sap/ui/core/util/XMLPreprocessor",
	"sap/fin/travel/lib/reuse/util/AppComponent", "sap/fin/travel/lib/reuse/util/ODataModelUtil", "sap/m/MessageBox",
	"sap/fin/travel/lib/reuse/util/i18n", "sap/m/PDFViewer", "sap/m/MessageToast", "sap/fin/travel/lib/reuse/util/ActionUtil",
	"sap/fin/travel/lib/reuse/util/NavigationUtil", "sap/fin/travel/lib/reuse/util/MessageUtil", "sap/fin/travel/lib/reuse/util/TravelUtil",
	"sap/fin/travel/lib/reuse/util/PersistenceHelper", "sap/fin/travel/lib/reuse/util/FCLayoutUtil",
	"sap/fin/travel/lib/reuse/util/CustomDataUtil", "sap/fin/travel/lib/reuse/util/PaginatorHelper",
	"sap/fin/travel/lib/reuse/util/AnnotationHelper", "sap/m/PlacementType", "sap/ui/core/routing/HashChanger",
	"sap/ui/model/json/JSONModel", "sap/ui/base/Event", "sap/fin/travel/lib/reuse/util/ShareHelper",
	"sap/fin/travel/lib/reuse/util/FragmentHelper", "sap/ui/core/MessageType", "sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/ControlUtil", "sap/fin/travel/lib/reuse/util/ConfigurationUtil",
	"sap/fin/travel/lib/reuse/util/AppDescriptorUtil", "sap/fin/travel/lib/reuse/util/MessageParser"
], function(B, C, X, a, A, O, M, I, P, b, c, N, f, T, g, F, h, m, n, o, H, J, E, S, p, q, U, r, t, u, v) {
	"use strict";

	function w(x) {
		x._lastCreatedItem = new Map();

		function y(d, j, s) {
			var k = true;
			if (s && typeof s === "function" && t.compareVersion(t.global.smartFieldCheckValuesValidity, sap.ui.version)) {
				k = false;
			}
			f.get().cleanValidationMessages();
			var l = x.getView().byId.bind(x);
			if (true === j) {
				l = sap.ui.getCore().byId;
			}
			var v1 = $("[id*=TravelForm]").toArray();
			var _1 = [];
			var a2 = [];
			var b2 = "";
			var c2 = function(e, e2) {
				var i2 = e.getValueStateText();
				if (U.isEmptyObjectOrString(i2)) {
					var j2 = I.get().getText(x, e2, [e.getTextLabel()]);
					e.setValueStateText(j2);
					return j2;
				} else {
					return i2;
				}
			};
			var d2 = function() {
				if (_1 && _1.length > 0) {
					f.get().updateMessageManager(_1);
					return false;
				}
				return true;
			};
			for (var i = 0; i < v1.length; i++) {
				var sf = l(v1[i].id);
				if (sf && sf.getMetadata && sf.getMetadata().getName() === "sap.ui.comp.smartform.SmartForm" && sf.getBindingContext()) {
					var f2 = U.isEmptyObjectOrString(sf.getBindingContext()) || U.isEmptyObjectOrString(x.getView().getModel().getObject(sf.getBindingContext()
						.getPath()));
					if (f2) {
						continue;
					}
					var g2 = function(e) {
						e.setValueState("Error");
						_1.push({
							message: c2(e, "FIELD_ERROR"),
							target: e.getBindingContext().getPath() + "/" + e.getDataProperty().typePath
						});
					};
					sf.getSmartFields().forEach(function(e) {
						var e2 = false;
						var i2 = "";
						var j2 = e.getMandatory() && e.getEditable() && e.getVisible() && "string" === typeof e.getValue() && U.isEmptyObjectOrString(e.getValue());
						if (j2) {
							e.setValueState("Error");
							_1.push({
								message: c2(e, "MANDATORY_FIELD_ERROR"),
								target: e.getBindingContext().getPath() + "/" + e.getDataProperty().typePath
							});
						} else {
							e.setValueState(e.getValueState());
							if (false === k) {
								a2.push(e.checkValuesValidity().catch(function() {
									g2(e);
								}));
							} else {
								if (e.checkClientError()) {
									g2(e);
								}
							}
						}
					});
					if (j !== true && !U.isEmptyObjectOrString(sf.check())) {
						break;
					}
				}
			}
			if (true === k) {
				var h2 = d2();
				if (h2 && s && typeof s === "function") {
					s();
				}
				return h2;
			} else {
				if (0 === a2.length) {
					s();
					return;
				}
				Promise.all(a2).then(function(e) {
					if (d2()) {
						s();
					}
				});
			}
		}

		function _() {
			var s = x.getMetadata().getName();
			var d = x.getOwnerComponent().getManifest();
			var e = d && d["sap.ui5"] && d["sap.ui5"]["extends"] && d["sap.ui5"]["extends"]["extensions"] && d["sap.ui5"]["extends"]["extensions"]
				["sap.ui.controllerExtensions"] && d["sap.ui5"]["extends"]["extensions"]["sap.ui.controllerExtensions"][s] && d["sap.ui5"]["extends"]
				["extensions"]["sap.ui.controllerExtensions"][s]["sap.ui.generic.app"];
			return e;
		}

		function z() {
			var j = function(k) {
				var l;
				if (k && k.results) {
					$.each(k.results, function(i, e) {
						if (e.Isself === true) {
							l = k.results[0];
							return false;
						}
					});
				} else {
					l = k;
				}
				var b2 = x.getView().byId("listPageFilterBar");
				var c2 = function() {
					if (undefined === l) {
						b2.getControlByKey("Pernr").setValue("");
						b2.getControlByKey("Travelername").setValue("");
						A.get().updateGlobalModel("/userprofile", k.results.shift());
						return;
					}
					if (b2.getControlByKey("Pernr") && b2.getControlByKey("Travelername") && b2.getConditionTypeByKey("Datedep")) {
						var e = "FROM";
						var d = new Date();
						d.setMonth(d.getMonth() - 6);
						var i = sap.ui.core.format.DateFormat.getDateInstance().format(d);
						if (b2.getConditionTypeByKey("Datedep")) {
							b2.getConditionTypeByKey("Datedep").setOperation(e);
							b2.getConditionTypeByKey("Datedep").setDefaultValues(i, i);
						}
						if (b2.getControlByKey("Pernr")) {
							b2.getControlByKey("Pernr").setValue(l.Pernr);
						}
						if (b2.getControlByKey("Travelername")) {
							b2.getControlByKey("Travelername").setValue(l.Fullname);
						}
						var d2 = t.compareVersion(t.global.smartFilterBarFilterData, sap.ui.version);
						if (d2) {
							b2.setFilterData({
								Pernr: l.Pernr,
								Travelername: l.Fullname
							});
						}
						var e2 = undefined;
						if (b2.hasOwnProperty("_oFilterProvider") && b2._oFilterProvider.getModel() && b2._oFilterProvider.getModel().getData()) {
							e2 = b2._oFilterProvider.getModel().getData();
						}
						if (e2 && e2.hasOwnProperty("Datedep") && e2["Datedep"].hasOwnProperty("conditionTypeInfo") && e2["Datedep"].conditionTypeInfo.hasOwnProperty(
								"data")) {
							e2["Datedep"].conditionTypeInfo.data.operation = e;
							e2["Datedep"].conditionTypeInfo.data.value1 = d;
							b2.setFilterData(e2, false);
						}
						O.get().saveCurrentTripContext({
							Pernr: l.Pernr,
							Tripno: l.Unsavedtripnumber
						});
						A.get().updateGlobalModel("/userprofile", l);
						x.byId("template::FilterText").setText(b2.retrieveFiltersWithValuesAsText());
						var f2 = x.getView().byId("listPageSmartTableID");
						f2.setEnableAutoBinding(true);
						f2.rebindTable();
						b2.attachReset(function() {
							if (b2.getConditionTypeByKey("Datedep")) {
								b2.getConditionTypeByKey("Datedep").setDefaultValues(this.date, this.date);
							}
							b2.getControlByKey("Pernr").setValue(this.pernr);
							b2.getControlByKey("Travelername").setValue(this.travelername);
						}.bind({
							operation: e,
							date: i,
							pernr: l.Pernr,
							travelername: l.Fullname
						}));
					}
				};
				if (b2) {
					b2.attachInitialized(c2);
					c2();
				}
			};
			var s = {
				$skip: 0,
				$top: 1
			};
			var v1 = O.get().getCurrentTripContext();
			if (!U.isEmptyObjectOrString(v1) && v1.Pernr) {
				g.read(x.getView().getModel(), "/UserProfiles(Pernr='" + v1.Pernr + "')", {
					success: j
				});
			} else {
				g.read(x.getView().getModel(), "/UserProfiles", {
					success: j,
					urlParameters: s
				});
			}
			var _1 = function(d) {
				var b2 = d.getSource();
				var c2 = d.getParameter("context");
				var d2 = t.compareVersion(t.global.isTransient, sap.ui.version);
				var e2 = d2 ? true === c2.isTransient() : c2.bCreated === true;
				if (e2) {
					return;
				}
				var a2 = x.getView().getModel();
				var f2 = a2.getMetaModel();
				var g2 = f2.getODataEntitySet(c2.getPath().split("(")[0].substring(1));
				if (!g2) {
					return;
				}
				var h2 = g.SUBMIT_CHANGE_ORIGIN.UNKNOWN;
				var i2 = false;
				var j2 = _();
				j2 = j2 || [];
				Object.getOwnPropertyNames(j2).forEach(function(e, i, K2) {
					if (j2[e].EntitySet === g2.name) {
						if (j2[e].hasOwnProperty("Side-Effect") && false === j2[e]["Side-Effect"]) {
							i2 = true;
						}
					}
				});
				if (i2) {
					jQuery.sap.log.info("Side-effect is prevented: manifest configuration indicates a by-pass");
					return;
				}
				var k2 = c2.getProperty("DisplayMode");
				if (k2 && k2 === true) {
					return;
				}
				if (O.get().hasPendingChanges(a2)) {
					var l2;
					l2 = a2.getPendingChanges();
					if (l2 !== undefined) {
						if (c2 && c2 instanceof sap.ui.model.Context) {
							var m2 = r1(c2);
							var f2 = c2.getModel().getMetaModel();
							var n2 = f2.getODataEntitySet(m2).entityType;
							var o2 = f2.getODataEntityType(n2);
							var p2 = Object.keys(l2) || [];
							var q2 = p2.indexOf("__metadata");
							if (q2 > -1) {
								p2.splice(q2, 1);
							}
							var r2 = false;
							var s2 = "TravelExpenses" !== m2 && "TravelRequests" !== m2;
							var t2 = d.getParameter("path");
							var u2 = x.getOwnerComponent().getComponentData();
							if (!u2.hasOwnProperty("oAppDescriptor") || u.getFeature(u2.oAppDescriptor["sap.ui.generic.app"], T.Features.CheckMandatoryField) !==
								false) {
								for (var k = 0; k < o2.property.length; k++) {
									if (o2.property[k].name === t2) {
										if (o2.property[k].hasOwnProperty("sap:field-control")) {
											var v2 = o2.property[k]["sap:field-control"];
											var w2 = a2.getProperty(c2.getPath())[v2];
											var x2 = a2.getOriginalProperty(c2.getPath())[t2];
											var y2 = a2.getProperty(c2.getPath())[t2];
											if (w2 === 7 && (U.isEmptyObjectOrString(x2) || U.isEmptyObjectOrString(y2))) {
												r2 = true;
												h2 = g.SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_MANDATORY;
												break;
											}
										}
										break;
									}
								}
							}
							var z2 = [];
							var A2 = c2.getModel().getServiceAnnotations();
							for (var B2 in A2) {
								if (B2 === n2) {
									for (var C2 in A2[n2]) {
										if (C2 === "com.sap.vocabularies.Common.v1.SideEffects#SideEffects") {
											var D2 = A2[n2]["com.sap.vocabularies.Common.v1.SideEffects#SideEffects"];
											if (D2.hasOwnProperty("SourceProperties")) {
												if (D2.SourceProperties.length == 0) {
													r2 = true;
													h2 = g.SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION;
												} else {
													for (var k = 0; k < D2.SourceProperties.length; k++) {
														for (var l = 0; l < p2.length; l++) {
															if (l2[p2[l]].hasOwnProperty(D2.SourceProperties[k].PropertyPath)) {
																r2 = true;
																h2 = g.SUBMIT_CHANGE_ORIGIN.SIDEEFFECT_ANNOTATION;
															}
														}
													}
												}
												if (D2.hasOwnProperty("TargetEntities")) {
													if (D2.TargetEntities.length > 0) {
														for (var k = 0; k < D2.TargetEntities.length; k++) {
															var E2 = D2.TargetEntities[k].NavigationPropertyPath;
															var F2 = c2.getPath();
															var G2 = {};
															if (0 !== F2.indexOf("/")) {
																F2 = "/" + F2;
															}
															var H2 = true;
															if (H2) {
																if (E2 == undefined) {
																	z2.push(undefined);
																} else {
																	z2.push(E2);
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
							var I2 = function() {
								if (false === s2) {
									g.read(a2, F2);
								}
								for (var i = 0; i < z2.length; i++) {
									E2 = z2[i];
									g.read(a2, F2 + "/" + E2, G2);
								}
							};
							var J2 = function(e, i) {
								if (f.get().handleMessageResponse(e)) {
									var K2 = f.get().getErrorMessagesResponse(e);
									var L2 = K2.every(function(M2) {
										return v.ErrorType.toMessageType(M2.type) === q.Warning;
									});
									if (L2) {
										I2();
									}
								}
							};
							if (r2) {
								g.submitChanges(a2, {
									success: I2,
									functionalError: J2,
									source: b2,
									settings: {
										refreshAfterChange: s2
									},
									submitChangeOrigin: h2,
									draftIndicator: true
								});
							}
						}
					}
				}
			};
			var a2 = x.getView().getModel();
			a2.attachPropertyChange(_1);
		}

		function D(e) {
			var d = sap.ui.getCore().getMessageManager().getMessageModel();
			if (d && d.getData() && d.getData()[0]) {
				var i = d.getData()[0].type;
				var j = d.getData()[0].message;
				if (i === "Error") {
					f.get().showMessage({
						error: j
					});
				}
			}
		}

		function G(e) {
			var d = x.getView().byId("listPageFilterBar");
			var i = d.getControlByKey("Pernr").getValue();
			var s = O.get().getCurrentTripContext().Pernr;
			if (!U.isEmptyObjectOrString(i) && i !== s) {
				var j = x.getView().getModel();
				O.get().saveCurrentTripContext({
					Pernr: i,
					BindingPath: ""
				});
				var k = function(l) {
					if (l && l.Pernr === i) {
						O.get().saveCurrentTripContext({
							Tripno: l.Unsavedtripnumber
						});
					}
					N.navigateToRoot();
				};
				if (!U.isEmptyObjectOrString(s)) {
					g.callFunction(j, {
						name: "/ExitApplication",
						success: k,
						urlParameters: {
							Pernr: s,
							NewPernr: i
						}
					});
				} else {
					g.read(x.getView().getModel(), "/UserProfiles(Pernr='" + i + "')", {
						success: k
					});
				}
			}
		}

		function K(e) {
			var d = e.getSource();
			var s = d.getBindingContext().getPath();
			var i = new C(x.getView().getModel(), s);
			var j = O.get().getDraftItem(d);
			p.get().loadFragment({
				id: "TravelMessagePopoverFragmentID",
				name: "sap.fin.travel.lib.reuse.view.fragments.MessagePopover",
				controller: x,
				models: {
					i18n: x.getView().getModel("i18n"),
					message: x.getView().getModel("message")
				}
			}).then(function() {
				var k = function() {
					var v1 = O.get().getCurrentTripContext();
					var _1 = v1.BindingPath || d.getBindingContext().getPath().replace(/Tripno='\d+'/, "Tripno='" + v1.Tripno + "'");
					var a2 = d.getParent();
					K1(d.getParent(), d);
					var b2 = x.getOwnerComponent().getModel();
					O.get().resetChanges(b2);
					var c2 = function() {
						b2.invalidateEntry(s);
						var d2 = s.split("/").slice(-1).pop();
						N.navigate(d2, x.getView().getModel("view").getProperty("/level"));
					};
					W(a2, c2, undefined, v1.Pernr, v1.Tripno, _1, false, true);
				};
				var l = function() {
					K1(d.getParent(), d);
					var v1 = x.getOwnerComponent().getModel();
					v1.invalidateEntry(s);
					var _1 = s;
					N.navigate(_1, x.getView().getModel("view").getProperty("/level"));
				};
				L(k, l, j, i);
			});
		}

		function L(d, e, i, j) {
			var k = i && i.getProperty("DraftLinkType") === "Draft";
			var l = i && i.getProperty("DraftLinkType") === "UnsavedBy";
			var s = j && j.getProperty("Tripno");
			var v1 = i && i.getProperty("Tripno");
			if (k && v1 !== s) {
				var _1 = I.get().getText(x, "LEAVE_PAGE");
				M.show(I.get().getText(x, "BACK_WARNING"), {
					icon: M.Icon.WARNING,
					title: I.get().getText(x, "WARNING"),
					actions: [_1, M.Action.CANCEL],
					onClose: function(c2) {
						if (c2 === _1 && d && "function" === typeof d) {
							d();
						}
					}
				});
			} else if (l && v1 !== s) {
				var a2 = i.getProperty("DraftUserId");
				var b2 = x.getView().getId() + "UnsavedChangesDialogFragment";
				p.get().getUnsavedDialog(x, b2, v1, a2).then(d);
			} else if (e && "function" === typeof e) {
				e();
			}
		}

		function Q(e) {
			var d = e.getSource();
			K1(e.getSource().getParent(), e.getSource());
			var s = H.getInstance().getHash();
			var i = x.getView().getBindingContext() && x.getView().getBindingContext().getPath();
			var j = e.getSource().getBindingContext().getPath();
			var k = i + j;
			if (s.endsWith(i)) {
				k = s + j;
			}
			m.get().updateEntry(x.getView().getModel("view").getProperty("/level") + 1, j, e.getSource().getParent().getBindingInfo("items").binding
				.aKeys);
			var l = function() {
				N.navigate(k, x.getView().getModel("view").getProperty("/level"));
			};
			g.submitChanges(x.getView().getModel(), {
				source: d,
				success: l,
				functionalError: l,
				submitChangeOrigin: g.SUBMIT_CHANGE_ORIGIN.ITEM_PRESS,
			});
		}

		function R() {
			if (p.get().getFragment(x.sDraftDialogId)) {
				p.get().getFragment(x.sDraftDialogId).close();
			}
		}

		function V(e, s) {
			var d = x.getView().getModel();
			var i = s ? s : h.getCustomData(e.getSource(), "source");
			if (i === "cancel") {
				O.get().resetChanges(d);
				if (x.getView().getModel("view").getProperty("/level") === F.layout.midColumn.level) {
					var j = x.getView().getBindingContext().getProperty("Tripno");
					var k = x.getView().getBindingContext().getProperty("Pernr");
					W(i, undefined, undefined, k, j);
				} else {
					x._fclHandler.handleClose();
				}
			} else if (i === "close") {
				var l = x.getView().getBindingContext();
				if (!U.isEmptyObjectOrString(l) && d.getProperty(l.getPath())) {
					O.get().resetChanges(d, [l.getPath()]);
				}
				x._fclHandler.handleClose();
			} else if (i === "paginator") {
				var l = x.getView().getBindingContext();
				if (!U.isEmptyObjectOrString(l) && d.getProperty(l.getPath())) {
					O.get().resetChanges(d, [l.getPath()]);
				}
				var v1 = e.getParameter("navObjectPath") ? e.getParameter("navObjectPath") : h.getCustomData(e.getSource(), "navObjectPath");
				var _1 = e.getParameter("parentPath") ? e.getParameter("parentPath") : h.getCustomData(e.getSource(), "parentPath");
				m.get().updateEntry(x.getView().getModel("view").getProperty("/level"), v1);
				N.navigate(_1 + v1, x.getView().getModel("view").getProperty("/level"), true);
			}
			f.get().refreshValidationMessages(x.getView().getBindingContext().getPath());
			if (x.oDiscardDialog && x.oDiscardDialog.isOpen()) {
				x.oDiscardDialog.close();
			}
		}

		function W(s, d, e, i, j, k, l, v1) {
			var _1 = x.getView().getModel();
			k = k || x.getView().getBindingContext().getPath();
			if (_1.getProperty(k).hasOwnProperty("Persistencestatus") && _1.getProperty(k).Persistencestatus === T.PersistenceStatus.New) {
				n1(s, {
					sEntityName: I.get().getText(x, "OBJECT_TYPE"),
					fnSuccess: d,
					fnError: e,
					sEntityPath: k,
					bTriggerNavigation: l
				});
			} else {
				g.cancelTrip(_1, {
					success: function() {
						g.resetSubEntityChanges(_1, i, j);
						if (d && typeof d === "function") {
							d(arguments);
						}
					},
					error: e,
					urlParameters: {
						Tripno: j,
						Pernr: i
					},
					settings: {
						refreshAfterChange: !v1
					},
					invalidate: !v1
				});
			}
		}

		function Y(e) {
			var d = e.getSource();
			x.sDraftDialogId = x.getView().getId() + "DraftAdminDataPopoverFragment";
			p.get().loadFragment({
				id: x.sDraftDialogId,
				name: "sap.fin.travel.lib.reuse.ListPage.view.fragments.DraftAdminDataPopover",
				controller: x,
				models: {
					i18n: x.getView().getModel("i18n")
				}
			}).then(function(i) {
				if (i) {
					i.setModel(new J({
						"DraftLinkType": d.getBindingContext().getProperty("DraftLinkType"),
						"DraftUserId": d.getBindingContext().getProperty("DraftUserId"),
						"TripChange": d.getBindingContext().getProperty("TripChange")
					}));
					i.bindElement("/");
					i.openBy(d);
				}
			});
		}

		function Z(e) {
			var s = e.getSource();
			s.setEnabled(false);
			$("[id*=deleteEntry]").each(function(i, j) {
				var h2 = x.getOwnerComponent().getId();
				var i2 = h2 + j.id.split(h2).slice(-1).pop();
				var j2 = x.getView().byId(i2);
				if (j2 && j2.getMetadata && j2.getMetadata().getName() === "sap.m.Button") {
					j2.setEnabled(false);
				}
			});
			var d = x.getView().getModel();
			var k = x.getView().getBindingContext().getProperty("Tripno");
			var l = x.getView().getBindingContext().getProperty("Pernr");
			var v1 = function(i) {
				var j = i && i.Tripno === k;
				var h2 = i && i.Pernr === l;
				if (!h2 || !j) {
					f.get().showMessage(I.get().getText(x, "UNKNOWN_ERROR"));
				}
				g.invalidateEntries(d, {
					Pernr: i.Pernr,
					Tripno: i.Tripno
				});
			};
			var _1 = function(f2) {
				g.callFunction(d, {
					name: "/SwitchEditMode",
					success: v1,
					functionalError: v1,
					resolve: f2,
					reject: f2,
					urlParameters: {
						Pernr: l,
						Tripno: k
					},
					settings: {
						refreshAfterChange: false
					}
				});
			};
			var a2 = x.getView().getBindingContext().getProperty("DraftLinkVisible");
			var b2 = x.getView().getBindingContext().getProperty("DraftLinkType") === "UnsavedBy";
			var c2 = x.getView().getBindingContext().getProperty("DraftUserId") || "";
			var d2 = x.getView().getBindingContext().getProperty("Tripno") || "";
			var e2 = function(i) {
				if (a2 && b2) {
					var j = x.getView().getId() + "UnsavedChangesDialogFragment";
					p.get().getUnsavedDialog(x, j, d2, c2).then(function() {
						W(undefined, _1.bind(null, i), undefined, l, k, undefined, false);
					});
				} else {
					_1.apply(null, [i]);
				}
			};
			var f2 = function() {
				s.setEnabled(true);
			};
			var g2 = new Promise(e2);
			g2.then(f2).catch(f2);
		}

		function a1(e) {
			var d = h.getCustomData(e.getSource(), "source");
			var s = h.getCustomData(e.getSource(), "entityName");
			var i = h.getCustomData(e.getSource(), "entityKey");
			var j = i ? s + " \"" + i + "\"" : s;
			var k = {
				source: d,
				parentPath: e.getParameter("parentPath"),
				navObjectPath: e.getParameter("navObjectPath"),
				message: j ? I.get().getText(x, "DISCARD_ENTITY", j) : I.get().getText(x, "DISCARD_EDIT")
			};
			var l = x.getView().getModel();
			var v1 = x.getView().getBindingContext() && x.getView().getBindingContext().getPath();
			if (O.get().hasPendingChanges(l, v1)) {
				var _1 = e.getSource();
				p.get().loadFragment({
					id: x.getView().getId() + "DiscardDraftPopoverFragment",
					name: "sap.fin.travel.lib.reuse.view.fragments.DiscardDraftPopover",
					controller: x,
					models: {
						i18n: x.getView().getModel("i18n")
					}
				}).then(function(a2) {
					if (a2) {
						a2.setModel(x.getView().getModel());
						a2.setModel(new J(k), "discard");
						a2.openBy(_1);
					}
				});
			} else {
				V(e, d);
			}
		}

		function b1(e, i, s, d, j, k) {
			var l = e.getSource();
			var v1 = function() {
				var _1 = x.getView().getModel();
				var a2 = x.getView().getBindingContext().getProperty("Tripno");
				var b2 = x.getView().getBindingContext().getProperty("Pernr");
				var c2 = {
					Pernr: b2,
					Tripno: a2,
					Useraction: i
				};
				var d2 = function(f2, g2) {
					if (!f.get().handleMessageResponse(g2)) {
						if (d != undefined && typeof d === "function") {
							d();
						}
						b.show(I.get().getText(x, i === T.UserAction.Save || i === T.UserAction.Draft ? "SAVE_MSG" : "SUBMITTED_MSG_NO_APPROVER"));
						var h2 = sap.ui.getCore().byId('listPageView--listPageSmartTableID');
						if (h2) {
							h2.rebindTable();
						}
						if (x.getView().getBindingContext().getProperty("Persistencestatus") === T.PersistenceStatus.New) {
							var i2 = g2.headers && g2.headers["location"] && g2.headers["location"].split("/").slice(-1).pop();
							var j2 = '/' + i2;
							N.navigate(j2, x.getView().getModel("view").getProperty("/level"), true);
						} else {
							if (i !== T.UserAction.Draft) {
								g.invalidateEntries(_1, {
									Pernr: f2.Pernr,
									Tripno: f2.Tripno
								});
							}
						}
					}
				};
				var e2 = function() {
					g.callFunction(_1, {
						name: "/SaveTrip",
						source: l,
						error: k,
						success: d2,
						functionalError: j,
						urlParameters: c2,
						settings: {
							refreshAfterChange: false
						}
					});
				};
				g.submitChanges(_1, {
					success: e2,
					submitChangeOrigin: g.SUBMIT_CHANGE_ORIGIN.ACTION,
					settings: {
						refreshAfterChange: false
					}
				});
			};
			if (s) {
				v1();
			} else {
				y(e, true, v1);
			}
		}

		function c1(e, s, d, i) {
			b1(e, T.UserAction.Submit, false, s, d, i);
		}

		function d1(e) {
			b1(e, T.UserAction.Save);
		}

		function e1(e) {
			b1(e, T.UserAction.Draft, true);
		}

		function f1(d, s, e, i) {
			var j = function(k, l) {
				var v1 = s.getTable().getSelectedItem();
				var _1 = l.headers && l.headers["location"] && l.headers["location"].split("/").slice(-1).pop();
				var a2 = "/" + _1;
				if (v1 && v1.getBindingContext() === a2) {
					x._lastCreatedItem[e] = undefined;
				} else {
					x._lastCreatedItem[e] = a2;
				}
				if (!i.inLine) {
					var b2 = {
						pages: [],
						settings: []
					};
					n.listAppPages(A.get().getConfig(), b2);
					var c2 = n.getColumnListItemType(b2.pages, {
						name: e
					});
					var d2 = "Navigation" === c2;
					if (d2) {
						var e2 = H.getInstance().getHash();
						var f2 = i.viewContext ? i.viewContext.getPath() : "";
						var g2 = a2;
						var h2 = f2 + g2;
						if (!U.isEmptyObjectOrString(f2) && e2.endsWith(f2)) {
							h2 = e2 + g2;
						}
						var i2 = [];
						s.getTable().getItems().forEach(function(v1) {
							if (!U.isEmptyObjectOrString(v1.getBindingContext())) {
								var j2 = v1.getBindingContext().getPath();
								i2.push(j2.slice(1));
							}
						});
						i2.push(g2.slice(1));
						m.get().updateEntry(x.getView().getModel("view").getProperty("/level") + 1, g2, i2);
						N.navigate(h2, x.getView().getModel("view").getProperty("/level"));
					}
				}
			};
			g.createEntry(d, i.bindingPath, {
				success: j,
				properties: i.properties,
				submit: i.submit
			});
		}

		function g1(e) {
			var s = e.getSource();
			y(e, false, function() {
				var d = r.getSmartTable(s);
				var i = d.getEntitySet();
				var j = d.getModel();
				var k = x.getView();
				var l = k.getBindingContext();
				var v1;
				var _1;
				var a2 = false;
				if (l) {
					var b2 = O.get().getNavigationProperty(x, j, i);
					v1 = l.getPath() + "/" + b2;
				} else {
					var c2 = O.get().getCurrentTripContext().Pernr;
					v1 = "/" + i;
					_1 = {
						Pernr: c2
					};
					a2 = true;
				}
				var d2 = {
					bindingPath: v1,
					viewContext: l,
					properties: _1
				};
				var e2 = function() {
					f1(j, d, i, d2);
				};
				if (a2) {
					var f2 = O.get().getDraftItem(d);
					L(e2, e2, f2);
				} else {
					e2();
				}
			});
		}

		function h1(e) {
			var s = e.getSource();
			var d = e.getSource().getSelectedItem();
			var j = r.getOwnerControl(x.oSmartTable);
			var k = JSON.parse(h.getCustomData(d, "Properties"));
			var l = h.getCustomData(d, "Entity");
			var v1 = j.getModel();
			var _1;
			var a2 = x.getView();
			var b2 = a2.getBindingContext();
			if (b2) {
				_1 = b2.getPath() + "/" + l;
			} else {
				_1 = "/" + l;
			}
			var c2 = {
				bindingPath: _1,
				viewContext: x.getView().getBindingContext(),
				properties: {}
			};
			var d2 = d.getBindingContext();
			for (var i = 0; i < k.length; i++) {
				c2.properties[k[i]] = d2.getProperty(k[i]);
			}
			f1(v1, j, j.getEntitySet(), c2);
			s.getParent().close();
		}

		function i1(e) {
			if (x.oAddSearchEntriesDialog) {
				x.oAddSearchEntriesDialog.unbindElement();
				x.oAddSearchEntriesDialog.destroy();
			}
		}

		function j1(e) {
			var s = e.getParameters().selectedItems;
			var d = r.getOwnerControl(x.oSmartTable);
			var j = d.getModel();
			var k = x.getView();
			var l = k.getBindingContext();
			var v1, _1, a2, b2, c2, d2;
			if (s && s.length > 0) {
				for (var e2 = 0; e2 < s.length; e2++) {
					d2 = s[e2];
					v1 = JSON.parse(h.getCustomData(d2, "Properties"));
					_1 = h.getCustomData(d2, "Entity");
					if (l) {
						a2 = l.getPath() + "/" + _1;
					} else {
						a2 = "/" + _1;
					}
					c2 = {
						bindingPath: a2,
						viewContext: x.getView().getBindingContext(),
						properties: {},
						inLine: s.length > 1,
						submit: e2 === s.length - 1
					};
					b2 = d2.getBindingContext();
					for (var i = 0; i < v1.length; i++) {
						c2.properties[v1[i]] = b2.getProperty(v1[i]);
					}
					f1(j, d, d.getEntitySet(), c2);
				}
			}
			if (x.oAddSearchEntriesDialog) {
				x.oAddSearchEntriesDialog.unbindElement();
				x.oAddSearchEntriesDialog.destroy();
			}
		}

		function k1(e) {
			var d = e.getSource();
			y(e, false, function() {
				var i = d.getBindingContext();
				var s = O.get().getNavigationProperty(x, i.getModel(), r.getOwnerControl(d).getEntitySet());
				var j = JSON.parse(h.getCustomData(d, "targetEntitySettings"));
				x.oSmartTable = d.getParent();
				var k = x.oPreprocessors.xml;
				k.models.actionEntity = new sap.ui.model.json.JSONModel({
					targetEntity: j[0],
					targetName: j[1],
					targetProperties: h.getCustomData(d, "targetEntityProperties"),
					sourceEntity: s
				});
				var l = X.loadTemplate("sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionListItem", "fragment");
				l.oAddEntriesDialog = a.process(l, {
					name: "sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionListItem"
				}, k);
				x.oAddEntriesDialog = sap.ui.xmlfragment({
					fragmentContent: l,
					type: "XML"
				}, x);
				x.oAddEntriesDialog.attachAfterClose(function() {
					x.oAddEntriesDialog.unbindElement();
					x.oAddEntriesDialog.destroy();
				});
				x.oAddEntriesDialog.setModel(x.getView().getModel());
				x.oAddEntriesDialog.bindElement(x.getView().getBindingContext().getPath());
				x.oAddEntriesDialog.openBy(d);
			});
		}

		function l1(e) {
			var d = e.getSource();
			y(e, false, function() {
				var i = d.getBindingContext();
				var s = O.get().getNavigationProperty(x, i.getModel(), r.getOwnerControl(d).getEntitySet());
				var j = O.get().getNavigationPropertyName(x, i.getModel(), r.getOwnerControl(d).getEntitySet());
				var k = JSON.parse(h.getCustomData(d, "targetEntitySettings"));
				x.oSmartTable = d.getParent();
				var l = x.oPreprocessors.xml;
				l.models.actionEntity = new sap.ui.model.json.JSONModel({
					targetEntity: k[0],
					targetName: k[1],
					targetProperties: h.getCustomData(d, "targetEntityProperties"),
					sourceEntity: s,
					title: I.get().getText("ADD_ACTION_ITEMS", j),
					noDataText: I.get().getText("NO_ACTION_ITEMS", j)
				});
				var v1 = X.loadTemplate("sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionSearchFieldItem", "fragment");
				v1.oAddSearchEntriesDialog = a.process(v1, {
					name: "sap.fin.travel.lib.reuse.DetailPage.view.fragments.ActionSearchFieldItem"
				}, l);
				x.oAddSearchEntriesDialog = sap.ui.xmlfragment({
					fragmentContent: v1,
					type: "XML"
				}, x);
				x.oAddSearchEntriesDialog.setModel(x.getView().getModel());
				x.oAddSearchEntriesDialog.bindElement(x.getView().getBindingContext().getPath());
				x.oAddSearchEntriesDialog.open();
			});
		}

		function m1(e) {
			var l = e.getSource(),
				s = e.getParameter("value");
			if (l) {
				var d = l.getItems();
				if (d) {
					var i = 0;
					for (i = 0; i < d.length; i++) {
						if (d[i].getTitle().toLowerCase().indexOf(s.toLowerCase()) !== -1) {
							d[i].setVisible(true);
						} else {
							d[i].setVisible(false);
						}
					}
				}
			}
		}

		function n1(s, d) {
			var e = d.sEntityName;
			var i = d.fnSuccess;
			var j = d.fnError;
			var k = d.sEntityPath;
			var l = true;
			var v1 = false;
			var _1;
			if (U.isEmptyObjectOrString(k)) {
				_1 = r.getSmartTable(s);
				v1 = !U.isEmptyObjectOrString(_1) && _1.getTable;
				if (v1) {
					k = _1.getTable().getSelectedContextPaths()[0];
					l = x.getView().getModel("view").getProperty("/level") === 0;
				} else {
					k = x.getView().getBindingContext().getPath();
					l = x.getView().getModel("view").getProperty("/level") === 1;
				}
			}
			if (U.isEmptyObjectOrString(k)) {
				return;
			}
			var a2 = function(c2) {
				if (c2) {
					b.show(I.get().getText(x, "DELETE_OK", e));
				}
				if (v1) {
					_1.getTable().removeSelections(true);
					if (d && d.bTriggerNavigation !== false && N.isBindingPathDisplayed(k)) {
						N.navigateBack(x.getView().getModel("view").getProperty("/level") + 1);
					}
				} else if (d && d.bTriggerNavigation !== false) {
					N.navigateBack(x.getView().getModel("view").getProperty("/level"));
				}
				if (l) {
					var d2 = /Pernr='(\d+)'/.exec(k);
					var e2 = !U.isEmptyObjectOrString(d2) && d2[1];
					d2 = /Tripno='(\d+)'/.exec(k);
					var f2 = !U.isEmptyObjectOrString(d2) && d2[1];
					var b2 = x.getView().getModel();
					g.resetSubEntityChanges(b2, e2, f2);
					g.invalidateEntries(b2, {
						Pernr: e2,
						Tripno: f2,
						refreshAfterChange: false
					});
				}
				if (i && typeof i === "function") {
					i();
				}
			};
			var b2 = x.getOwnerComponent().getModel();
			g.remove(b2, k, {
				success: a2.bind(this, true),
				functionalError: a2,
				error: j,
				refreshAfterChange: true
			});
		}

		function o1(e) {
			var d = x;
			var s = e.getSource();
			var i = h.getCustomData(s, "entityName");
			var j = function(k, l) {
				var v1 = "";
				if (l != undefined) {
					v1 = f.get().getErrorMessageResponse(l);
				} else {
					v1 = f.get().getErrorMessageResponse(k);
				}
				f.get().showMessage(v1);
			};
			M.show(I.get().getText(x, "DELETE_WARNING", i), {
				icon: M.Icon.ERROR,
				title: I.get().getText(x, "DELETE_TITLE"),
				actions: [M.Action.OK, M.Action.CANCEL],
				onClose: function(k) {
					if (k === M.Action.OK) {
						n1(s, {
							sEntityName: i,
							fnError: j
						});
					}
				}
			});
		}

		function p1(d) {
			var s = d.getSource();
			var j = s.getEntitySet();
			var k = x.byId(s.getSmartFilterId());
			if (k) {
				var l = JSON.parse(k.getFilterDataAsString());
				if (d.getParameter("mParameters") && d.getParameter("mParameters").hasOwnProperty("data")) {
					var v1 = x.getView().getModel().getProperty("/UserProfiles('" + l.Pernr + "')");
					A.get().updateGlobalModel("/userprofile", v1);
					if (v1 && !v1.Isself) {
						x.byId("template::UserText").setText(I.get().resolveText("ON_BEHALF_OF", [l.Travelername, l.Pernr]));
					} else {
						x.byId("template::UserText").setText(I.get().resolveText("MY_SELF", [l.Travelername, l.Pernr]));
					}
				} else {
					x.byId("template::UserText").setText("");
				}
			}
			if (j !== this.getOwnerComponent().sEntitySet) {
				var _1 = s.getId().split('::');
				_1.pop();
				var a2 = this.getView().byId(_1.join('::').replace("::Table", "::Section"));
				if (a2) {
					if (d.getParameters().getParameter("data") && d.getParameters().getParameter("data").results.length > 0) {
						if (a2.getBindingInfo("visible") !== undefined) {
							a2.bindProperty("visible", {
								parts: [{
									path: a2.getBindingInfo("visible").parts[0].path,
									type: new sap.ui.model.type.Boolean()
								}],
								formatter: function(e) {
									return !e;
								}
							});
						}
					} else {
						if (a2.getBindingInfo("visible") !== undefined) {
							a2.bindProperty("visible", {
								parts: [{
									path: a2.getBindingInfo("visible").parts[0].path,
									type: new sap.ui.model.type.Boolean()
								}, {
									path: "DisplayMode",
									type: new sap.ui.model.type.Boolean()
								}],
								formatter: function(e, f2) {
									return !e && !f2;
								}
							});
						}
					}
				}
			} else {
				s.getTable().setShowOverlay(false);
			}
			var b2 = t1(s);
			if (b2) {
				var c2 = s.getModel().getMetaModel();
				var d2 = c2.getODataEntitySet(j);
				var e2 = d2["Org.OData.Capabilities.V1.DeleteRestrictions"] && d2["Org.OData.Capabilities.V1.DeleteRestrictions"]["Deletable"];
				if (e2 && e2.Bool && false === e2.Bool) {
					b2.setVisible(false);
				} else {
					if (!s.getBindingContext()) {
						b2.setEnabled(false);
					} else {
						var f2 = s.getBindingContext().getProperty("DisplayMode");
						if (!f2) {
							b2.setVisible(true);
							b2.setEnabled(false);
						}
					}
					if (!U.isEmptyObjectOrString(s.getTable().getSelectedItem())) {
						K1(s.getTable(), s.getTable().getSelectedItem());
					}
				}
			}
			if (x._lastCreatedItem && x._lastCreatedItem[j]) {
				var g2 = x._lastCreatedItem[j];
				var h2 = s.getTable().getItems();
				var i2;
				$.each(h2, function(i, e) {
					var k2 = !U.isEmptyObjectOrString(e.getBindingContext());
					if (k2 && e.getBindingContext().getPath() === g2) {
						i2 = e;
						return false;
					} else if (k2 && N.isBindingPathDisplayed(e.getBindingContext().getPath())) {
						i2 = e;
						return false;
					}
				});
				if (i2) {
					K1(i2.getParent(), i2);
				}
			}
			if (j == "CostAssignments" && s.getTable().getItems().length > 0 && s.getTable().getItems()[0] !== undefined) {
				var j2 = s.getTable().getColumns();
				j2[0].setVisible(false);
			}
			if (j == "Advances") {
				var j2 = s.getTable().getColumns();
				j2[0].setVisible(false);
			}
			if (x.byId("listPageSmartTableID")) {
				M1(true);
			}
			y1(d);
		}

		function q1(e) {
			var s = this.getView().byId(e.getSource().getParent().getParent().getParent().getParent().getId());
			if (e.getSource().getItems().length <= 0) {
				s.setVisible(false);
			} else {
				if (s.getBindingInfo("visible") !== undefined) {
					s.bindProperty("visible", {
						parts: [{
							path: s.getBindingInfo("visible").parts[0].path,
							type: new sap.ui.model.type.Boolean()
						}],
						formatter: function(d) {
							return !d;
						}
					});
				} else {
					s.setVisible(true);
				}
			}
		}

		function r1(d) {
			var s, e;
			if (!d) {
				throw new Error("No context");
			}
			if (d && d.getPath) {
				s = d.getPath().split("(")[0];
				e = s.substring(1);
			}
			if (e == null) {
				return null;
			} else {
				return d.getModel().getMetaModel().getODataEntitySet(e) && d.getModel().getMetaModel().getODataEntitySet(e).name;
			}
		}

		function s1(s) {
			var d = x.byId("listPageSmartTableID") ? x.getView().byId("customToolBarActionButtonId") : s.getCustomToolbar();
			return d;
		}

		function t1(s) {
			var d = s1(s);
			var e;
			$.each(d.getContent(), function(k, i) {
				if (-1 !== i.getId().indexOf(T.DefaultButtons.DeleteListPage) || -1 !== i.getId().indexOf(T.DefaultButtons.DeleteDetailPage) || -1 !==
					i.getId().indexOf("deleteEntry")) {
					e = i;
					return false;
				}
			});
			return e;
		}

		function u1(e) {
			var d = false;
			var s = r.getSmartTable(e.getSource());
			var i = t1(s);
			if (i && i.getVisible && i.getVisible()) {
				var j = s.getTable().getSelectedItem();
				if (!U.isEmptyObjectOrString(j)) {
					var k = s.getEntitySet();
					var l = s.getModel().getMetaModel();
					var v1 = l.getODataEntitySet(k);
					var _1 = l.getODataEntityType(v1.entityType);
					var a2 = _1["Org.OData.Capabilities.V1.DeleteRestrictions"] && _1["Org.OData.Capabilities.V1.DeleteRestrictions"]["Deletable"];
					var d = true;
					if (a2 && a2.Path) {
						var b2 = a2.Path;
						var c2 = j && j.getBindingContext().getProperty(b2);
						if (false === c2) {
							d = false;
						}
					}
				}
			}
			if (i) {
				i.setEnabled(d);
			}
		}

		function w1(e) {
			y1(e);
		}

		function x1() {
			var d = x.getView().byId("listPageView--" + T.DefaultButtons.AddListPage) || x.getView().byId("listPageView--" + T.DefaultButtons.AddExtendedListPage);
			if (d) {
				d.setEnabled(true);
			}
		}

		function y1(e) {
			x1();
			z1(e);
			C1(e);
			u1(e);
			A1(e);
			B1(e);
		}

		function z1(d) {
			var i = r.getSmartTable(d.getSource());
			var j = i.getEntitySet();
			var k = x.getOwnerComponent().sEntitySet;
			var l = new Set();
			var _1 = _();
			_1 = _1 || [];
			Object.getOwnPropertyNames(_1).forEach(function(e, s, v1) {
				if (_1[e].EntitySet === k) {
					var b2;
					var c2 = _1[e].Sections || {};
					Object.getOwnPropertyNames(c2).forEach(function(e, s, v1) {
						if (c2[e].Id === j) {
							b2 = c2[e].Actions;
							Object.getOwnPropertyNames(b2).forEach(function(e, s, v1) {
								var d2 = b2[e];
								if (d2.requiresSelection === true) {
									l.add(d2.id);
								}
							});
							return false;
						}
					});
					b2 = _1[e].Actions || {};
					Object.getOwnPropertyNames(b2).forEach(function(e, s, v1) {
						if (!b2[e].global || b2[e].global === false) {
							l.add(b2[e].id);
						}
						return false;
					});
					return false;
				}
			});
			var a2 = s1(i);
			$.each(a2.getContent(), function(e, b2) {
				l.forEach(function(v1, v2, s) {
					if (b2.getId().indexOf(v1) != -1) {
						b2.setEnabled(true);
					}
				});
			});
		}

		function A1(e) {
			var s = r.getSmartTable(e.getSource()),
				d;
			if (s.getTable().getSelectedItem()) {
				d = s.getTable().getSelectedItem().getBindingContext();
			}
			var i = s1(s);
			$.each(i.getContent(), function(k, j) {
				if (j.getId().indexOf(T.DefaultButtons.ExportListPage) != -1) {
					if (d == undefined) {
						j.setEnabled(false);
					} else {
						var l = h.getCustomData(j, "ApplicablePath");
						var v1 = h.getCustomData(j, "ActionFor");
						j.setEnabled(U.isEmptyObjectOrString(d) ? U.isEmptyObjectOrString(v1) : (U.isEmptyObjectOrString(d) ? true : d[l]));
					}
				}
			});
		}

		function B1(e) {
			var s = r.getSmartTable(e.getSource()),
				d;
			if (s.getTable().getSelectedItem()) {
				d = s.getTable().getSelectedItem().getBindingContext();
			}
			var i = s1(s);
			$.each(i.getContent(), function(k, j) {
				if (j.getId().indexOf(T.DefaultButtons.CopyListPage) != -1) {
					if (d == undefined) {
						j.setEnabled(false);
					} else if (d.getObject()) {
						var l = h.getCustomData(j, "ApplicablePath");
						var v1 = h.getCustomData(j, "ActionFor");
						var _1 = d.getObject();
						j.setEnabled(U.isEmptyObjectOrString(_1) ? U.isEmptyObjectOrString(v1) : (U.isEmptyObjectOrString(_1) ? true : _1[l]));
					}
				}
			});
		}

		function C1(e) {
			var s = r.getSmartTable(e.getSource()),
				d;
			if (s.getTable().getSelectedItem()) {
				d = s.getTable().getSelectedItem().getBindingContext();
			}
			var i = s1(s);
			var j = "DataFieldForActionButton";
			$.each(i.getContent(), function(k, l) {
				if (l.getId().indexOf(j) != -1) {
					var v1 = h.getCustomData(l, "ApplicablePath");
					var _1 = h.getCustomData(l, "ActionFor");
					var a2 = d ? d.getObject() : d;
					l.setEnabled(U.isEmptyObjectOrString(a2) ? U.isEmptyObjectOrString(_1) : (U.isEmptyObjectOrString(a2) ? true : a2[v1]));
				}
			});
		}

		function D1(e) {
			var d = x.getView().getModel();
			var s = E1(e);
			var i = d.getObject(s);
			var j = i.Pernr;
			var k = i.Tripno;
			if (!x._oPdfViewer) {
				x._oPdfViewer = new P();
				x.getView().addDependent(x._oPdfViewer);
				x._oPdfViewer.attachError(function() {
					M.show(I.get().getText(x, "PDF_ERROR"), {
						icon: M.Icon.ERROR,
						title: I.get().getText(x, "ST_ERROR")
					});
				});
			}
			var l = 'R';
			if (i && i.__metadata && -1 !== i.__metadata.type.indexOf("TravelExpense")) {
				l = 'E';
			}
			var v1 = d.sServiceUrl + "/PrintPreviews(Pernr='" + j + "',Tripno='" + k + "',TripComponent='" + l + "')/$value";
			x._oPdfViewer.setSource(v1);
			x._oPdfViewer.setTitle(k + (i.Customer ? " - " + i.Customer : ""));
			x._oPdfViewer.setShowDownloadButton(false);
			x._oPdfViewer.open();
		}

		function E1(e) {
			var s;
			if (x.getView().getBindingContext()) {
				s = x.getView().getBindingContext().getPath();
			} else {
				var d = r.getSmartTable(e.getSource());
				s = d && d.getTable().getSelectedContextPaths()[0];
			}
			return s;
		}

		function F1(e) {
			var s;
			if (x.getView().getBindingContext()) {
				s = x.getView().getBindingContext();
			} else {
				var d = r.getSmartTable(e.getSource());
				if (d.getTable().getSelectedItem()) {
					s = d && d.getTable().getSelectedItem().getBindingContext();
				}
			}
			return s;
		}

		function G1(e) {
			var d = this;
			var s = e.getSource();
			var l = r.getSmartTable(s);
			var i = U.isEmptyObjectOrString(l);
			var j;
			if (i) {
				j = this.getView().getBindingContext().getPath();
			} else {
				j = l.getTable().getSelectedContextPaths()[0];
			}
			if (U.isEmptyObjectOrString(j)) {
				return;
			}
			var k = e.getSource().getModel().getObject(j);
			var v1 = k.Tripno;
			var _1 = k.Pernr;
			var a2 = O.get().getDraftItem(l);
			var b2 = a2 && a2.getProperty("Tripno");
			var c2 = {
				date: undefined,
				reason: "",
				pernr: _1,
				tripno: v1,
				stripMessage: b2 && b2 !== k.Tripno ? (T.TripNumber.Initial === b2 ? I.get().getText("DRAFT_WARNING_UNKNOWN", b2) : I.get().getText(
					"DRAFT_WARNING", b2)) : "",
				stripType: b2 && b2 !== k.Tripno ? q.Warning : q.None
			};
			x.sCopyFramgmentId = "CopyFragmentId";
			p.get().loadFragment({
				id: x.sCopyFramgmentId,
				name: "sap.fin.travel.lib.reuse.view.fragments.Copy",
				controller: x,
				models: {
					i18n: x.getView().getModel("i18n"),
					copyDialogModel: new sap.ui.model.json.JSONModel()
				}
			}).then(function(d2) {
				if (d2) {
					d.oCopyFragment = d2;
					d.oCopyFragment.getModel("copyDialogModel").setData(c2);
					d.oCopyFragment.open();
				}
			});
		}

		function H1(e) {
			if (this.oCopyFragment) {
				this.oCopyFragment.close();
			}
		}

		function I1(e) {
			var d = e.getSource();
			var i = this;
			var j = x.getView().getModel();
			var k = this.oCopyFragment.getModel("copyDialogModel");
			var l = {
				Date: k.getProperty("/date"),
				Customer: k.getProperty("/reason"),
				Pernr: k.getProperty("/pernr"),
				Tripno: k.getProperty("/tripno")
			};
			if (!l.Date || !l.Customer) {
				k.setProperty("/stripMessage", I.get().getText(x, "COPY_MISSING_FIELD_ALERT"));
				k.setProperty("/stripType", q.Error);
				return;
			}
			var s = function(a2) {
				if (f.get().handleMessageResponse(a2)) {
					var b2 = f.get().getErrorMessageResponse(a2);
					k.setProperty("/stripMessage", b2.hasOwnProperty("message") ? b2.message : b2);
					var c2 = b2.hasOwnProperty("type") ? v.ErrorType.toMessageType(b2.type) : q.Error;
					k.setProperty("/stripType", c2);
				} else {
					k.setProperty("/stripMessage", f.get().getErrorMessage(a2));
					k.setProperty("/stripType", q.Error);
				}
			};
			var v1 = function(a2, b2) {
				i.oCopyFragment.close();
				var c2 = b2.headers && b2.headers.location && b2.headers.location.split("/").slice(-1).pop();
				N.navigate(c2, x.getView().getModel("view").getProperty("/level"));
			};
			var _1 = function(a2, b2) {
				g.callFunction(j, {
					name: "/DuplicateTrip",
					source: d,
					success: v1,
					error: s,
					functionalError: v1,
					urlParameters: {
						Pernr: l.Pernr,
						Tripno: l.Tripno,
						Date: l.Date,
						Customer: l.Customer
					}
				});
			};
			g.submitChanges(j, {
				source: d,
				success: _1,
				error: s,
				submitChangeOrigin: g.SUBMIT_CHANGE_ORIGIN.ACTION,
			});
		}

		function J1(e) {
			e.preventDefault();
			var d = e.getSource();
			var s = H.getInstance().getHash();
			var i = s.split("/");
			i.pop();
			var j = x._getBreadcrumbs();
			var l = 1;
			j.getLinks().reverse().forEach(function(k, v1, _1) {
				if (k !== d) {
					l += 1;
					i.pop();
					return true;
				}
				var a2 = i.join("/");
				N.navigate(a2, x.getView().getModel("view").getProperty("/level") - l, true);
			});
		}

		function K1(d, i) {
			i.setSelected(true);
			d.fireSelectionChange({
				listItem: i,
				selected: true
			});
		}

		function L1(e) {
			var s = e.getSource().getSelectedContextPaths()[0];
			var d = new C(x.getView().getModel(), s);
			var i = d.getProperty("Deletable");
			var j = d.getProperty("Persistencestatus");
			x.byId(T.DefaultButtons.DeleteListPage).setEnabled(i);
			x.byId(T.DefaultButtons.CopyListPage).setEnabled(j === T.PersistenceStatus.Save);
			x.byId(T.DefaultButtons.ExportListPage).setEnabled(true);
			y1(e);
		}

		function M1(d) {
			d = undefined === d ? true : d;
			var i = x.getView().byId.bind(x);
			if (!x.actionButtonEnablement) {
				x.actionButtonEnablement = new Map();
			}
			var j = $("[class~=customToolBarActionButton]").toArray();
			j.forEach(function(e) {
				var k = i(e.id);
				k.getAggregation("content").forEach(function(e) {
					if (e instanceof sap.m.Button) {
						if (d) {
							e.setEnabled(x.actionButtonEnablement.get(e.getId()));
						} else if (!x.actionButtonEnablement.has(e.getId())) {
							x.actionButtonEnablement.set(e.getId(), e.getEnabled());
							e.setEnabled(false);
						}
					}
				});
				if (d) {
					x.actionButtonEnablement.clear();
				}
			});
		}

		function N1(e) {
			if (e.getSource()) {
				x.byId("template::FilterText").setText(e.getSource().retrieveFiltersWithValuesAsText());
				if (x.byId("listPageSmartTableID")) {
					M1(false);
				}
			}
		}

		function O1() {
			f.get().toggleMessagesPopover();
		}

		function P1(e) {
			y(e, undefined, function() {
				var s = function() {
					x._fclHandler.handleClose();
				};
				var d = function() {
					f.get().openMessagesPopover();
				};
				g.apply(x.getView().getModel(), {
					success: s,
					functionalError: d
				});
			});
		}

		function Q1(e) {
			var d = e.getSource();
			var s = x.getView().getId() + "ContactDetailsPopoverFragment";
			p.get().loadFragment({
				id: s,
				name: "sap.fin.travel.lib.reuse.DetailPage.view.fragments.ContactDetails",
				controller: x,
				models: {
					i18n: x.getView().getModel("i18n")
				}
			}).then(function(i) {
				if (i) {
					i.setModel(x.getView().getModel());
					var j = d.getBindingContext().getProperty("Approverid") ? d.getBindingContext().getProperty("Approverid") : d.getBindingContext().getProperty(
						"Authorid");
					i.bindElement("/Contacts('" + j + "')");
					i.openBy(d);
				}
			});
		}

		function R1() {
			var s = x.getView().byId("listPageSmartTableID");
			if (s) {
				s.openPersonalisationDialog("Sort");
			}
		}

		function S1() {
			var s = x.getView().byId("listPageSmartTableID");
			if (s) {
				s.openPersonalisationDialog("Group");
			}
		}

		function T1() {
			var s = x.getView().byId("listPageSmartTableID");
			if (s) {
				s.openPersonalisationDialog("Columns");
			}
		}

		function U1(e) {
			var s = e.getSource();
			y(e, false, function() {
				var l = r.getSmartTable(s);
				var d = O.get().getDraftItem(l);
				var i = d && d.getProperty("Tripno");
				c.callAction(s, x, i);
			});
		}

		function V1(e) {
			var s = e.getSource();
			y(e, true, function() {
				c.callInLineAction(s, x);
			});
		}

		function W1(e) {
			var s = e.getSource().getBindingContext().getPath();
			var d = N.bindingPaths(H.getInstance().getHash()).paths;
			d.pop();
			var i = {
				parentPath: d.join(''),
				navObjectPath: m.get().getPrevEntry(x.getView().getModel("view").getProperty("/level"), s)
			};
			var j = new E(x.createId("travel::paginator::event"), e.getSource(), i);
			a1(j);
		}

		function X1(e) {
			var s = e.getSource().getBindingContext().getPath();
			var d = N.bindingPaths(H.getInstance().getHash()).paths;
			d.pop();
			var i = {
				parentPath: d.join(''),
				navObjectPath: m.get().getNextEntry(x.getView().getModel("view").getProperty("/level"), s)
			};
			var j = new E(x.createId("travel::paginator::event"), e.getSource(), i);
			a1(j);
		}

		function Y1(e) {
			var d = e.getSource();
			var s = x.getView().getId() + "SharePopoverFragment";
			p.get().loadFragment({
				id: s,
				name: "sap.fin.travel.lib.reuse.view.fragments.Share",
				controller: x,
				models: {
					i18n: x.getView().getModel("i18n")
				}
			}).then(function(k) {
				if (k) {
					k.setModel(new J(), "share");
					k.setModel(x.getView().getModel());
					$("[id*=travelDetailObjectPageHeader]").each(function(i, j) {
						var _1 = x.getView().byId(j.id);
						if (_1) {
							if (_1.getMetadata().getName() === "sap.uxap.ObjectPageHeader") {
								A.get().updateGlobalModel("/share/title", _1.getObjectTitle());
								A.get().updateGlobalModel("/share/subTitle", _1.getObjectSubtitle());
							}
							if (_1.getMetadata().getName() === "sap.uxap.ObjectPageDynamicHeaderTitle") {
								A.get().updateGlobalModel("/share/title", _1.getExpandedHeading().getText());
								A.get().updateGlobalModel("/share/subTitle", _1.getExpandedContent()[0].getText());
							}
							A.get().updateGlobalModel("/share/customUrl", document.URL);
						}
					});
					var l = k.getModel("share");
					var v1 = jQuery.extend(l.getData(), A.get().getGlobalModel().getProperty("/share"));
					l.setData(v1);
					k.openBy(d);
				}
			});
		}

		function Z1(e) {
			var d = e.getParameter("bindingParams");
			d.parameters = d.parameters || {};
		}

		function $1(e) {
			var s = e.getSource();
			var d = h.getCustomData(e.getSource(), "entitySet");
			var i = d && -1 !== d.indexOf("CostAssignments");
			var j = e.getParameter("selectedKey");
			if (i) {
				var k = j === "Percentage" ? "P" : "B";
				var l = s.getBindingContext().getProperty("PercAbs");
				if (l === k) {
					return;
				}
				var v1 = function() {
					s.getAggregation("items").forEach(function(a2) {
						var b2 = a2.getContent();
						if (b2 && b2.length > 0 && b2[0] && b2[0].rebindTable) {
							b2[0].rebindTable();
						}
					});
					g.read(s.getModel(), s.getBindingContext().getPath());
				};
				var _1 = function(a2, b2) {
					var c2, d2;
					if (f.get().handleMessageResponse(b2)) {
						var e2 = f.get().getErrorMessageResponse(b2);
						c2 = e2.hasOwnProperty("message") ? e2.message : e2;
						d2 = e2.hasOwnProperty("type") ? v.ErrorType.toMessageType(e2.type) : q.Error;
					} else {
						c2 = f.get().getErrorMessage(b2);
						d2 = q.Error;
					}
					var f2;
					switch (d2) {
						case q.Warning:
							M.warning(c2);
							break;
						case q.Error:
							M.error(c2);
							break;
						default:
							M.alert(c2);
					}
					s.setSelectedKey(l === "B" ? "Absolute" : "Percentage");
				};
				g.callFunction(s.getModel(), {
					name: "/SwitchPercAbsForReceipt",
					success: v1,
					error: _1,
					functionalError: _1,
					urlParameters: {
						Pernr: s.getBindingContext().getProperty("Pernr"),
						Receiptno: s.getBindingContext().getProperty("Receiptno"),
						Tripno: s.getBindingContext().getProperty("Tripno")
					}
				});
			}
		}
		return {
			handleEditAction: Z,
			handleCancelAction: a1,
			handleCreateActionList: k1,
			handleCreateCustomAction: h1,
			handleSearcheableActionItemConfirm: j1,
			handleSearcheableActionItemCancel: i1,
			handleCreateActionSearcheableList: l1,
			handleSearcheableActionItemSearch: m1,
			handleInlineDataFieldForAction: V1,
			handleDataFieldForAction: U1,
			handleSaveAction: d1,
			handleSubmitAction: c1,
			handleCreateAction: g1,
			handleDeleteAction: o1,
			handleExportAction: D1,
			handleCopyAction: G1,
			handleCloseCopy: H1,
			handleCopy: I1,
			handleApplyAction: P1,
			handleOnSort: R1,
			handleOnGroup: S1,
			handleOnColumns: T1,
			handleListPageItemPress: K,
			handleItemPress: Q,
			closeDraftAdminPopover: R,
			closeDiscardPopover: V,
			handleOnDraftLinkPressed: Y,
			handleSelectionChange: L1,
			onAssignedFiltersChanged: N1,
			initListPageFilterBar: z,
			onFilterBarDataReceived: D,
			handleFilterBarSearchPressed: G,
			onShowMessages: O1,
			onSelectionChange: w1,
			onIconTabBarSelect: $1,
			onDataReceived: p1,
			onContactDetails: Q1,
			onBreadCrumbUrlPressed: J1,
			handleShowPrevObject: W1,
			handleShowNextObject: X1,
			onShareActionButtonPress: Y1,
			onDataReceivedCommentsSection: q1,
			handleSaveAsDraftAction: e1,
			onBeforeRebindDetailTable: Z1,
			checkAppForms: y
		};
	}
	return B.extend("sap.fin.travel.lib.reuse.util.EventHandler", {
		constructor: function(d) {
			jQuery.extend(this, w(d));
		}
	});
});
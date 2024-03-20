/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/fin/travel/lib/reuse/util/PersistenceHelper", "sap/fin/travel/lib/reuse/util/i18n",
	"sap/fin/travel/lib/reuse/util/NavigationUtil", "sap/fin/travel/lib/reuse/util/CustomDataUtil",
	"sap/fin/travel/lib/reuse/util/ODataModelUtil", "sap/fin/travel/lib/reuse/util/FragmentHelper", "sap/fin/travel/lib/reuse/util/Utils",
	"sap/fin/travel/lib/reuse/util/ControlUtil", "sap/fin/travel/lib/reuse/util/MessageUtil", "sap/fin/travel/lib/reuse/util/MessageParser",
	"sap/ui/core/routing/HashChanger", "sap/ui/comp/smartform/SmartForm", "sap/ui/comp/smartform/Group",
	"sap/ui/comp/smartform/GroupElement", "sap/ui/comp/smartfield/SmartField", "sap/ui/comp/smartfield/SmartLabel", "sap/ui/model/Context",
	"sap/m/PDFViewer", "sap/ui/core/CustomData"
], function(P, I, N, C, O, F, U, a, M, b, H, S, G, c, d, f, g, h, j) {
	"use strict";

	function l() {
		function _(e, i, k, E) {
			if (U.isEmptyObjectOrString(k.subPath)) {
				P.invalidateEntry(e, N.bindingPaths(H.getInstance().getHash()).paths.pop());
				var v = a.getSmartTable(E);
				if (v) {
					v.rebindTable();
				}
			} else if (!U.isEmptyObjectOrString(k.navPath)) {
				N.navigate(k.navPath, i.controller.getView().getModel("view").getProperty("/level"));
			}
		}

		function m(e, E, i) {
			var T = i + "('" + O.get().uid() + "')";
			var k = new g(e, T);
			var v = [];
			if (E.getBindingContext()) {
				v.push(E.getBindingContext());
			}
			return {
				model: e,
				source: E,
				contexts: v,
				targetContext: k
			};
		}

		function n(e, i) {
			if (i.hasOwnProperty("sap:action-for")) {
				var L = a.getOwnerControl(e.source);
				if (L) {
					var k = typeof L.getTable === "function" ? L.getTable().getSelectedItems() : L.getSelectedItems();
					if (k && k.length > 0) {
						e.contexts.unshift(k[0].getBindingContext());
					}
				}
			}
			if (e.contexts.length === 0) {
				e.contexts.push(new g(e.model, "/UserProfiles('" + e.key + "')"));
			}
		}

		function o(e) {
			var k = {};
			if (e && e.key && e.key.propertyRef) {
				for (var i = 0; i < e.key.propertyRef.length; i++) {
					var K = e.key.propertyRef[i].name;
					k[K] = true;
				}
			}
			return k;
		}

		function p(e) {
			return e["com.sap.vocabularies.Common.v1.Label"] ? e["com.sap.vocabularies.Common.v1.Label"].String : e.name;
		}

		function q(e, R) {
			var v = e.contexts[0];
			var w = v.getPath();
			var x = [];
			if (0 !== w.indexOf("/")) {
				w = "/" + w;
			}
			e.sideEffect.target = R.data;
			if (R.data.hasOwnProperty("__batchResponses")) {
				var y = R.data.__batchResponses[0];
				if (y.hasOwnProperty("__changeResponses")) {
					var z = y.__changeResponses[0];
					e.sideEffect.target = z.data;
				}
			}
			if (e.sideEffect.originType === e.sideEffect.functionImport.returnType) {
				var A = [];
				U.getObjectChanges(e.sideEffect.origin, e.sideEffect.target, A);
				var D = A.length > 0;
				if (e.sideEffect.TargetEntities.length > 0) {
					for (var k = 0; k < e.sideEffect.TargetEntities.length; k++) {
						var E = e.sideEffect.TargetEntities[k].NavigationPropertyPath;
						if (E != undefined) {
							x.push(E);
						}
					}
				}
				if (D) {
					for (var i = 0; i < x.length; i++) {
						E = x[i];
						P.read(e.model, w + "/" + E);
					}
				}
			}
		}

		function r(k, v) {
			var w = k.model.getMetaModel();
			var x = w.getODataFunctionImport(v);
			var y, E, T;
			n(k, x);
			y = k.contexts[0];
			var z = y.getObject();
			if (y && y.getPath()) {
				var A = O.get().getEntitySetFromContext(y);
				var D = w.getODataEntitySet(A, false);
				E = w.getODataEntityType(D.entityType, false);
			}
			var J = {
				parameterData: {},
				additionalParameters: [],
				functionImport: x,
				entitySet: D,
				entityType: E
			};
			var K = o(E);
			var L = x.entitySet ? o(w.getODataEntityType(w.getODataEntitySet(x.entitySet).entityType)) : undefined;
			var Q = [],
				R = [];
			if (x.returnType) {
				var V = w.getODataEntityType(x.returnType, false);
				if (V && V.hasOwnProperty("com.sap.vocabularies.Common.v1.SideEffects#SideEffects")) {
					k.sideEffect = V["com.sap.vocabularies.Common.v1.SideEffects#SideEffects"];
					k.sideEffect.functionImport = x;
					k.sideEffect.origin = {};
					k.sideEffect.SourceProperties.forEach(function(e) {
						k.sideEffect.origin[e.PropertyPath] = k.contexts[0].getProperty(e.PropertyPath);
					});
					k.sideEffect.originType = k.contexts[0].getObject().__metadata.type;
				}
			}
			if (x.parameter) {
				for (var i = 0; i < x.parameter.length; i++) {
					var W = x.parameter[i];
					var X;
					var Y = W.name;
					var Z = !!K[Y];
					var $ = L ? !!L[Y] : false;
					X = undefined;
					if (z.hasOwnProperty(Y)) {
						X = z[Y];
						$ &= !U.isEmptyObjectOrString(z[Y]);
					} else if (Z) {
						jQuery.sap.log.error("parameter of action not found in current context: " + Y);
						throw new Error("parameter of action not found in current context: " + Y);
					} else {
						$ = false;
					}
					J.parameterData[Y] = X;
					if (!Z && !$ && W.mode.toUpperCase() == "IN") {
						if (W["Org.OData.Measures.V1.ISOCurrency"] != undefined) {
							Q.push(W);
						} else {
							R.push(W);
						}
					}
				}
				J.additionalParameters = J.additionalParameters.concat(Q);
				J.additionalParameters = J.additionalParameters.concat(R);
			}
			return J;
		}

		function B(e, i) {
			var k = new S({
				editable: true
			});
			k.setBindingContext(i);
			var v;
			var w = [];
			var x = new G({
				label: ""
			});
			var y;
			var L;
			var z;
			var A = [];
			var V = new Map();
			for (var D = 0; D < e.additionalParameters.length; D++) {
				var E = e.additionalParameters[D];
				if (-1 === A.indexOf(E.name)) {
					var J = E["com.sap.vocabularies.Common.v1.ValueListWithFixedValues"] ? "fixed-values" : undefined;
					var K = E["Org.OData.Measures.V1.ISOCurrency"] != undefined;
					var Q = E["com.sap.vocabularies.Common.v1.ValueList"] != undefined;
					var R = "";
					var T = [];
					var W = [];
					v = new d({
						value: '{' + E.name + '}',
						textLabel: p(E),
						width: "100%",
					}).addStyleClass("sapUiSmallMarginBottom");
					if (K) {
						var X = e.additionalParameters.find(function(d1) {
							return d1.name === E["Org.OData.Measures.V1.ISOCurrency"].Path;
						});
						A.push(E["Org.OData.Measures.V1.ISOCurrency"].Path);
						z = {
							entitySet: e.entitySet,
							entityType: e.entityType,
							navigationPath: "",
							path: E["Org.OData.Measures.V1.ISOCurrency"].Path,
							property: {
								property: X,
								typePath: E["Org.OData.Measures.V1.ISOCurrency"].Path
							}
						};
						if (X["com.sap.vocabularies.Common.v1.FieldControl"] && X["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember ===
							"com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
							v.setUomEditable(false);
						}
					}
					if (Q) {
						for (var Y = 0; Y < E["com.sap.vocabularies.Common.v1.ValueList"].Parameters.length; Y++) {
							var Z = E["com.sap.vocabularies.Common.v1.ValueList"].Parameters[Y];
							switch (Z.RecordType) {
								case "com.sap.vocabularies.Common.v1.ValueListParameterInOut":
									R = Z.LocalDataProperty.PropertyPath;
									break;
								case "com.sap.vocabularies.Common.v1.ValueListParameterOut":
									T.push(Z.LocalDataProperty.PropertyPath);
									break;
								default:
							}
						}
						for (var $ in E) {
							if ($.indexOf("com.sap.vocabularies.Common.v1.ValueList#") > -1) {
								W.push(E[$]);
							}
						}
					}
					v.data("configdata", {
						"configdata": {
							isInnerControl: E["Org.OData.Measures.V1.ISOCurrency"] != undefined,
							path: E.name,
							entitySetObject: {},
							annotations: {
								valuelist: E["com.sap.vocabularies.Common.v1.ValueList"],
								valuelistType: J,
								uom: z
							},
							additionalAnnotations: W,
							modelObject: i.oModel,
							entityType: E.type,
							property: {
								property: E,
								typePath: E.name
							},
							isUOM: E["Org.OData.Measures.V1.ISOCurrency"] != undefined,
							inOutParameter: R,
							outParameters: T.join()
						}
					});
					if (E.nullable == "false") {
						v.setMandatory(true);
					}
					if (E["com.sap.vocabularies.Common.v1.FieldControl"]) {
						if ("com.sap.vocabularies.Common.v1.FieldControlType/Hidden" === E["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember) {
							v.setVisible(false);
						}
						if ("com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly" === E["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember) {
							v.setEnabled(false);
						}
					}
					y = new c();
					y.addElement(v);
				}
				x.addGroupElement(y);
				k.addGroup(x);
			}
			var a1 = function() {
				var T = [];
				var d1 = jQuery.grep(k.getSmartFields(), function(v) {
					var f1 = v.getCustomData().find(function(f1) {
						return f1.getKey() === "configdata";
					});
					return (f1 && !U.isEmptyObjectOrString(f1.getValue().configdata.outParameters));
				});
				if (d1 && d1.length > 0) {
					d1.forEach(function(f1) {
						var g1 = f1.getCustomData().find(function(g1) {
							return g1.getKey() === "configdata";
						});
						T = T.concat(g1.getValue().configdata.outParameters.split());
					});
				}
				var e1 = jQuery.grep(k.getSmartFields(), function(v) {
					var f1 = false;
					if (T) {
						f1 = T.indexOf(v.getDataProperty().property.name) !== -1;
					}
					return (f1 == true && v.getValue() == "" && v.getDataType() != "Edm.Boolean");
				});
				return e1;
			};
			var b1 = function() {
				var d1 = jQuery.grep(k.getSmartFields(), function(v) {
					return (v.getMandatory() == true && v.getValue() == "" && v.getDataType() != "Edm.Boolean");
				});
				return d1;
			};
			var c1 = function() {
				return k.check();
			};
			return {
				form: k,
				getEmptyMandatoryFields: b1,
				getEmptyMandatoryValueHelpFields: a1,
				checkValuesValidityFields: c1
			};
		}

		function s(e, i, D, k) {
			var v = this,
				w, A;
			var x = e.getBindingContext();
			var y = x ? x.getProperty("Pernr") : O.get().getCurrentTripContext().Pernr;
			var z = i.getView().getModel();
			var E = C.getObjectCustomData(e);
			var J = E.FieldGroupAction;
			var K = '/' + E.Action.split('/')[1];
			var L = m(z, e, K);
			L.key = y;
			L.controller = i;
			var Q;
			Q = r(L, E.Action, L.controller);
			var R = E.Label || K;
			var T = function(i) {
				O.get().removeDeferredGroupId(L.model, v.sActionGroupId);
				if (A || (i && i.actionContext)) {
					L.model.deleteCreatedEntry(A ? A : i.actionContext);
				}
				if (w) {
					w.abort();
				}
			};
			L.pendingChanges = L.model.getPendingChanges();
			if (Q != undefined && Q.additionalParameters && Q.additionalParameters.length == 0) {
				var V = {
					urlParameters: Q.parameterData,
					batchGroupId: this.sActionGroupId,
					functionImport: Q.functionImport
				};
				O.get().addDeferredGroupId(L.model, this.sActionGroupId);
				var W = function(a1, b1) {
					var c1;
					if (b1.headers.location) {
						c1 = b1.headers.location.split("/").pop();
					} else if (b1 && b1.data && b1.data.__batchResponses && b1.data.__batchResponses[0] && b1.data.__batchResponses[0].__changeResponses &&
						b1.data.__batchResponses[0].__changeResponses[0] && b1.data.__batchResponses[0].__changeResponses[0].headers && b1.data.__batchResponses[
							0].__changeResponses[0].headers["location"]) {
						c1 = b1.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
					}
					O.get().removeDeferredGroupId(L.model, v.sActionGroupId);
					if (a1 && b1 && U.getPropertyOrSubPropery(a1, "PDF")) {
						if (!L.controller._oPdfViewer) {
							L.controller._oPdfViewer = new h();
							L.controller.getView().addDependent(L.controller._oPdfViewer);
						}
						var d1 = U.getPropertyOrSubPropery(b1.data, "URL");
						L.controller._oPdfViewer.setSource(d1);
						L.controller._oPdfViewer.setTitle("PDF Form");
						L.controller._oPdfViewer.setShowDownloadButton(false);
						L.controller._oPdfViewer.open();
					} else if (a1 && U.getPropertyOrSubPropery(a1, "ExternalLink")) {
						window.open(U.getPropertyOrSubPropery(a1, "URL"), "_blank", "noopener,noreferrer");
					} else {
						if (J != "TravelPlan") {
							var e1 = N.getNavigationPathFromReponse(a1, b1);
							var f1 = !U.isEmptyObjectOrString(e1.subPath) && !U.isEmptyObjectOrString(e1.navPath);
							var g1 = L.contexts[0].getPath().substring(1) !== e1.subPath;
							if (!g1 && !f1) {
								q(L, b1);
							}
							_(z, L, e1, e);
						}
					}
				};
				var X = function() {
					P.callFunction(z, {
						name: K,
						source: e,
						success: W,
						error: T,
						functionalError: T,
						urlParameters: Q.parameterData,
						batchGroupId: V.batchGroupId
					});
				};
				var Y = function() {
					P.submitChanges(z, {
						success: X,
						error: T,
						functionalError: X,
						submitChangeOrigin: P.SUBMIT_CHANGE_ORIGIN.ACTION,
					});
				};
				if (Q.functionImport) {
					var Z = Q.functionImport["com.sap.vocabularies.Common.v1.IsActionCritical"] != undefined;
					if (Z) {
						F.get().confirmationDialog({
							controller: L.controller,
							name: Q.functionImport.name,
							label: R,
							success: Y,
							error: T
						});
						return;
					}
				}
				Y();
			} else if (Q != undefined && Q.additionalParameters && Q.additionalParameters.length > 0) {
				var V = {
					urlParameters: {},
					batchGroupId: this.sActionGroupId,
					functionImport: Q.functionImport
				};
				O.get().addDeferredGroupId(L.model, this.sActionGroupId);
				var $ = function(a1) {
					var W = function(f1, g1) {
						var h1;
						if (g1.headers.location) {
							h1 = g1.headers.location.split("/").pop();
						} else if (g1 && g1.data && g1.data.__batchResponses && g1.data.__batchResponses[0] && g1.data.__batchResponses[0].__changeResponses &&
							g1.data.__batchResponses[0].__changeResponses[0] && g1.data.__batchResponses[0].__changeResponses[0].headers && g1.data.__batchResponses[
								0].__changeResponses[0].headers["location"]) {
							h1 = g1.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
						}
						O.get().removeDeferredGroupId(L.model, v.sActionGroupId);
						if (v.oActionDialog) {
							v.oActionDialog.close();
						}
						if (f1 && g1 && U.getPropertyOrSubPropery(f1, "PDF")) {
							if (!L.controller._oPdfViewer) {
								L.controller._oPdfViewer = new h();
								L.controller.getView().addDependent(L.controller._oPdfViewer);
							}
							var i1 = U.getPropertyOrSubPropery(g1.data, "URL");
							L.controller._oPdfViewer.setSource(i1);
							L.controller._oPdfViewer.setTitle("PDF Form");
							L.controller._oPdfViewer.setShowDownloadButton(false);
							L.controller._oPdfViewer.open();
						} else if (f1 && U.getPropertyOrSubPropery(f1, "ExternalLink")) {
							window.open(U.getPropertyOrSubPropery(f1, "URL"), "_blank", "noopener,noreferrer");
						} else {
							if (J != "TravelPlan") {
								var j1 = N.getNavigationPathFromReponse(f1, g1);
								var k1 = !U.isEmptyObjectOrString(j1.subPath) && !U.isEmptyObjectOrString(j1.navPath);
								var l1 = L.contexts[0].getPath().substring(1) !== j1.subPath;
								if (!l1 && !k1) {
									q(L, g1);
								}
								_(z, L, j1, e);
							}
						}
					};
					var b1, c1;
					for (var d1 in z.getPendingChanges()) {
						c1 = "/" + d1;
						b1 = z.getProperty(c1);
						if (b1) {
							for (var e1 in a1) {
								if (b1.hasOwnProperty(e1) && b1[e1] == null) {
									z.setProperty(c1 + "/" + e1, "");
								}
							}
						}
					}
					O.get().deletePendingChanges(L.model, L.pendingChanges);
					P.submitChanges(z, {
						source: e,
						success: W,
						submitChangeOrigin: P.SUBMIT_CHANGE_ORIGIN.ACTION
					});
				};
				w = L.model.callFunction(K, {
					method: V.functionImport.httpMethod,
					urlParameters: V.urlParameters,
					batchGroupId: V.batchGroupId
				});
				if (k === false) {
					return {
						context: w,
						success: $,
						close: T,
						draftTripNo: D,
						actionParam: Q
					};
				} else {
					w.contextCreated().then(function(a1) {
						A = a1;
						var b1 = B(Q, A);
						for (var c1 in Q.parameterData) {
							A.oModel.setProperty(c1, Q.parameterData[c1], A);
						}
						v.oActionDialog = F.get().getFunctionImportDialog(L, {
							label: R,
							parameter: b1,
							success: $,
							close: T,
							draftTripNo: D,
							successArg: Q.parameterData
						});
						var d1 = function() {
							b1.form.getSmartFields().forEach(function(e1) {
								e1.getBinding("value").attachChange(function(f1) {
									if (e1.getValueState() === sap.ui.core.ValueState.Error) {
										e1.setValueState(sap.ui.core.ValueState.None);
									}
								});
							});
						};
						v.oActionDialog.attachBeforeOpen(d1);
						v.oActionDialog.setModel(A.oModel);
						v.oActionDialog.open();
					});
				}
			}
		}

		function t(e, i) {
			var k = this;
			var v = e.getBindingContext();
			var w = v ? v.getProperty("Pernr") : O.get().getCurrentTripContext().Pernr;
			var x = i.getView().getModel();
			var y = C.getObjectCustomData(e);
			var z = y.Label || A;
			var A = '/' + y.Action.split('/')[1];
			var D = m(x, e, A);
			D.key = w;
			D.controller = i;
			var E = a.getOwnerControl(e).getParent();
			var J = E.getEntitySet();
			var K;
			K = r(D, y.Action, D.controller);
			var L = {
				urlParameters: K.parameterData,
				batchGroupId: this.sActionGroupId,
				functionImport: K.functionImport
			};
			O.get().addDeferredGroupId(D.model, this.sActionGroupId);
			var Q = function(X, Y) {
				var Z;
				if (Y.headers.location) {
					Z = Y.headers.location.split("/").pop();
				} else if (Y && Y.data && Y.data.__batchResponses && Y.data.__batchResponses[0] && Y.data.__batchResponses[0].__changeResponses && Y
					.data.__batchResponses[0].__changeResponses[0] && Y.data.__batchResponses[0].__changeResponses[0].headers && Y.data.__batchResponses[
						0].__changeResponses[0].headers["location"]) {
					Z = Y.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
				}
				if (X) {
					var $ = N.getNavigationPathFromReponse(X, Y);
					var a1 = !U.isEmptyObjectOrString($.subPath) && !U.isEmptyObjectOrString($.navPath);
					var b1 = D.contexts[0].getPath().substring(1) !== $.subPath;
					if (!b1 && !a1) {
						q(D, Y);
					}
					_(x, D, $, e);
					D.controller._lastCreatedItem[J] = '/' + $.subPath;
				}
			};
			var R = function() {
				P.callFunction(x, {
					name: A,
					success: Q,
					source: e,
					urlParameters: K.parameterData,
					batchGroupId: L.batchGroupId
				});
			};
			var T = function() {
				P.submitChanges(x, {
					success: R,
					submitChangeOrigin: P.SUBMIT_CHANGE_ORIGIN.ACTION,
				});
			};
			var V = function() {
				O.get().removeDeferredGroupId(D.model, k.sActionGroupId);
			};
			if (K.functionImport) {
				var W = K.functionImport["com.sap.vocabularies.Common.v1.IsActionCritical"] != undefined;
				if (W) {
					F.get().confirmationDialog({
						controller: D.controller,
						name: K.functionImport.name,
						label: z,
						success: T,
						error: V
					});
					return;
				}
			}
			T();
		}

		function u(e, i) {
			return this.callAction(e.getSource(), i, undefined, false);
		}
		return {
			sActionGroupId: "DataFieldActionChanges",
			callAction: s,
			callInLineAction: t,
			getActionContext: u,
			buildParametersForm: B
		};
	}
	return l();
}, true);
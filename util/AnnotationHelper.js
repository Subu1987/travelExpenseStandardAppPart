/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(["sap/ui/base/Object", "sap/fin/travel/lib/reuse/util/i18n", "sap/fin/travel/lib/reuse/util/Utils"], function(B, I, U) {
	"use strict";
	var A = B.extend("AnnotationHelper");
	A.debugArgs = function() {
		var d = 1;
		var e = new Error();
		var f = (e.stack.split('\n')[0 + d].match(/^.*(?=@)/) || [])[0];
		var c = ((((e.stack.split('at ') || [])[1 + d] || '').match(/(^|\.| <| )(.*[^(<])( \()/) || [])[2] || '').split('.').pop();
		var s = e.stack.split('\n')[0 + d];
		var l = f || c || s;
		var C = jQuery.sap.log.getLevel();
		jQuery.sap.log.setLevel(jQuery.sap.log.Level.INFO);
		jQuery.sap.log.info("From function=" + l + ", arguments=");
		jQuery.sap.log.setLevel(C);
	};
	A.test = function(R, V, t) {
		A.debugArgs(arguments);
		return true;
	};
	A.resolvePriority = function(a) {
		return a ? a.split('/')[a.split('/').length - 1] : "Medium";
	};
	A.resolveCriticalityRepresentation = function(d) {
		return (d.CriticalityRepresentation && d.CriticalityRepresentation.EnumMember ===
			"com.sap.vocabularies.UI.v1.CriticalityRepresentationType/WithoutIcon") ? "WithoutIcon" : "WithIcon";
	};
	A.resolveMetaModelPath = function(c) {
		var p = c.getObject();
		var m = c.getModel();
		var M = m.getProperty("/metaModel");
		return M.createBindingContext(p);
	};
	A.getEntityTitle = function(m, e) {
		var M = m.getMetaModel();
		return e["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value;
	};
	A.getEntityContext = function(c) {
		var p = c.getObject(),
			m = c.getModel(),
			M = m.getProperty("/metaModel"),
			e = M.getODataEntitySet(p.entitySet),
			E = M.getODataEntityType(e.entityType),
			a = "",
			w = {};
		if (!w.lineItem) {
			a = E.$path + "/com.sap.vocabularies.UI.v1.LineItem";
			w.lineItem = M.getObject(a);
			w.lineItemPath = a;
			w.lineItemQualifier = "";
		}
		if (!w.selectionItem) {
			w.selectionItem = [];
			w.selectionItemPath = E.$path + "/com.sap.vocabularies.UI.v1.SelectionFields";
			var s = M.getObject(w.selectionItemPath);
			var S = [];
			s.forEach(function(o) {
				var f = jQuery.grep(E.property, function(F) {
					return F.name === o.PropertyPath && (F.type === "Edm.DateTime" || F.type === "Edm.Date");
				});
				if (f.length == 1) {
					w.selectionItem.push(o);
				}
			});
		}
		m.setProperty("/workingContext", w);
		return "/workingContext";
	};
	A.getSubEntityContext = function(c) {
		var p = c.getObject(),
			m = c.getModel(),
			M = m.getProperty("/metaModel"),
			e = M.getODataEntitySet(p.entitySet),
			E = M.getODataEntityType(e.entityType),
			a = "",
			w = {};
		if (!w.lineItem) {
			a = E.$path + "/com.sap.vocabularies.UI.v1.LineItem";
			w.lineItem = M.getObject(a);
			w.lineItemPath = a;
			w.lineItemQualifier = "";
		}
		m.setProperty("/detailContext", w);
		return "/detailContext";
	};
	A.updateEntityContext = function(c, e, v) {
		var m = c.metaModel,
			a = "";
		if (v) {
			var p = e[v.annotationPath];
			if (p) {
				c.detailContext.lineItemQualifier = e.$path + "/" + p.Visualizations[0].AnnotationPath.replace(/@/g, '');
			}
		} else {
			c.detailContext.lineItemQualifier = "";
		}
		return true;
	};
	A.getObjectPageSectionAnchorButtonIconPath = function(c) {
		if (!U.isEmptyObjectOrString(c) && !U.isEmptyObjectOrString(c.Path)) {
			return "{= ${" + c.Path + "} === 1 ? 'sap-icon://message-error' : (${" + c.Path + "} === 2 ? 'sap-icon://message-warning' : '') }";
		}
		return "";
	};
	A.getObjectPageSectionAnchorButtonTypePath = function(c) {
		if (!U.isEmptyObjectOrString(c) && !U.isEmptyObjectOrString(c.Path)) {
			return "{= ${" + c.Path + "} === 1 ? 'error' : (${" + c.Path + "} === 2 ? 'warning' : '') }";
		}
		return "";
	};
	A.shouldDisplaySection = function(h) {
		if (h) {
			return "{= !$" + A.getBindingForPath(h) + "}";
		}
		return true;
	};
	A.sectionVisible = function(h, d, e) {
		return !h && (!d || (e && e.length > 0));
	};
	A.getBindingForAnnotationPath = function(a) {
		return a.substring(0, a.indexOf("/"));
	};
	A.getBindingForPath = function(p) {
		return "{" + p + "}";
	};
	A.isDeepFacetHierarch = function(f) {
		if (f.Facets) {
			for (var i = 0; i < f.Facets.length; i++) {
				if (f.Facets[i].RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
					return true;
				}
			}
		}
		return false;
	};
	A.doesFieldGroupContainOnlyOneMultiLineDataField = function(f, F) {
		if (f.Data.length !== 1) {
			return false;
		}
		if ((F['com.sap.vocabularies.UI.v1.MultiLineText'] === undefined) || (f.Data[0].RecordType !== "com.sap.vocabularies.UI.v1.DataField")) {
			return false;
		}
		return true;
	};
	A.replaceSpecialCharsInId = function(i) {
		if (i.indexOf(" ") >= 0) {
			jQuery.sap.log.error(
				"Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there.");
		}
		return i.replace(/@/g, "").replace(/\//g, "::").replace(/#/g, "::");
	};
	A.getStableIdPartFromDataPoint = function(d) {
		var p = "";
		if (d.Value && d.Value.Path) {
			return A.replaceSpecialCharsInId(d.Value.Path);
		} else if (d.Value && d.Value.Apply && d.Value.Apply.Name === "odata.concat") {
			for (var i = 0; i < d.Value.Apply.Parameters.length; i++) {
				if (d.Value.Apply.Parameters[i].Type === "Path") {
					if (p) {
						p = p + "::";
					}
					p = p + A.replaceSpecialCharsInId(d.Value.Apply.Parameters[i].Value);
				}
			}
			return p;
		} else {
			jQuery.sap.log.error("Annotation Helper: Unable to create stable ID derived from annotations.");
		}
	};
	A.formatDateTimeOffset = function(d) {
		return "{path: '" + d.Value.Path + "', type: 'sap.ui.model.odata.type.DateTime', formatOptions: { 'UTC': true, style: 'medium' } }";
	};
	A.formatWithExpand = function(i, d, e) {
		var m = i.getInterface(0).getModel();
		var E = m.getODataEntityType(e.entityType);
		var p = m.getODataEntityType(e.entityType).property.find(function(b) {
			return b.name === d.Path;
		});
		var a = p.type === "Edm.DateTimeOffset";
		if (a) {
			return "{path:'" + d.Path + "',type:'sap.ui.model.odata.type.DateTime',formatOptions:{UTC:true}}";
		}
		A.getNavigationPathWithExpand(i, d, e);
		i = i.getInterface(0);
		A.formatWithExpandSimple(i, d, e);
		return sap.ui.model.odata.AnnotationHelper.format(i, d);
	};
	A.formatWithExpandSimple = function(i, d, e) {
		var E = [],
			s, o;
		var m = i && i.getModel && i.getModel();
		if (!m) {
			i = i.getInterface(0);
			m = i.getModel();
		}
		if (e) {
			o = m.getODataEntityType(e.entityType);
		} else {
			var M = /^(\/dataServices\/schema\/\d+\/entityType\/\d+)(?:\/|$)/.exec(i.getPath());
			if (M && M.length && M[0]) {
				var a = m.getProperty(M[0]);
				var n = m.getODataEntityContainer().namespace;
				o = m.getODataEntityType(n + '.' + a.name);
			}
		}
		if (o) {
			if (d && d.Path) {
				s = A._getNavigationPrefix(m, o, d.Path);
				if (s) {
					E.push(s);
				}
			} else if (d && d.Apply && d.Apply.Name === "odata.concat") {
				d.Apply.Parameters.forEach(function(P) {
					if (P.Type === "Path") {
						s = A._getNavigationPrefix(m, o, P.Value);
						if (s) {
							if (E.indexOf(s) === -1) {
								E.push(s);
							}
						}
					}
				});
			}
			if (E.length > 0) {
				var p = i.getSetting("preprocessorsData");
				if (p) {
					var r = p.rootContextExpand || [];
					for (var j = 0; j < E.length; j++) {
						if (r.indexOf(E[j]) === -1) {
							r.push(E[j]);
						}
					}
					p.rootContextExpand = r;
				}
			}
		}
		return sap.ui.model.odata.AnnotationHelper.format(i, d);
	};
	A.formatWithExpandSimpleWithDefault = function(i, d, e) {
		var E = [],
			s;
		var m = i && i.getModel && i.getModel();
		if (!m) {
			i = i.getInterface(0);
			m = i.getModel();
		}
		if (e) {
			if (d && d.Path) {
				s = A._getNavigationPrefix(m, e, d.Path);
				if (s) {
					E.push(s);
				}
			} else if (d && d.Apply && d.Apply.Name === "odata.concat") {
				d.Apply.Parameters.forEach(function(P) {
					if (P.Type === "Path") {
						s = A._getNavigationPrefix(m, e, P.Value);
						if (s) {
							if (E.indexOf(s) === -1) {
								E.push(s);
							}
						}
					}
				});
			}
			if (E.length > 0) {
				var p = i.getSetting("preprocessorsData");
				if (p) {
					var r = p.rootContextExpand || [];
					for (var j = 0; j < E.length; j++) {
						if (r.indexOf(E[j]) === -1) {
							r.push(E[j]);
						}
					}
					p.rootContextExpand = r;
				}
			}
		}
		return "{= $" + sap.ui.model.odata.AnnotationHelper.format(i, d) + " === '' ? '" + A.getDefaultEntityTitle(e[
				"com.sap.vocabularies.UI.v1.HeaderInfo"] ? e["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName.String : e.name) + "' : $" + sap.ui.model
			.odata.AnnotationHelper.format(i, d) + "}";
	};
	A.getDefaultEntityTitle = function(e) {
		return A.resolveI18n("NEW") + " " + e;
	};
	A.getNavigationPathWithExpand = function(i, c, e) {
		i = i.getInterface(0);
		var E = [];
		var m = i.getModel();
		var o = m.getODataEntitySet(e.name || '');
		var r = sap.ui.model.odata.AnnotationHelper.resolvePath(m.getContext(i.getPath()));
		var n = sap.ui.model.odata.AnnotationHelper.getNavigationPath(i, c);
		var N = n.replace("{", "").replace("}", "");
		var a;
		if (N) {
			a = m.getODataEntityType(o.entityType);
			var b = m.getODataAssociationSetEnd(a, N);
			if (b && b.entitySet) {
				o = m.getODataEntitySet(b.entitySet);
			}
		} else {
			a = m.getODataEntityType(e.entityType);
		}
		E = A.getFacetExpand(r, m, a, o);
		if (E.length > 0) {
			if (N === "") {
				var p = i.getSetting("preprocessorsData");
				if (p) {
					var R = p.rootContextExpand || [];
					for (var j = 0; j < E.length; j++) {
						if (R.indexOf(E[j]) === -1) {
							R.push(E[j]);
						}
					}
					p.rootContextExpand = R;
				}
			} else {
				n = "{ path : '" + N + "', parameters : { expand : '" + E.join(',') + "'} }";
			}
		}
		if (n === "{}") {
			n = "";
		}
		return n;
	};
	A.getFacetExpand = function(r, m, E, o) {
		var d = [],
			a = [],
			f, F = [];
		if (r) {
			F = m.getObject(r) || [];
		}
		F = F.Data || F;
		var G = function(p, c) {
			var s = A._getNavigationPrefix(m, E, p);
			if (s) {
				if (a.indexOf(s) === -1) {
					a.push(s);
				}
			}
			if (c) {
				try {
					d = sap.ui.comp.smartfield.SmartField.getSupportedAnnotationPaths(m, o, p, true) || [];
				} catch (e) {
					d = [];
				}
				for (var i = 0; i < d.length; i++) {
					if (a.indexOf(d[i]) === -1) {
						a.push(d[i]);
					}
				}
			}
		};
		var b = function(p) {
			if (p.Type === "LabeledElement") {
				G(p.Value.Path);
			} else if (p.Type === "Path") {
				G(p.Value);
			}
		};
		for (var i = 0; i < F.length; i++) {
			f = F[i];
			if (f.Value && f.Value.Path) {
				G(f.Value.Path, true);
			}
			if (f.Value && f.Value.Apply && f.Value.Apply.Name === "odata.concat") {
				f.Value.Apply.Parameters.forEach(b);
			}
			if (f.Action && f.Action.Path) {
				G(f.Action.Path);
			}
			if (f.Target) {
				if (f.Target.Path) {
					G(f.Target.Path);
				}
				if (f.Target.AnnotationPath) {
					G(f.Target.AnnotationPath);
				}
			}
			if (f.SemanticObject && f.SemanticObject.Path) {
				G(f.SemanticObject.Path);
			}
			if (f.Url && f.Url.Path) {
				G(f.Url.Path);
			}
			if (f.Url && f.Url.Apply && f.Url.Apply.Parameters) {
				f.Url.Apply.Parameters.forEach(b);
			}
			if (f.UrlContentType && f.UrlContentType.Path) {
				G(f.UrlContentType.Path);
			}
		}
		if (F.name) {
			G(F.name, true);
		}
		return a;
	};
	A._getNavigationPrefix = function(m, e, p) {
		var E = "";
		var P = p.split("/");
		if (P.length > 1) {
			for (var i = 0; i < (P.length - 1); i++) {
				var a = m.getODataAssociationEnd(e, P[i]);
				if (a) {
					e = m.getODataEntityType(a.type);
					if (E) {
						E = E + "/";
					}
					E = E + P[i];
				} else {
					return E;
				}
			}
		}
		return E;
	};
	A.getStableIdPartFromDataField = function(d) {
		var p = "",
			s = "";
		if (d.RecordType && d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
			return A.replaceSpecialCharsInId(d.Action.String);
		} else if (d.RecordType && (d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" || d.RecordType ===
				"com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation")) {
			if (d.SemanticObject.String) {
				s = A.replaceSpecialCharsInId(d.SemanticObject.String);
			} else if (d.SemanticObject.Path) {
				s = A.replaceSpecialCharsInId(d.SemanticObject.Path);
			}
			if (d.Action && d.Action.String) {
				s = s + "::" + A.replaceSpecialCharsInId(d.Action.String);
			} else if (d.Action && d.Action.Path) {
				s = s + "::" + A.replaceSpecialCharsInId(d.Action.Path);
			}
			return s;
		} else if (d.RecordType && d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
			return A.replaceSpecialCharsInId(d.Target.AnnotationPath);
		} else if (d.Value && d.Value.Path) {
			return A.replaceSpecialCharsInId(d.Value.Path);
		} else if (d.Value && d.Value.Apply && d.Value.Apply.Name === "odata.concat") {
			for (var i = 0; i < d.Value.Apply.Parameters.length; i++) {
				if (d.Value.Apply.Parameters[i].Type === "Path") {
					if (p) {
						p = p + "::";
					}
					p = p + A.replaceSpecialCharsInId(d.Value.Apply.Parameters[i].Value);
				}
			}
			return p;
		} else {
			jQuery.sap.log.error("Annotation Helper: Unable to create a stable ID. Please check the annotations.");
		}
	};
	A.replaceSpecialCharsInId = function(i) {
		if (i.indexOf(" ") >= 0) {
			jQuery.sap.log.error(
				"Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there.");
		}
		return i.replace(/@/g, "").replace(/\//g, "::").replace(/#/g, "::");
	};
	A.checkMoreBlockContent = function(f) {
		return A.checkFacetContent(f, false);
	};
	A.checkBlockContent = function(f) {
		return A.checkFacetContent(f, true);
	};
	A.checkFacetContent = function(f, b) {
		var p;
		var i = f.getInterface(0);
		var F = f.getModel().getProperty("", f);
		var a = f.getPath().split("/Facets");
		var c = i.getModel().getContext(a[0]);
		if (i.getModel().getProperty('', c).RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
			return c.getPath();
		} else {
			if (!F) {
				return undefined;
			}
			for (var d = 0; d < F.length; d++) {
				if (!b) {
					if (F[d]["com.sap.vocabularies.UI.v1.PartOfPreview"] && F[d]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "false") {
						p = i.getPath() + "/" + d;
						break;
					}
				} else {
					if (F[d].RecordType !== "com.sap.vocabularies.UI.v1.ReferenceFacet" || (!F[d]["com.sap.vocabularies.UI.v1.PartOfPreview"] || F[d][
							"com.sap.vocabularies.UI.v1.PartOfPreview"
						].Bool === "true")) {
						p = i.getPath() + "/" + d;
						break;
					}
				}
			}
		}
		return p;
	};
	A.isDeepFacetHierarchy = function(f) {
		if (f.Facets) {
			for (var i = 0; i < f.Facets.length; i++) {
				if (f.Facets[i].RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
					return true;
				}
			}
		}
		return false;
	};
	A.doesCollectionFacetOnlyContainForms = function(f) {
		var r = true;
		if (f.Facets) {
			for (var i = 0; i < f.Facets.length; i++) {
				if (f.Facets[i].Target && f.Facets[i].Target.AnnotationPath) {
					if ((f.Facets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.FieldGroup") < 0) && (f.Facets[i].Target.AnnotationPath.indexOf(
							"com.sap.vocabularies.UI.v1.Identification") < 0) && (f.Facets[i].Target.AnnotationPath.indexOf(
							"com.sap.vocabularies.UI.v1.DataPoint") < 0)) {
						r = false;
					}
				}
			}
		} else {
			r = false;
		}
		return r;
	};
	A.showFullScreenButton = function(r, f) {
		if (r && f) {
			var F = A.getStableIdPartFromFacet(f);
			if (r.component && r.component.settings && r.component.settings.sections && r.component.settings.sections[F] && r.component.settings.sections[
					F].tableMode === "FullScreenTable") {
				return true;
			}
		}
		return false;
	};
	A.getSortOrder = function(P) {
		var s = '';
		for (var i = 0; i < P.length; i++) {
			if (!s) {
				s = P[i].Property.PropertyPath;
			} else {
				s = s + ', ' + P[i].Property.PropertyPath;
			}
			if (P[i].Descending) {
				s = s + ' ' + P[i].Descending.Bool;
			}
		}
		return s;
	};
	A.getSelectionModeResponsiveTable = function(e, E, o) {
		var a;
		if (A.hasActions(e)) {
			if (o != undefined) {
				if (typeof o === "boolean") {
					return o ? "SingleSelectLeft" : 'None';
				} else {
					if (o && o.charAt(0) === '!') {
						o = o.slice(1);
						a = "!${" + o + "}";
					} else {
						a = "${" + o + "}";;
					}
					return "{= " + a + " ? 'SingleSelectLeft' : 'None' }";
				}
			} else {
				return "SingleSelectLeft";
			}
		}
		var d = E["Org.OData.Capabilities.V1.DeleteRestrictions"];
		if ((d && d.Deletable && ((d.Deletable.Bool && d.Deletable.Bool !== "false") || d.Deletable.Path)) || !d) {
			if (o != undefined) {
				if (typeof o === "boolean") {
					return o ? "{= !${DisplayMode} ? 'SingleSelectLeft' : 'None' }" : "None";
				} else {
					if (o && o.charAt(0) === '!') {
						o = o.slice(1);
						a = "!${" + o + "}";
					} else {
						a = "${" + o + "}";;
					}
					return "{= !${DisplayMode} ? ( " + a + " ? 'SingleSelectLeft' : 'None' ) : 'None' }";
				}
			} else {
				return "{= !${DisplayMode} ? 'SingleSelectLeft' : 'None' }";
			}
		}
		return "None";
	};
	A.editable = function(P) {
		if (P && P.Bool === "true") {
			return "{= !${DisplayMode} }";
		}
		return false;
	};
	A.hasActions = function(P) {
		for (var i = 0; i < P.length; i++) {
			if ((!P[i].Inline || P[i].Inline.Bool !== "true") && (P[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || P[i].RecordType ===
					"com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation")) {
				return true;
			}
		}
		return false;
	};
	A.createP13NColumnForAction = function(c, d) {
		var C = A._determineColumnIndex(c);
		var s = A.createP13NColumnKey(d);
		var p;
		if (d && d.Value && d.Value.Path) {
			p = '\\{"columnKey":"' + s + '", "sortProperty":"' + d.Value.Path + '", "filterProperty":"' + d.Value.Path + '", "columnIndex":"' + C +
				'", "actionButton":"true" \\}';
		} else {
			p = '\\{"columnKey":"' + s + '", "columnIndex":"' + C + '", "actionButton":"true" \\}';
		}
		return p;
	};
	A.getStableIdPartForDatafieldActionButton = function(d, f, t, c) {
		var s = "";
		var D = "";
		var F = "";
		if (f) {
			F = A.getStableIdPartFromFacet(f);
		}
		if (d) {
			D = A.getStableIdPartFromDataField(d);
		}
		s = (F !== "" ? F + "::" : "") + "action::" + D;
		var S = A.getSuffixFromIconTabFilterKey(t);
		if (S) {
			s = s.concat(S);
		}
		if (c) {
			s = s + "::chart";
		}
		return s;
	};
	A.getIconTabFilterKey = function(t) {
		if (t) {
			if (t.key) {
				return t.key;
			} else {
				return A.replaceSpecialCharsInId(t.annotationPath);
			}
		}
	};
	A.getSuffixFromIconTabFilterKey = function(t) {
		var k = A.getIconTabFilterKey(t);
		if (k) {
			return "-".concat(k);
		} else {
			return "";
		}
	};
	A.createP13N = function(o, c, C, d, w) {
		var p = "",
			a = [],
			n = "";
		if (d.RecordType === "com.sap.vocabularies.UI.v1.DataField" || d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation" ||
			d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
			if (d.Value.Path) {
				var s = A.createP13NColumnKey(d, C);
				p = '\\{"columnKey":"' + s + '", "leadingProperty":"' + d.Value.Path;
				var m = o.getInterface(0).getModel();
				if (m) {
					var e = m.getODataEntityType(c.entityType);
					if (e) {
						n = A._getNavigationPrefix(m, e, d.Value.Path);
						if (n) {
							n = n + "/";
						}
					}
				}
			} else if (d.Value.Apply && d.Value.Apply.Name === "odata.concat") {
				d.Value.Apply.Parameters.forEach(function(P) {
					if (P.Type === "Path") {
						if (!p) {
							p = '\\{"columnKey":"' + P.Value + '", "leadingProperty":"' + P.Value;
						} else {
							a.push(P.Value);
						}
					}
				});
			}
			if (w) {
				a.push("Pernr");
				a.push("Deletable");
				a.push("DraftLinkVisible");
				a.push("DraftLinkType");
				a.push("DraftUserId");
				a.push("Persistencestatus");
				a.push("TripChange");
				a.push("Datecha");
				a.push("Timecha");
			}
			if (c.name === "Advances") {
				a.push("Pernr");
				a.push("Tripno");
				a.push("AdvCurrFc");
				a.push("PayCurrFc");
				a.push("Deletable");
			}
			if (c.name === "Advances" || c.name === "CostAssignments" || c.name === "EstimatedCostCats" || c.name === "Destinations" || c.name ===
				"TravelServices") {
				a.push("Criticality");
			}
			if (c.name === "TravelServices") {
				a.push("ReturnPossible");
				a.push("Tripno");
				a.push("Pernr");
				a.push("Request");
			}
			if ((C.type === "Edm.DateTime") && (C["sap:display-format"] === "Date")) {
				p += '", "type":"date';
			}
			if ((C.type === "Edm.DateTimeOffset")) {
				p += '", "type":"datetime';
			}
			if (d.Criticality && d.Criticality.Path) {
				a.push(d.Criticality.Path);
			}
			if (C["com.sap.vocabularies.Common.v1.Text"] && C["com.sap.vocabularies.Common.v1.Text"].Path) {
				a.push(n + C["com.sap.vocabularies.Common.v1.Text"].Path);
			}
			if (C["Org.OData.Measures.V1.ISOCurrency"] && C["Org.OData.Measures.V1.ISOCurrency"].Path) {
				a.push(n + C["Org.OData.Measures.V1.ISOCurrency"].Path);
			}
			if (C["Org.OData.Measures.V1.Unit"] && C["Org.OData.Measures.V1.Unit"].Path) {
				a.push(n + C["Org.OData.Measures.V1.Unit"].Path);
			}
			if (C["com.sap.vocabularies.Common.v1.FieldControl"] && C["com.sap.vocabularies.Common.v1.FieldControl"].Path) {
				a.push(n + C["com.sap.vocabularies.Common.v1.FieldControl"].Path);
			}
			if ((d["RecordType"] === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") && d.Url && d.Url.Apply && d.Url.Apply.Parameters) {
				d.Url.Apply.Parameters.forEach(function(P) {
					if (P.Type === "LabeledElement") {
						a.push(P.Value.Path);
					}
				});
			}
			if ((d["RecordType"] === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") && d.Url && d.Url.Path) {
				a.push(d.Url.Path);
			}
			if (a.length > 0) {
				var b = "";
				a.forEach(function(P) {
					if (b) {
						b = b + ",";
					}
					b = b + P;
				});
				p += '", "additionalProperty":"' + b;
			}
			var N = false;
			if (c["Org.OData.Capabilities.V1.SortRestrictions"] && c["Org.OData.Capabilities.V1.SortRestrictions"].NonSortableProperties) {
				var f = c["Org.OData.Capabilities.V1.SortRestrictions"].NonSortableProperties;
				for (var i = f.length - 1; i >= 0; i--) {
					if (f[i].PropertyPath === d.Value.Path) {
						N = true;
						break;
					}
				}
			}
			if (!N) {
				if (n) {
					p += '", "sortProperty":"' + n + C.name;
				} else {
					p += '", "sortProperty":"' + C.name;
				}
			}
			var h = false;
			if (c["Org.OData.Capabilities.V1.FilterRestrictions"]) {
				if (c["Org.OData.Capabilities.V1.FilterRestrictions"].Filterable !== 'false') {
					if (c["Org.OData.Capabilities.V1.FilterRestrictions"].NonFilterableProperties) {
						var k = c["Org.OData.Capabilities.V1.FilterRestrictions"].NonFilterableProperties;
						for (var j = k.length - 1; j >= 0; j--) {
							if (k[j].PropertyPath === d.Value.Path) {
								h = true;
								break;
							}
						}
					}
				} else {
					h = true;
				}
			}
			if (!h) {
				p += '", "filterProperty":"' + C.name;
			}
			var l = o.getInterface(2);
			var q = A._determineColumnIndex(l);
			if (q >= 0) {
				p += '", "columnIndex":"' + q;
			}
		}
		return p + '" \\}';
	};
	A.createP13NColumnKey = function(d, c) {
		var C = "";
		var f = "template";
		var s = "::";
		if (d.RecordType === "com.sap.vocabularies.UI.v1.DataField") {
			C = d.Value.Path;
		} else if (d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation") {
			C = f + s + "DataFieldWithIntentBasedNavigation" + s + d.SemanticObject.String + s + d.Action.String + s + d.Value.Path;
		} else if (d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath") {
			C = f + s + "DataFieldWithNavigationPath" + s + d.Target.String;
		} else if (d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
			C = f + s + "DataFieldForIntentBasedNavigation" + s + d.SemanticObject.String + s + d.Action.String;
		} else if (d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
			C = f + s + "DataFieldForAction" + s + d.Action.String;
		} else if (d.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
			if (d.Target.AnnotationPath.indexOf('@com.sap.vocabularies.Communication.v1.Contact') >= 0 || d.Target.AnnotationPath.indexOf(
					'@com.sap.vocabularies.UI.v1.DataPoint') >= 0 || d.Target.AnnotationPath.indexOf('@com.sap.vocabularies.UI.v1.Chart') >= 0) {
				C = f + s + "DataFieldForAnnotation" + s + d.Target.AnnotationPath;
				C = C.replace('@', '');
			}
		}
		return C;
	};
	A._determineColumnIndex = function(c) {
		var C = c.getPath();
		var i = Number(C.slice(C.lastIndexOf("/") + 1));
		var l = C.slice(0, C.lastIndexOf("/"));
		var L = c.getModel().getObject(l);
		var a = 0;
		for (var r = 0; r < i; r++) {
			if ((L[r].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || L[r].RecordType ===
					"com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") && (!L[r].Inline || L[r].Inline.Bool === "false")) {
				continue;
			} else {
				a++;
			}
		}
		return a;
	};
	A.getColumnToolTip = function(d, D) {
		var r;
		if (D.Label) {
			return D.Label.String;
		} else {
			r = d["sap:quickinfo"] || (d["com.sap.vocabularies.Common.v1.QuickInfo"] || "").String || d["sap:label"] || (d[
				"com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			return r;
		}
	};
	A.getColumnHeaderText = function(d, D) {
		var r;
		if (D.Label) {
			return D.Label.String;
		} else {
			r = d["sap:label"] || (d["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			return r;
		}
	};
	A.getSubDetailPageIntent = function(l, s, a, m, h) {
		var n;
		if (a) {
			n = a.split("/")[0];
		}
		if (l && s && s.length > 0) {
			var i;
			if (n) {
				for (i = 0; i < s.length; i++) {
					if (l === s[i].entitySet && n === s[i].navigationProperty && s[i].navigation && s[i].navigation[m]) {
						if (h) {
							if (s[i].component && s[i].component.settings && s[i].component.settings.hideChevronForUnauthorizedExtNav) {
								return s[i].navigation[m].target;
							}
						} else {
							return s[i].navigation[m].target;
						}
					}
				}
			} else {
				for (i = 0; i < s.length; i++) {
					if (l === s[i].entitySet && s[i].navigation && s[i].navigation[m]) {
						if (h) {
							if (s[i].component && s[i].component.settings && s[i].component.settings.hideChevronForUnauthorizedExtNav) {
								return s[i].navigation[m].target;
							}
						} else {
							return s[i].navigation[m].target;
						}
					}
				}
			}
		}
	};
	A.getDataFieldTarget = function(d) {
		var r;
		if (d.Target) {
			return "{ path: '" + d.Target.AnnotationPath + "' }";
		} else {
			return r;
		}
	};
	A.getKeyItem = function(i, e) {
		var m = i.getModel();
		var E = m.getODataEntitySet(e.Target.AnnotationPath || '');
		var o = m.getODataEntityType(E.entityType);
		var k = o.key.propertyRef[0].name;
		return "{" + k + "}";
	};
	A.getDescriptionItem = function(o, e) {
		var m = o.getModel();
		var E = m.getODataEntitySet(e.Target.AnnotationPath || '');
		var a = m.getODataEntityType(E.entityType);
		var k = a.key.propertyRef[0].name;
		for (var i = 0; i < a.property.length; i++) {
			if (a.property[i].name === k) {
				var d = a.property[i]["sap:text"];
				return "{" + d + "}";
			}
		}
	};
	A.getColumnListItemType = function(p, l) {
		var P = false;
		var i = 0;
		if (p) {
			while (!P && i < p.length) {
				P |= A.hasNavigationByName(p[i++], l);
			}
		}
		return P ? "Navigation" : "Inactive";
	};
	A.hasNavigationByName = function(p, l) {
		if (p) {
			for (var i = 0; i < p.length; i++) {
				if (p[i].split("|").slice(-1).pop() === l.name) {
					return true;
				}
			}
		}
		return false;
	};
	A.listAppPages = function(m, r) {
		for (var p in m) {
			if (m.hasOwnProperty(p)) {
				if (p === "pages") {
					r.pages.push(Object.keys(m[p]));
					for (var a in m[p]) {
						if (m[p].hasOwnProperty(a)) {
							r.settings.push(m[p][a].component.settings);
						}
					}
				}
				if (typeof m[p] === "object") {
					A.listAppPages(m[p], r);
				}
			}
		}
		return r;
	};
	A.getDisplayNavigationIntent = function(l, s, a) {
		return A.getSubDetailPageIntent(l, s, a, 'display');
	};
	A.getColumnCellFirstText = function(d, D, e, c) {
		var r;
		r = A.getTextForDataField(d);
		if (!r) {
			r = D.Value.Path;
		}
		if (r) {
			if (c) {
				return true;
			} else {
				if (d.type === "Edm.DateTimeOffset" || d.type === "Edm.DateTime" || d.type === "Edm.Time") {
					var f = A.formatDateTimeForCustomColumn(d.type, r);
					return f;
				} else {
					return "{" + r + "}";
				}
			}
		}
	};
	A.getTextForDataField = function(d) {
		var v = d["com.sap.vocabularies.Common.v1.Text"] && d["com.sap.vocabularies.Common.v1.Text"].Path;
		return v;
	};
	A.formatDateTimeForCustomColumn = function(d, r) {
		if (d === "Edm.DateTimeOffset") {
			return "{ path: '" + r +
				"', type: 'sap.ui.model.odata.type.DateTimeOffset', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
		} else if (d === "Edm.DateTime") {
			return "{ path: '" + r +
				"', type: 'sap.ui.model.odata.type.DateTime', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
		} else {
			return "{ path: '" + r + "', type: 'sap.ui.model.odata.type.Time', formatOptions: { style: 'medium'}}";
		}
	};
	A.getColumnCellFirstTextVisibility = function(d, D, e) {
		var c = true;
		var v = !!A.getColumnCellFirstText(d, D, e, c);
		return v;
	};
	A.getIdForMoreBlockContent = function(f) {
		if (f["com.sap.vocabularies.UI.v1.PartOfPreview"] && f["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "false") {
			return "::MoreContent";
		}
	};
	A.getEntityTypesForFormPersonalization = function(i, f, e) {
		i = i.getInterface(0);
		var E = [];
		var m = i.getModel();
		var o = m.getODataEntitySet(e.name || '');
		var F = [];
		if (f.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet" && f.Facets) {
			F = f.Facets;
		} else if (f.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
			F.push(f);
		}
		F.forEach(function(f) {
			var n;
			if (f.Target && f.Target.AnnotationPath && f.Target.AnnotationPath.indexOf("/") > 0) {
				n = f.Target.AnnotationPath.split("/")[0];
				var a = m.getODataEntityType(o.entityType);
				var b = m.getODataAssociationSetEnd(a, n);
				if (b && b.entitySet) {
					o = m.getODataEntitySet(b.entitySet);
					if (E.indexOf(o.entityType.split(".")[1]) === -1) {
						E.push(o.entityType.split(".")[1]);
					}
				}
			} else {
				if (E.indexOf(e.entityType.split(".")[1]) === -1) {
					E.push(e.entityType.split(".")[1]);
				}
			}
		});
		return E.join(", ");
	};
	A.getDataFieldLabel = function(d, D) {
		var r;
		if (D.Label) {
			return D.Label.String;
		} else {
			r = d["sap:label"] || (d["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			if (r === "") {
				var l = (d.extensions) ? d.extensions.find(function(e) {
					return e.name === "label";
				}) : null;
				if (l !== undefined && l !== null) {
					if (l.length !== undefined && l.length > 0) {
						r = l[0].value;
					} else {
						r = l.value;
					}
				} else {
					r = "";
				}
			}
			return r;
		}
	};
	A.searchForFirstSemKeyTitleDescription = function(e) {
		var t, d, D, T, E, f, l, h, H, s, L, i;
		var a = e.getPath();
		var b = a + '/' + "com.sap.vocabularies.UI.v1.LineItem" + '/';
		if (e) {
			E = e.getObject();
			f = E["com.sap.vocabularies.Common.v1.SemanticKey"] && E["com.sap.vocabularies.Common.v1.SemanticKey"][0] && E[
				"com.sap.vocabularies.Common.v1.SemanticKey"][0].PropertyPath;
			l = E["com.sap.vocabularies.UI.v1.LineItem"];
			h = E["com.sap.vocabularies.UI.v1.HeaderInfo"];
			H = "";
			s = "";
			if (h) {
				H = h && h["Title"] && h["Title"].Value && h["Title"].Value.Path;
				s = h && h["Description"] && h["Description"].Value && h["Description"].Value.Path;
			}
			L = l && l.length;
			for (i = 0; i < L; i++) {
				if (l[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && l[i].Value.Path === f) {
					if (A.isPropertyHidden(l[i])) {
						continue;
					}
					b = b + i + '/Value/Path';
					return b;
				}
				if (l[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && l[i].Value.Path === H) {
					if (A.isPropertyHidden(l[i])) {
						continue;
					}
					t = true;
					T = i;
				}
				if (l[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && l[i].Value.Path === s) {
					if (A.isPropertyHidden(l[i])) {
						continue;
					}
					d = true;
					D = i;
				}
			}
			if (t) {
				b = b + T + '/Value/Path';
				return b;
			} else if (d) {
				b = b + D + '/Value/Path';
				return b;
			}
		} else {
			jQuery.sap.log.warning("No entity type provided");
		}
	};
	A.isPropertyHidden = function(l) {
		var h = false;
		if (l["com.sap.vocabularies.UI.v1.Hidden"] || (l["com.sap.vocabularies.Common.v1.FieldControl"] && l[
					"com.sap.vocabularies.Common.v1.FieldControl"].EnumMember && l["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember ===
				"com.sap.vocabularies.Common.v1.FieldControlType/Hidden")) {
			h = true;
		}
		return h;
	};
	A.isCurrentEntity = function(e, s) {
		return e.name === s;
	};
	A.isCurrentFacet = function(f, F) {
		var i = A.getStableIdPartFromFacet(f);
		if (i === F) {
			return true;
		} else {
			return false;
		}
	};
	A.extensionPointBeforeFacetExists = function(e, f, m) {
		if (m) {
			var E = g(e, f);
			return m[E];
		}
		return false;
	};
	A.extensionPointAfterFacetExists = function(e, f, m) {
		var E = false;
		if (m) {
			var s = "AfterFacet|" + e + "|" + A.getStableIdPartFromFacet(f);
			Object.keys(m).forEach(function(k) {
				if (k.startsWith(s)) {
					E = true;
					return;
				}
			});
		}
		return E;
	};
	A.extensionPointAfterFacetCheckExistence = function(e, f, m, a) {
		if (m[a]) {
			var b = a.split('|');
			b.pop();
			var E = b.pop();
			return A.getStableIdPartFromFacet(f) === E;
		}
		return false;
	};

	function g(e, f) {
		var E = "BeforeFacet|" + e + "|" + A.getStableIdPartFromFacet(f);
		return E;
	}
	A.getStableIdPartFromBeforeFacet = function(e, f, m) {
		var E = g(e, f);
		var o = m[E];
		if (o && o["sap.fin.travel.lib.reuse"] && o["sap.fin.travel.lib.reuse"].sectionId) {
			return o["sap.fin.travel.lib.reuse"].sectionId;
		}
		return A.getStableIdPartFromFacet(f);
	};
	A.shouldDisplayBeforeFacetSection = function(e, f, m) {
		var E = g(e, f);
		var o = m[E];
		if (o && o["sap.fin.travel.lib.reuse"] && o["sap.fin.travel.lib.reuse"].hiddenProperty) {
			return A.shouldDisplaySection(o["sap.fin.travel.lib.reuse"].hiddenProperty);
		}
		return true;
	};
	A.shouldDisplayAfterFacetSection = function(e, f, m, a) {
		var E = m[a];
		if (E && E["sap.fin.travel.lib.reuse"] && E["sap.fin.travel.lib.reuse"].hiddenProperty) {
			return A.shouldDisplaySection(E["sap.fin.travel.lib.reuse"].hiddenProperty);
		}
		return true;
	};
	A.getExtensionPointBeforeFacetTitle = function(e, f, m) {
		var E = g(e, f);
		var o = m[E];
		if (o && o["sap.fin.travel.lib.reuse"] && o["sap.fin.travel.lib.reuse"].title) {
			return o["sap.fin.travel.lib.reuse"].title;
		}
	};
	A.getExtensionPointAfterFacetTitle = function(e, f, m, a) {
		var E = m[a];
		if (E && E["sap.fin.travel.lib.reuse"] && E["sap.fin.travel.lib.reuse"].title) {
			return E["sap.fin.travel.lib.reuse"].title;
		}
	};
	A.getNavigationPropertyByName = function(s, n) {
		if (s && s.navigationProperty) {
			for (var i = 0; i < s.navigationProperty.length; i++) {
				if (s.navigationProperty[i].name === n) {
					return s.navigationProperty[i];
				}
			}
		}
		return undefined;
	};
	A.isSourceEntityNavigationCreatable = function(i, s) {
		var m = i.getModel();
		var S = m.getODataEntityType(s.entityType);
		var o = S["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var a = S["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;
		if (o && o.Insertable && !a) {
			if (A.isSourceEntityNavigationEntitySet(m, o.Insertable.Path)) {
				return true;
			}
		}
		return false;
	};
	A.getSourceEntityNavigationCreatableVisibility = function(i, a, s, p) {
		var m = i.getInterface(0).getModel();
		var S = m.getODataEntityType(s.entityType);
		var c, C;
		if (a) {
			var n = a.split("/")[0];
			var N = A.getNavigationPropertyByName(p, n);
			if (N && N.hasOwnProperty("sap:creatable-path")) {
				if (N["sap:creatable-path"] == "false") {
					return false;
				} else if (!(N["sap:creatable-path"] == "true")) {
					c = N["sap:creatable-path"] == "true" ? undefined : N["sap:creatable-path"];
					if (c && c.charAt(0) === '!') {
						c = c.slice(1);
						C = "!${" + c + "}";
					} else {
						C = "${" + c + "}";;
					}
				}
			}
		}
		var o = S["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var b = S["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;
		if (o && o.Insertable && !b) {
			if (A.isSourceEntityNavigationEntitySet(m, o.Insertable.Path)) {
				return c ? "{= !${DisplayMode} ? " + C + " : false }" : "{= !${DisplayMode} }";
			}
		}
		return false;
	};
	A.isSourceEntitySearchNavigationCreatable = function(i, s) {
		var m = i.getModel();
		var S = m.getODataEntityType(s.entityType);
		var o = S["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var a = S["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;
		if (o && o.Insertable && a && a.Searchable) {
			if (A.isSourceEntityNavigationEntitySet(m, o.Insertable.Path)) {
				return true;
			}
		}
		return false;
	};
	A.getSourceEntitySearchNavigationCreatableVisibility = function(i, a, s, p) {
		var m = i.getInterface(0).getModel();
		var S = m.getODataEntityType(s.entityType);
		var c, C;
		if (a) {
			var n = a.split("/")[0];
			var N = A.getNavigationPropertyByName(p, n);
			if (N && N.hasOwnProperty("sap:creatable-path")) {
				if (N["sap:creatable-path"] == "false") {
					return false;
				} else if (!(N["sap:creatable-path"] == "true")) {
					c = N["sap:creatable-path"] == "true" ? undefined : N["sap:creatable-path"];
					if (c && c.charAt(0) === '!') {
						c = c.slice(1);
						C = "!${" + c + "}";
					} else {
						C = "${" + c + "}";;
					}
				}
			}
		}
		var o = S["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var b = S["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;
		if (o && o.Insertable && b && b.Searchable) {
			if (A.isSourceEntityNavigationEntitySet(m, o.Insertable.Path)) {
				return c ? "{= !${DisplayMode} ? " + C + " : false }" : "{= !${DisplayMode} }";
			}
		}
		return false;
	};
	A.isSourceEntityNavigationEntitySet = function(m, p) {
		var e = m.getODataEntitySet(p);
		return (e && e.entityType);
	};
	A.getSourceEntityCreatableVisibility = function(i, a, s, p) {
		var r = "{= !${DisplayMode} }";
		var m = i.getInterface(0).getModel();
		var S = m.getODataEntityType(s.entityType);
		var c, C;
		if (a) {
			var n = a.split("/")[0];
			var N = A.getNavigationPropertyByName(p, n);
			if (N && N.hasOwnProperty("sap:creatable-path")) {
				if (N["sap:creatable-path"] == "false") {
					return false;
				} else {
					c = N["sap:creatable-path"] == "true" ? undefined : N["sap:creatable-path"];
					if (c && c.charAt(0) === '!') {
						c = c.slice(1);
						C = "!${" + c + "}";
					} else {
						C = "${" + c + "}";;
					}
				}
			}
		}
		var o = S["Org.OData.Capabilities.V1.InsertRestrictions"] || [];
		if (o && o.Insertable) {
			if (A.isSourceEntityPropertyBoolean(m, s.entityType, o.Insertable.Path)) {
				return c ? "{= !${DisplayMode} ? (" + C + " ? ${" + o.Insertable.Path + "} : false) : false }" : "{= !${DisplayMode} ? " + o.Insertable
					.Path + " : false }";
			} else {
				return false;
			}
		}
		return c ? "{= !${DisplayMode} ? " + C + " : false }" : "{= !${DisplayMode} }";
	};
	A.isSourceEntityPropertyBoolean = function(m, e, p) {
		var P = p;
		var o = m.getODataEntityType(e);
		if (P.indexOf("/") > -1) {
			var a = P.split("/");
			for (var j = 0; j < a.length - 1; j++) {
				var b = m.getODataAssociationEnd(o, a[j]);
				o = m.getODataEntityType(b.type);
			}
			P = a[a.length - 1];
		}
		var O = m.getODataProperty(o, P);
		return (O && O.type === "Edm.Boolean");
	};
	A.getTargetEntitySettings = function(i, s) {
		var S = [];
		var m = i.getModel();
		var o = m.getODataEntityType(s.entityType);
		var a = o["Org.OData.Capabilities.V1.InsertRestrictions"] || [];
		if (a && a.Insertable) {
			if (A.isSourceEntityNavigationEntitySet(m, a.Insertable.Path)) {
				S.push(a.Insertable.Path);
				var r = m.getODataEntitySet(a.Insertable.Path);
				var R = m.getODataEntityType(r.entityType);
				var b = R ? R["com.sap.vocabularies.UI.v1.HeaderInfo"] : undefined;
				S.push(b ? b.Title.Value.Path : "");
			}
		}
		return JSON.stringify(S);
	};
	A.getTargetEntityProperties = function(o, s) {
		var p = [];
		var m = o.getModel();
		var S = m.getODataEntityType(s.entityType);
		var a = S["Org.OData.Capabilities.V1.InsertRestrictions"] || [];
		if (a && a.NonInsertableNavigationProperties) {
			for (var i = 0; i < a.NonInsertableNavigationProperties.length; i++) {
				p.push(a.NonInsertableNavigationProperties[i].NavigationPropertyPath);
			}
		}
		return JSON.stringify(p);
	};
	A.matchesBreadCrumb = function(o, c, p) {
		if (p) {
			var s = p.split("/");
			var e, E, a;
			if (s.length > 0) {
				var m = o.getInterface(0).getModel();
				var b = s[0];
				for (var i = 0; i < s.length; i++) {
					if (i > 0) {
						e = m.getODataEntitySet(b);
						E = m.getODataEntityType(e.entityType);
						a = m.getODataAssociationSetEnd(E, s[i]);
						b = a.entitySet;
					}
					if ((i + 1) === s.length) {
						if (b === c.name) {
							return true;
						} else {
							return false;
						}
					}
				}
			}
		}
	};
	A.buildBreadCrumbExpression = function(c, t, T) {
		var b, s = sap.ui.model.odata.AnnotationHelper.format(c, t);
		if (t && t.Path && T && T.String) {
			var a = T.String.replace(/'/g, "\\'");
			b = "{= $" + s + " ? $" + s + " : '" + a + "' }";
			return b;
		} else {
			if (!s) {
				return T && T.String || "[[no title]]";
			}
			return s;
		}
	};
	A.resolveI18n = function(t) {
		if (U.isEmptyObjectOrString(t)) {
			return t;
		}
		var k = t.replace(/[{}\\]/g, "").split(">");
		if (k.length > 0 && k[0] === "i18n") {
			return I.get().resolveText(k[1]);
		}
		return I.get().resolveText(t);
	};
	A.isEntityDeletable = function(i, e) {
		var r = "{= ${view>/level} === 1 ? true : !${DisplayMode}}";
		var m = i.getModel();
		var d = e["Org.OData.Capabilities.V1.DeleteRestrictions"] || [];
		if (d && d.Deletable) {
			var o = m.getODataProperty(e, d.Deletable.Path);
			if (o && o.type === "Edm.Boolean") {
				r = "{= ${view>/level} === 1 ? ${" + d.Deletable.Path + "} : (!${DisplayMode} ? ${" + d.Deletable.Path + "} : false) }";
			} else {
				r = "false";
			}
		}
		return r;
	};
	A.actionControlInline = function(a) {
		var p;
		if (a) {
			if (typeof a === "boolean") {
				return "{= !${DisplayMode} ? " + a + " : false }";
			} else {
				if (a && a.charAt(0) === '!') {
					a = a.slice(1);
					p = "!${" + a + "}";
				} else {
					p = "${" + a + "}";
				}
				return "{= !${DisplayMode} ? " + p + " : false }";
			}
		}
		return "{= !${DisplayMode} }";
	};
	A.actionControlNotInline = function(a) {
		var p;
		if (a) {
			if (typeof a === "boolean") {
				return "{= !${DisplayMode} ? " + a + " : false }";
			} else {
				if (a && a.charAt(0) === '!') {
					a = a.slice(1);
					p = "!${" + a + "}";
				} else {
					p = "${" + a + "}";
				}
				return "{= " + p + " }";
			}
		}
		return "{= !${DisplayMode} }";
	};
	A.actionHeaderControl = function(a) {
		var p;
		if (a) {
			if (typeof a === "boolean") {
				return "{= " + a + " }";
			} else {
				if (a && a.charAt(0) === '!') {
					a = a.slice(1);
					p = "!${" + a + "}";
				} else {
					p = "${" + a + "}";
				}
				return "{= " + p + " }";
			}
		}
		return true;
	};
	A.actionEnabled = function(a, t) {
		if (!a) {
			return true;
		} else {
			return "{path: '" + t.AnnotationPath.split("/")[0] + "/" + a + "'}";
		}
	};
	A.toolbarButtonEnabled = function(a, s) {
		if (s) {
			return false;
		} else if (!a) {
			return true;
		} else {
			return "{path: '" + a + "'}";
		}
	};
	A.actionLabel = function(l, t) {
		if (l.String) {
			return l.String;
		} else {
			return "{path: '" + t.AnnotationPath.split("/")[0] + "/" + l.Path + "'}";
		}
	};
	A.actionLabelForText = function(l, t, u) {
		if (u) {
			return "";
		} else if (l.String) {
			return l.String;
		} else {
			return "{path: '" + t.AnnotationPath.split("/")[0] + "/" + l.Path + "'}";
		}
	};
	A.actionIcon = function(i, t) {
		if (i && i.Path) {
			return i.Path;
		} else if (!U.isEmptyObjectOrString(t)) {
			return "{path: '" + t.AnnotationPath.split("/")[0] + "/" + i.Path + "'}";
		}
	};
	A.resolveIdentification = function(i, t) {
		var p = i.getPath();
		var m = i.getModel();
		var P = p.split('/');
		P.pop();
		var s = P.join('/');
		return m.createBindingContext(s);
	};
	A.getVisibilityByPropertyPath = function(p, b) {
		if (typeof p === "boolean") {
			return p;
		}
		var s = b ? b : "true";
		if (p) {
			if (p.startsWith('/')) {
				return "{= !${DisplayMode} ? (!!${_global>" + p + "} ? " + s + " : false) : false }";
			} else {
				return "{= !${DisplayMode} ? (${" + p + "} ? " + s + " : false) : false }";
			}
		}
		return "{= !${DisplayMode} ? " + s + " : false }";
	};
	A.getStableIdPartFromFacet = function(f) {
		if (f.RecordType && (f.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet" || f.RecordType ===
				"com.sap.vocabularies.UI.v1.ReferenceFacet")) {
			if (f.ID && f.ID.String) {
				return f.ID.String;
			} else {
				jQuery.sap.log.error("Annotation Helper: Unable to get stable ID. Please check the facet annotations.");
				return Math.floor((Math.random() * 99999) + 1).toString();
			}
		} else {
			jQuery.sap.log.error("Annotation Helper: Unable to get stable ID. Please check the facet annotations.");
			return Math.floor((Math.random() * 99999) + 1).toString();
		}
	};
	A.containsFormWithBreakoutAction = function(f, i) {
		var c = A.getStableIdPartFromFacet(f);
		if (c === i) {
			if (f.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet" && f.Target && f.Target.AnnotationPath && f.Target.AnnotationPath.indexOf(
					"com.sap.vocabularies.UI.v1.FieldGroup") != -1) {
				return true;
			}
		}
		return false;
	};
	A.getEntityCreatable = function(i) {
		return i === undefined || i.Insertable === undefined || i.Insertable.Bool;
	};
	A.getDataFieldForActionId = function(a, c, v) {
		if (v) {
			return "Variant::" + v.key + "ToolBarButton::" + a.name + "::" + a.entitySet + "::" + (c ? c.EnumMember.split('/').pop() : 'Default') +
				"::" + (a["sap:action-for"] ? 'DataFieldForActionButton' : 'DataFieldActionButton');
		} else {
			return "ToolBarButton::" + a.name + "::" + a.entitySet + "::" + (c ? c.EnumMember.split('/').pop() : 'Default') + "::" + (a[
				"sap:action-for"] ? 'DataFieldForActionButton' : 'DataFieldActionButton');
		}
	};
	A.getOverrideButtonVisibility = function(i, o) {
		if (o) {
			for (var b in o) {
				if (o.hasOwnProperty(b)) {
					if (o[b].id === i) {
						return o[b].visible;
					}
				}
			}
		}
		return true;
	};
	A.getVariantKey = function(v) {
		if (v) {
			return v.key;
		}
		return "NoVariant";
	};
	A.getPresentationVariantVisualisation = function(e, v, f) {
		if (v) {
			var V = e[v];
			if (V) {
				if (V.Visualizations) {
					return V.Visualizations[0].AnnotationPath.split('#')[1];
				}
			}
		}
		return f.split('#')[1];
	};
	A.getSegmentedId = function(s) {
		return "detailPage::multipleViews::" + s.referenceFacetId;
	};
	A.getIconTabBarSelectedKey = function(s) {
		if (s && s.quickVariantSelection && s.quickVariantSelection.selectField) {
			var S = s.quickVariantSelection.selectField;
			var f = [];
			for (var i in s.quickVariantSelection.variants) {
				var v = s.quickVariantSelection.variants[i];
				f.push("${" + S + "} === '" + v.selectValue + "' ? '" + v.key + "' : ");
			}
			var F = "{= " + f.join("") + " '' }";
			return F;
		}
	};
	A.hasQuickSelectionVariant = function(f, s) {
		if (s) {
			var a = (f.ID && f.ID.String) ? f.ID.String : undefined;
			for (var i = 0; i < s.length; i++) {
				if (a && s[i].referenceFacetId && s[i].referenceFacetId === a) {
					return true;
				}
			}
		}
		return false;
	};
	A.isCurrentSection = function(f, s) {
		if (s) {
			var a = (f.ID && f.ID.String) ? f.ID.String : undefined;
			if (a && s.referenceFacetId) {
				return s.referenceFacetId === a;
			}
		}
		return false;
	};
	A.hasLineItemQualifier = function(f, v) {
		return v || f.split('#')[1];
	};
	A.getEnabledIconTab = function(p) {
		if (p != undefined) {
			var P;
			if (typeof oEnabledPath === "boolean") {
				return "{= !${DisplayMode} ? " + p + " : false }";
			} else {
				if (p && p.charAt(0) === '!') {
					p = p.slice(1);
					P = "!${" + p + "}";
				} else {
					P = "${" + p + "}";
				}
				return "{= !${DisplayMode} ? " + P + " : false }";
			}
		} else {
			return "{= !${DisplayMode} }";
		}
	};
	A.getEnabledMode = function(e, d) {
		var D;
		var s = d.Value.Path;
		e.property.forEach(function(p) {
			if (p.name == s) {
				D = p["com.sap.vocabularies.Common.v1.FieldControl"].Path;
			}
		});
		return "{= !${DisplayMode} ? ${" + D + "} > 1 : false }";
	};
	A.getNoDataText = function(e) {
		if (e && e["sap:searchable"]) {} else {
			return A.resolveI18n("NO_ITEMS_FOUND");
		}
	};
	A.resolveBoolean = function(p) {
		var v = false;
		if (typeof p === "boolean") {
			v = p;
		} else if (typeof p === "string") {
			if (p === "X" || p === "") {
				v = p === "X";
			} else if (p.toLowerCase() === "true" || p.toLowerCase() === "false") {
				v = p.toLowerCase() === "true";
			} else {
				v = "{= ${" + p + "} }";
			}
		}
		return v;
	};
	A.isSelectionFieldCandidate = function(c, d) {
		if (c && c.length > 0) {
			for (var i = 0; i < c.length; i++) {
				if (c[i] && c[i].PropertyPath === d.PropertyPath) {
					return true;
				}
			}
		}
		return false;
	};
	A.getColumnListItemStableId = function(e, d) {
		return e.name + "::ColumnListItem::" + d.Value.Path;
	};
	A.isContactJobTitleAvailable = function(i, e) {
		var E;
		var m = i && i.getModel && i.getModel();
		if (!m) {
			i = i.getInterface(0);
			m = i.getModel();
		}
		var a = e.entityType.split('.');
		a.pop();
		a.push("Contact");
		var s = a.join('.');
		E = m.getODataEntityType(s);
		if (E) {
			var t = jQuery.grep(E.property, function(f) {
				return f.name === "Title";
			});
			return t.length == 1;
		}
		return false;
	};
	A.isContactJobTitleAvailable.requiresIContext = true;
	A.matchesBreadCrumb.requiresIContext = true;
	A.buildBreadCrumbExpression.requiresIContext = true;
	A.getEntityTypesForFormPersonalization.requiresIContext = true;
	A.formatWithExpand.requiresIContext = true;
	A.formatWithExpandSimpleWithDefault.requiresIContext = true;
	A.getNavigationPathWithExpand.requiresIContext = true;
	A.formatWithExpandSimple.requiresIContext = true;
	A.getSourceEntitySearchNavigationCreatableVisibility.requiresIContext = true;
	A.getSourceEntityNavigationCreatableVisibility.requiresIContext = true;
	A.isSourceEntitySearchNavigationCreatable.requiresIContext = true;
	A.isSourceEntityNavigationCreatable.requiresIContext = true;
	A.getSourceEntityCreatableVisibility.requiresIContext = true;
	A.getTargetEntitySettings.requiresIContext = true;
	A.getTargetEntityProperties.requiresIContext = true;
	A.createP13NColumnForAction.requiresIContext = true;
	A.createP13N.requiresIContext = true;
	A.isEntityDeletable.requiresIContext = true;
	A.getKeyItem.requiresIContext = true;
	A.getDescriptionItem.requiresIContext = true;
	A.resolveIdentification.requiresIContext = true;
	return A;
}, true);
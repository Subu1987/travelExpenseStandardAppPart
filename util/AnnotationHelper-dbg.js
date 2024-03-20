/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/base/Object",
	"sap/fin/travel/lib/reuse/util/i18n",
	"sap/fin/travel/lib/reuse/util/Utils"
], function (BaseObject, I18n, Utils) {
	"use strict";

	var AnnotationHelper = BaseObject.extend("AnnotationHelper");

	AnnotationHelper.debugArgs = function () {
		var d = 1;
		var error = new Error();
		var firefoxMatch = (error.stack.split('\n')[0 + d].match(/^.*(?=@)/) || [])[0];
		var chromeMatch = ((((error.stack.split('at ') || [])[1 + d] || '').match(/(^|\.| <| )(.*[^(<])( \()/) || [])[2] || '').split('.').pop();
		var safariMatch = error.stack.split('\n')[0 + d];

		// firefoxMatch ? console.log('firefoxMatch', firefoxMatch) : void 0;
		// chromeMatch ? console.log('chromeMatch', chromeMatch) : void 0;
		// safariMatch ? console.log('safariMatch', safariMatch) : void 0;

		var sLocation = firefoxMatch || chromeMatch || safariMatch;
		var sCurrentLevel = jQuery.sap.log.getLevel();
		jQuery.sap.log.setLevel(jQuery.sap.log.Level.INFO);
		jQuery.sap.log.info("From function=" + sLocation + ", arguments=");
		//console.log(arguments);
		jQuery.sap.log.setLevel(sCurrentLevel);
	};

	AnnotationHelper.test = function (RecordType, Value, target) {
		AnnotationHelper.debugArgs(arguments);
		// console.error(RecordType, Value, target);
		return true;
	};

	AnnotationHelper.resolvePriority = function (Importance) {
		return Importance ? Importance.split('/')[Importance.split('/').length - 1] : "Medium";
	};

	AnnotationHelper.resolveCriticalityRepresentation = function (oDataField) {
		return (oDataField.CriticalityRepresentation && oDataField.CriticalityRepresentation.EnumMember ===
			"com.sap.vocabularies.UI.v1.CriticalityRepresentationType/WithoutIcon") ? "WithoutIcon" : "WithIcon";
	};

	AnnotationHelper.resolveMetaModelPath = function (oContext) {
		var sPath = oContext.getObject();
		var oModel = oContext.getModel();
		var oMetaModel = oModel.getProperty("/metaModel");
		return oMetaModel.createBindingContext(sPath);
	};

	AnnotationHelper.getEntityTitle = function (oModel, oEntityType) {
		var oMetaModel = oModel.getMetaModel();
		return oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value;
	};

	AnnotationHelper.getEntityContext = function (oContext) {
		var oParameter = oContext.getObject(),
			oModel = oContext.getModel(),
			oMetaModel = oModel.getProperty("/metaModel"),
			oEntitySet = oMetaModel.getODataEntitySet(oParameter.entitySet),
			oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType),
			sAnnotationPath = "",
			oWorkingContext = {};
		/* Fall back to defaults without qualifier */
		if (!oWorkingContext.lineItem) {
			sAnnotationPath = oEntityType.$path + "/com.sap.vocabularies.UI.v1.LineItem";
			oWorkingContext.lineItem = oMetaModel.getObject(sAnnotationPath);
			oWorkingContext.lineItemPath = sAnnotationPath;
			oWorkingContext.lineItemQualifier = "";
		}
		if (!oWorkingContext.selectionItem) {
			oWorkingContext.selectionItem = [];
			oWorkingContext.selectionItemPath = oEntityType.$path + "/com.sap.vocabularies.UI.v1.SelectionFields";
			var oSelectionFields = oMetaModel.getObject(oWorkingContext.selectionItemPath);
			var aSelectionField = [];
			oSelectionFields.forEach(function (oSelectionField) {
				var aFields = jQuery.grep(oEntityType.property, function (oField) {
					return oField.name === oSelectionField.PropertyPath && (oField.type === "Edm.DateTime" || oField.type === "Edm.Date");
				});
				if (aFields.length == 1) {
					oWorkingContext.selectionItem.push(oSelectionField);
				}
			});
		}

		oModel.setProperty("/workingContext", oWorkingContext);
		return "/workingContext";
	};

	AnnotationHelper.getSubEntityContext = function (oContext) {
		var oParameter = oContext.getObject(),
			oModel = oContext.getModel(),
			oMetaModel = oModel.getProperty("/metaModel"),
			oEntitySet = oMetaModel.getODataEntitySet(oParameter.entitySet),
			oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType),
			sAnnotationPath = "",
			oWorkingContext = {};
		/* Fall back to defaults without qualifier */
		if (!oWorkingContext.lineItem) {
			sAnnotationPath = oEntityType.$path + "/com.sap.vocabularies.UI.v1.LineItem";
			oWorkingContext.lineItem = oMetaModel.getObject(sAnnotationPath);
			oWorkingContext.lineItemPath = sAnnotationPath;
			oWorkingContext.lineItemQualifier = "";
		}

		oModel.setProperty("/detailContext", oWorkingContext);
		return "/detailContext";
	};

	AnnotationHelper.updateEntityContext = function (oContext, oEntity, oVariant) {
		var oMetaModel = oContext.metaModel,
			sAnnotationPath = "";
		/* Fall back to defaults without qualifier */
		if (oVariant) {
			var oPresentationVariant = oEntity[oVariant.annotationPath];
			if (oPresentationVariant) {
				oContext.detailContext.lineItemQualifier = oEntity.$path + "/" + oPresentationVariant.Visualizations[0].AnnotationPath.replace(/@/g,
					'');
			}
		} else {
			oContext.detailContext.lineItemQualifier = "";
		}
		return true;
	};

	AnnotationHelper.getObjectPageSectionAnchorButtonIconPath = function (oCriticalityPath) {
		if (!Utils.isEmptyObjectOrString(oCriticalityPath) && !Utils.isEmptyObjectOrString(oCriticalityPath.Path)) {
			//Criticality domain is 0 for None, 1 for Error, 2 for Warning, 3 for Success
			return "{= ${" + oCriticalityPath.Path + "} === 1 ? 'sap-icon://message-error' : (${" + oCriticalityPath.Path +
				"} === 2 ? 'sap-icon://message-warning' : '') }";
		}
		return "";
	};

	AnnotationHelper.getObjectPageSectionAnchorButtonTypePath = function (oCriticalityPath) {
		if (!Utils.isEmptyObjectOrString(oCriticalityPath) && !Utils.isEmptyObjectOrString(oCriticalityPath.Path)) {
			//Criticality domain is 0 for None, 1 for Error, 2 for Warning, 3 for Success
			return "{= ${" + oCriticalityPath.Path + "} === 1 ? 'error' : (${" + oCriticalityPath.Path + "} === 2 ? 'warning' : '') }";
		}
		return "";
	};

	AnnotationHelper.shouldDisplaySection = function (sHiddenPath) {
		if (sHiddenPath) {
			return "{= !$" + AnnotationHelper.getBindingForPath(sHiddenPath) + "}";
		}
		return true;
	};

	AnnotationHelper.sectionVisible = function (bHidden, bDisplayMode, aEntityset) {
		return !bHidden && (!bDisplayMode || (aEntityset && aEntityset.length > 0));
	};

	AnnotationHelper.getBindingForAnnotationPath = function (sAnnotationPath) {
		return sAnnotationPath.substring(0, sAnnotationPath.indexOf("/"));
	};

	AnnotationHelper.getBindingForPath = function (sPath) {
		return "{" + sPath + "}";
	};

	AnnotationHelper.isDeepFacetHierarch = function (oFacet) {
		if (oFacet.Facets) {
			for (var i = 0; i < oFacet.Facets.length; i++) {
				if (oFacet.Facets[i].RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
					return true;
				}
			}
		}
		return false;
	};

	AnnotationHelper.doesFieldGroupContainOnlyOneMultiLineDataField = function (oFieldGroup, oFirstDataFieldProperties) {
		if (oFieldGroup.Data.length !== 1) {
			return false;
		}
		if ((oFirstDataFieldProperties['com.sap.vocabularies.UI.v1.MultiLineText'] === undefined) || (oFieldGroup.Data[0].RecordType !==
				"com.sap.vocabularies.UI.v1.DataField")) {
			return false;
		}
		return true;
	};

	AnnotationHelper.replaceSpecialCharsInId = function (sId) {
		if (sId.indexOf(" ") >= 0) {
			jQuery.sap.log.error(
				"Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there.");
		}
		return sId.replace(/@/g, "").replace(/\//g, "::").replace(/#/g, "::");
	};

	AnnotationHelper.getStableIdPartFromDataPoint = function (oDataPoint) {
		var sPathConcat = "";
		if (oDataPoint.Value && oDataPoint.Value.Path) {
			return AnnotationHelper.replaceSpecialCharsInId(oDataPoint.Value.Path);
		} else if (oDataPoint.Value && oDataPoint.Value.Apply && oDataPoint.Value.Apply.Name === "odata.concat") {
			for (var i = 0; i < oDataPoint.Value.Apply.Parameters.length; i++) {
				if (oDataPoint.Value.Apply.Parameters[i].Type === "Path") {
					if (sPathConcat) {
						sPathConcat = sPathConcat + "::";
					}
					sPathConcat = sPathConcat + AnnotationHelper.replaceSpecialCharsInId(oDataPoint.Value.Apply.Parameters[
						i].Value);
				}
			}
			return sPathConcat;
		} else {
			// In case of a string or unknown property
			jQuery.sap.log.error("Annotation Helper: Unable to create stable ID derived from annotations.");
		}
	};

	AnnotationHelper.formatDateTimeOffset = function (oDataField) {
		return "{path: '" + oDataField.Value.Path +
			"', type: 'sap.ui.model.odata.type.DateTime', formatOptions: { 'UTC': true, style: 'medium' } }";
	};

	AnnotationHelper.formatWithExpand = function (oInterface, oDataField, oEntitySet) {
		var oModel = oInterface.getInterface(0).getModel();
		var oEntityType = oModel.getODataEntityType(oEntitySet.entityType);
		var oProperty = oModel.getODataEntityType(oEntitySet.entityType).property.find(function (elem) {
			return elem.name === oDataField.Path;
		});
		var isEDMDateTime = oProperty.type === "Edm.DateTimeOffset";

		if (isEDMDateTime) {
			return "{path:'" + oDataField.Path + "',type:'sap.ui.model.odata.type.DateTime',formatOptions:{UTC:true}}";
		}

		AnnotationHelper.getNavigationPathWithExpand(oInterface, oDataField, oEntitySet);
		oInterface = oInterface.getInterface(0);
		AnnotationHelper.formatWithExpandSimple(oInterface, oDataField, oEntitySet);
		return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField);
	};

	AnnotationHelper.formatWithExpandSimple = function (oInterface, oDataField, oEntitySet) {
		var aExpand = [],
			sExpand, oEntityType;
		var oMetaModel = oInterface && oInterface.getModel && oInterface.getModel();
		if (!oMetaModel) {
			// called with entity set therefore use the correct interface
			oInterface = oInterface.getInterface(0);
			oMetaModel = oInterface.getModel();
		}

		if (oEntitySet) {
			oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
		} else {
			// TODO: check with UI2 if helper to get entity type can be used, avoid using this path
			var aMatches = /^(\/dataServices\/schema\/\d+\/entityType\/\d+)(?:\/|$)/.exec(oInterface.getPath());
			if (aMatches && aMatches.length && aMatches[0]) {
				var oEntityTypeContext = oMetaModel.getProperty(aMatches[0]);
				var sNamespace = oMetaModel.getODataEntityContainer().namespace;
				oEntityType = oMetaModel.getODataEntityType(sNamespace + '.' + oEntityTypeContext.name);
			}
		}

		if (oEntityType) {
			// check if expand is needed
			if (oDataField && oDataField.Path) {
				sExpand = AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oDataField.Path);
				if (sExpand) {
					aExpand.push(sExpand);
				}

			} else if (oDataField && oDataField.Apply && oDataField.Apply.Name === "odata.concat") {
				oDataField.Apply.Parameters.forEach(function (oParameter) {
					if (oParameter.Type === "Path") {
						sExpand = AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oParameter.Value);
						if (sExpand) {
							if (aExpand.indexOf(sExpand) === -1) {
								aExpand.push(sExpand);
							}
						}
					}
				});
			}

			if (aExpand.length > 0) {
				// we analyze a facet that is part of the root context
				// set expand to expand data bag
				var oPreprocessorsData = oInterface.getSetting("preprocessorsData");
				if (oPreprocessorsData) {
					var aRootContextExpand = oPreprocessorsData.rootContextExpand || [];
					for (var j = 0; j < aExpand.length; j++) {
						if (aRootContextExpand.indexOf(aExpand[j]) === -1) {
							aRootContextExpand.push(aExpand[j]);
						}
					}
					oPreprocessorsData.rootContextExpand = aRootContextExpand;
				}

			}
		}

		return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField);
	};

	AnnotationHelper.formatWithExpandSimpleWithDefault = function (oInterface, oDataField, oEntityType) {
		var aExpand = [],
			sExpand;
		var oMetaModel = oInterface && oInterface.getModel && oInterface.getModel();
		if (!oMetaModel) {
			// called with entity set therefore use the correct interface
			oInterface = oInterface.getInterface(0);
			oMetaModel = oInterface.getModel();
		}

		if (oEntityType) {
			// check if expand is needed
			if (oDataField && oDataField.Path) {
				sExpand = AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oDataField.Path);
				if (sExpand) {
					aExpand.push(sExpand);
				}

			} else if (oDataField && oDataField.Apply && oDataField.Apply.Name === "odata.concat") {
				oDataField.Apply.Parameters.forEach(function (oParameter) {
					if (oParameter.Type === "Path") {
						sExpand = AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oParameter.Value);
						if (sExpand) {
							if (aExpand.indexOf(sExpand) === -1) {
								aExpand.push(sExpand);
							}
						}
					}
				});
			}

			if (aExpand.length > 0) {
				// we analyze a facet that is part of the root context
				// set expand to expand data bag
				var oPreprocessorsData = oInterface.getSetting("preprocessorsData");
				if (oPreprocessorsData) {
					var aRootContextExpand = oPreprocessorsData.rootContextExpand || [];
					for (var j = 0; j < aExpand.length; j++) {
						if (aRootContextExpand.indexOf(aExpand[j]) === -1) {
							aRootContextExpand.push(aExpand[j]);
						}
					}
					oPreprocessorsData.rootContextExpand = aRootContextExpand;
				}

			}
		}

		return "{= $" + sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField) + " === '' ? '" + AnnotationHelper.getDefaultEntityTitle(
			oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"] ? oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName.String :
			oEntityType.name) + "' : $" + sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField) + "}";
	};

	AnnotationHelper.getDefaultEntityTitle = function (sEntity) {
		return AnnotationHelper.resolveI18n("NEW") + " " + sEntity;
	};

	AnnotationHelper.getNavigationPathWithExpand = function (oInterface, oContext, oEntitySetContext) {
		oInterface = oInterface.getInterface(0);
		var aExpand = [];
		var oMetaModel = oInterface.getModel();
		var oEntitySet = oMetaModel.getODataEntitySet(oEntitySetContext.name || '');
		var sResolvedPath = sap.ui.model.odata.AnnotationHelper.resolvePath(oMetaModel.getContext(oInterface.getPath()));

		var sNavigationPath = sap.ui.model.odata.AnnotationHelper.getNavigationPath(oInterface, oContext);
		var sNavigationProperty = sNavigationPath.replace("{", "").replace("}", "");
		var oEntityType;
		if (sNavigationProperty) {
			// from now on we need to set the entity set to the target
			oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			var oAssociationEnd = oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigationProperty);
			if (oAssociationEnd && oAssociationEnd.entitySet) {
				oEntitySet = oMetaModel.getODataEntitySet(oAssociationEnd.entitySet);
			}
		} else {
			oEntityType = oMetaModel.getODataEntityType(oEntitySetContext.entityType);
		}

		aExpand = AnnotationHelper.getFacetExpand(sResolvedPath, oMetaModel, oEntityType, oEntitySet);

		if (aExpand.length > 0) {
			if (sNavigationProperty === "") {
				// we analyze a facet that is part of the root context
				// set expand to expand data bag
				var oPreprocessorsData = oInterface.getSetting("preprocessorsData");
				if (oPreprocessorsData) {
					var aRootContextExpand = oPreprocessorsData.rootContextExpand || [];
					for (var j = 0; j < aExpand.length; j++) {
						if (aRootContextExpand.indexOf(aExpand[j]) === -1) {
							aRootContextExpand.push(aExpand[j]);
						}
					}
					oPreprocessorsData.rootContextExpand = aRootContextExpand;
				}
			} else {
				// add expand to navigation path
				sNavigationPath = "{ path : '" + sNavigationProperty + "', parameters : { expand : '" + aExpand.join(',') + "'} }";
			}
		}
		//needed in Non Draft Case: binding="{}" NOT WORKING - the fields are NOT visible and editable after clicking + in List Report
		//XMLTemplateProcessor also supports empty string
		if (sNavigationPath === "{}") {
			sNavigationPath = "";
		}
		return sNavigationPath;
	};

	AnnotationHelper.getFacetExpand = function (sResolvedPath, oMetaModel, oEntityType, oEntitySet) {
		var aDependents = [],
			aExpand = [],
			oFacetContent, aFacetContent = [];

		if (sResolvedPath) {
			aFacetContent = oMetaModel.getObject(sResolvedPath) || [];
		}

		aFacetContent = aFacetContent.Data || aFacetContent;

		var fnGetDependents = function (sProperty, bIsValue) {
			var sExpand = AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sProperty);
			if (sExpand) {
				// check if already in expand array - if not yet add it
				if (aExpand.indexOf(sExpand) === -1) {
					aExpand.push(sExpand);
				}
			}
			if (bIsValue) {
				try {
					aDependents = sap.ui.comp.smartfield.SmartField.getSupportedAnnotationPaths(oMetaModel, oEntitySet, sProperty, true) || [];
				} catch (e) {
					aDependents = [];
				}
				for (var i = 0; i < aDependents.length; i++) {
					if (aExpand.indexOf(aDependents[i]) === -1) {
						aExpand.push(aDependents[i]);
					}
				}
			}
		};

		var fnAnalyzeApplyFunctions = function (oParameter) {
			if (oParameter.Type === "LabeledElement") {
				fnGetDependents(oParameter.Value.Path);
			} else if (oParameter.Type === "Path") {
				fnGetDependents(oParameter.Value);
			}
		};

		for (var i = 0; i < aFacetContent.length; i++) {
			oFacetContent = aFacetContent[i];

			if (oFacetContent.Value && oFacetContent.Value.Path) {
				fnGetDependents(oFacetContent.Value.Path, true);
			}

			if (oFacetContent.Value && oFacetContent.Value.Apply && oFacetContent.Value.Apply.Name === "odata.concat") {
				oFacetContent.Value.Apply.Parameters.forEach(fnAnalyzeApplyFunctions);
			}

			if (oFacetContent.Action && oFacetContent.Action.Path) {
				fnGetDependents(oFacetContent.Action.Path);
			}

			if (oFacetContent.Target) {
				if (oFacetContent.Target.Path) {
					fnGetDependents(oFacetContent.Target.Path);
				}
				if (oFacetContent.Target.AnnotationPath) {
					fnGetDependents(oFacetContent.Target.AnnotationPath);
				}
			}

			if (oFacetContent.SemanticObject && oFacetContent.SemanticObject.Path) {
				fnGetDependents(oFacetContent.SemanticObject.Path);
			}

			if (oFacetContent.Url && oFacetContent.Url.Path) {
				fnGetDependents(oFacetContent.Url.Path);
			}

			if (oFacetContent.Url && oFacetContent.Url.Apply && oFacetContent.Url.Apply.Parameters) {
				oFacetContent.Url.Apply.Parameters.forEach(fnAnalyzeApplyFunctions);
			}

			if (oFacetContent.UrlContentType && oFacetContent.UrlContentType.Path) {
				fnGetDependents(oFacetContent.UrlContentType.Path);
			}

		}

		if (aFacetContent.name) {
			fnGetDependents(aFacetContent.name, true);
		}

		return aExpand;
	};

	AnnotationHelper._getNavigationPrefix = function (oMetaModel, oEntityType, sProperty) {
		var sExpand = "";
		var aParts = sProperty.split("/");

		if (aParts.length > 1) {
			for (var i = 0; i < (aParts.length - 1); i++) {
				var oAssociationEnd = oMetaModel.getODataAssociationEnd(oEntityType, aParts[i]);
				if (oAssociationEnd) {
					oEntityType = oMetaModel.getODataEntityType(oAssociationEnd.type);
					if (sExpand) {
						sExpand = sExpand + "/";
					}
					sExpand = sExpand + aParts[i];
				} else {
					return sExpand;
				}
			}
		}

		return sExpand;
	};

	AnnotationHelper.getStableIdPartFromDataField = function (oDataField) {
		var sPathConcat = "",
			sIdPart = "";
		if (oDataField.RecordType && oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
			return AnnotationHelper.replaceSpecialCharsInId(oDataField.Action.String);
		} else if (oDataField.RecordType && (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" ||
				oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation")) {
			if (oDataField.SemanticObject.String) {
				sIdPart = AnnotationHelper.replaceSpecialCharsInId(oDataField.SemanticObject.String);
			} else if (oDataField.SemanticObject.Path) {
				sIdPart = AnnotationHelper.replaceSpecialCharsInId(oDataField.SemanticObject.Path);
			}
			if (oDataField.Action && oDataField.Action.String) {
				sIdPart = sIdPart + "::" + AnnotationHelper.replaceSpecialCharsInId(oDataField.Action.String);
			} else if (oDataField.Action && oDataField.Action.Path) {
				sIdPart = sIdPart + "::" + AnnotationHelper.replaceSpecialCharsInId(oDataField.Action.Path);
			}
			return sIdPart;
		} else if (oDataField.RecordType && oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
			return AnnotationHelper.replaceSpecialCharsInId(oDataField.Target.AnnotationPath);
		} else if (oDataField.Value && oDataField.Value.Path) {
			return AnnotationHelper.replaceSpecialCharsInId(oDataField.Value.Path);
		} else if (oDataField.Value && oDataField.Value.Apply && oDataField.Value.Apply.Name === "odata.concat") {
			for (var i = 0; i < oDataField.Value.Apply.Parameters.length; i++) {
				if (oDataField.Value.Apply.Parameters[i].Type === "Path") {
					if (sPathConcat) {
						sPathConcat = sPathConcat + "::";
					}
					sPathConcat = sPathConcat + AnnotationHelper.replaceSpecialCharsInId(oDataField.Value.Apply.Parameters[
						i].Value);
				}
			}
			return sPathConcat;
		} else {
			// In case of a string or unknown property
			jQuery.sap.log.error("Annotation Helper: Unable to create a stable ID. Please check the annotations.");
		}
	};

	AnnotationHelper.replaceSpecialCharsInId = function (sId) {
		if (sId.indexOf(" ") >= 0) {
			jQuery.sap.log.error(
				"Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there.");
		}
		return sId.replace(/@/g, "").replace(/\//g, "::").replace(/#/g, "::");
	};

	AnnotationHelper.checkMoreBlockContent = function (oFacetContext) {
		return AnnotationHelper.checkFacetContent(oFacetContext, false);
	};

	AnnotationHelper.checkBlockContent = function (oFacetContext) {
		return AnnotationHelper.checkFacetContent(oFacetContext, true);
	};

	AnnotationHelper.checkFacetContent = function (oFacetContext, bBlock) {
		var sPath;
		var oInterface = oFacetContext.getInterface(0);
		var aFacets = oFacetContext.getModel().getProperty("", oFacetContext);

		//for Reference Facets directly under UI-Facets we need to check facets one level higher - by removing the last part of the path
		var aForPathOfFacetOneLevelHigher = oFacetContext.getPath().split("/Facets");
		var sContextOfFacetOneLevelHigher = oInterface.getModel().getContext(aForPathOfFacetOneLevelHigher[0]);
		if (oInterface.getModel().getProperty('', sContextOfFacetOneLevelHigher).RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
			return sContextOfFacetOneLevelHigher.getPath();
		} else {
			if (!aFacets) {
				return undefined;
			}

			for (var iFacet = 0; iFacet < aFacets.length; iFacet++) {
				if (!bBlock) {
					if (aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"] && aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool ===
						"false") {
						sPath = oInterface.getPath() + "/" + iFacet;
						break;
					}
				} else {
					if (aFacets[iFacet].RecordType !== "com.sap.vocabularies.UI.v1.ReferenceFacet" || (!aFacets[iFacet][
							"com.sap.vocabularies.UI.v1.PartOfPreview"
						] || aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "true")) {
						sPath = oInterface.getPath() + "/" + iFacet;
						break;
					}
				}
			}
		}

		return sPath;
	};

	AnnotationHelper.isDeepFacetHierarchy = function (oFacet) {
		if (oFacet.Facets) {
			for (var i = 0; i < oFacet.Facets.length; i++) {
				if (oFacet.Facets[i].RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
					return true;
				}
			}
		}
		return false;
	};

	AnnotationHelper.doesCollectionFacetOnlyContainForms = function (oFacet) {
		var bReturn = true;
		if (oFacet.Facets) {
			for (var i = 0; i < oFacet.Facets.length; i++) {
				if (oFacet.Facets[i].Target && oFacet.Facets[i].Target.AnnotationPath) {
					if ((oFacet.Facets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.FieldGroup") < 0) && (oFacet.Facets[i].Target.AnnotationPath
							.indexOf("com.sap.vocabularies.UI.v1.Identification") < 0) && (oFacet.Facets[i].Target.AnnotationPath.indexOf(
							"com.sap.vocabularies.UI.v1.DataPoint") < 0)) {
						bReturn = false;
					}
				}
			}
		} else {
			bReturn = false;
		}
		return bReturn;
	};

	AnnotationHelper.showFullScreenButton = function (oRouteConfig, oFacet) {
		if (oRouteConfig && oFacet) {
			var sFacetId = AnnotationHelper.getStableIdPartFromFacet(oFacet);
			if (oRouteConfig.component && oRouteConfig.component.settings && oRouteConfig.component.settings.sections && oRouteConfig.component.settings
				.sections[sFacetId] && oRouteConfig.component.settings.sections[sFacetId].tableMode === "FullScreenTable") {
				return true;
			}
		}
		return false;
	};

	AnnotationHelper.getSortOrder = function (Par) {
		var str = '';
		for (var i = 0; i < Par.length; i++) {
			if (!str) {
				str = Par[i].Property.PropertyPath;
			} else {
				str = str + ', ' + Par[i].Property.PropertyPath;
			}
			if (Par[i].Descending) {
				str = str + ' ' + Par[i].Descending.Bool;
			}
		}
		return str;
	};

	AnnotationHelper.getSelectionModeResponsiveTable = function (aEntities, oEntitySet, oEnabledPath) {
		//Check for selection mode of the table
		var oEnabledResolvedPath;
		if (AnnotationHelper.hasActions(aEntities)) {
			if (oEnabledPath != undefined) {
				if (typeof oEnabledPath === "boolean") {
					return oEnabledPath ? "SingleSelectLeft" : 'None';
				} else {
					if (oEnabledPath && oEnabledPath.charAt(0) === '!') {
						oEnabledPath = oEnabledPath.slice(1);
						oEnabledResolvedPath = "!${" + oEnabledPath + "}";
					} else {
						oEnabledResolvedPath = "${" + oEnabledPath + "}";;
					}
					return "{= " + oEnabledResolvedPath + " ? 'SingleSelectLeft' : 'None' }";
				}
			} else {
				return "SingleSelectLeft";
			}
		}
		var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
		if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !==
				"false") || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions) {
			if (oEnabledPath != undefined) {
				if (typeof oEnabledPath === "boolean") {
					return oEnabledPath ? "{= !${DisplayMode} ? 'SingleSelectLeft' : 'None' }" : "None";
				} else {
					if (oEnabledPath && oEnabledPath.charAt(0) === '!') {
						oEnabledPath = oEnabledPath.slice(1);
						oEnabledResolvedPath = "!${" + oEnabledPath + "}";
					} else {
						oEnabledResolvedPath = "${" + oEnabledPath + "}";;
					}
					return "{= !${DisplayMode} ? ( " + oEnabledResolvedPath + " ? 'SingleSelectLeft' : 'None' ) : 'None' }";
				}
			} else {
				return "{= !${DisplayMode} ? 'SingleSelectLeft' : 'None' }";
			}
		}

		return "None";
	};

	AnnotationHelper.editable = function (Par) {
		//Check for selection mode of the table
		if (Par && Par.Bool === "true") {
			return "{= !${DisplayMode} }";
		}
		return false;
	};
	// AnnotationHelper.editable = function (Par, oEditablePath) {
	// 	var sEditableResolvedPath;
	// 	if (oEditablePath) {
	// 		if (oEditablePath && oEditablePath.charAt(0) === '!') {
	// 			oEditablePath = oEditablePath.slice(1);
	// 			sEditableResolvedPath = "!${" + oEditablePath + "}";
	// 		} else {
	// 			sEditableResolvedPath = "${" + oEditablePath + "}";;
	// 		}
	// 	}
	// 	//Check for selection mode of the table
	// 	if (Par && Par.Bool === "true") {
	// 		return oEditablePath ? "{= !${DisplayMode} ? " + sEditableResolvedPath + " : false }" : "{= !${DisplayMode} }";
	// 	}
	// 	return false;
	// };

	AnnotationHelper.hasActions = function (Par) {
		//Adding Inline check as selection mode should be enabled if DataFieldForAction and DataFieldForIntentBasedNavigation are not inline(in line item) - BCP 1770035232, 1770097243
		for (var i = 0; i < Par.length; i++) {
			if ((!Par[i].Inline || Par[i].Inline.Bool !== "true") && (Par[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
					Par[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation")) {
				return true;
			}
		}
		return false;
	};

	AnnotationHelper.createP13NColumnForAction = function (iContext, oDataField) {
		//used by DataFieldForAction, DataFieldWithIntentBasedNavigation, DataFieldForIntentBasedNavigation
		var iColumnIndex = AnnotationHelper._determineColumnIndex(iContext);
		var sColumnKey = AnnotationHelper.createP13NColumnKey(oDataField);
		var sP13N;
		if (oDataField && oDataField.Value && oDataField.Value.Path) {
			sP13N = '\\{"columnKey":"' + sColumnKey + '", "sortProperty":"' + oDataField.Value.Path + '", "filterProperty":"' + oDataField.Value
				.Path + '", "columnIndex":"' + iColumnIndex + '", "actionButton":"true" \\}';
		} else {
			sP13N = '\\{"columnKey":"' + sColumnKey + '", "columnIndex":"' + iColumnIndex + '", "actionButton":"true" \\}';
		}
		return sP13N;
	};

	AnnotationHelper.getStableIdPartForDatafieldActionButton = function (oDatafield, oFacet, oTabItem, oChartItem) {
		var sStableId = "";
		var sDatafieldStableId = "";
		var sFacetStableId = "";
		if (oFacet) {
			sFacetStableId = AnnotationHelper.getStableIdPartFromFacet(oFacet);
		}
		if (oDatafield) {
			sDatafieldStableId = AnnotationHelper.getStableIdPartFromDataField(oDatafield);
		}
		sStableId = (sFacetStableId !== "" ? sFacetStableId + "::" : "") + "action::" + sDatafieldStableId;
		var sSuffix = AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
		if (sSuffix) {
			sStableId = sStableId.concat(sSuffix);
		}
		if (oChartItem) {
			sStableId = sStableId + "::chart";
		}
		return sStableId;
	};
	AnnotationHelper.getIconTabFilterKey = function (oTabItem) {
		if (oTabItem) {
			if (oTabItem.key) {
				return oTabItem.key;
			} else {
				return AnnotationHelper.replaceSpecialCharsInId(oTabItem.annotationPath);
			}
		}
	};
	AnnotationHelper.getSuffixFromIconTabFilterKey = function (oTabItem) {
		var sKey = AnnotationHelper.getIconTabFilterKey(oTabItem);
		if (sKey) {
			return "-".concat(sKey);
		} else {
			return "";
		}
	};

	AnnotationHelper.createP13N = function (oInterface, oContextSet, oContextProp, oDataField, oWorkingContext) { 
		var sP13N = "",
			aAdditionalProperties = [],
			sNavigation = "";

		if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataField" || oDataField.RecordType ===
			"com.sap.vocabularies.UI.v1.DataFieldForAnnotation" ||
			oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {

			if (oDataField.Value.Path) {
				var sColumnKey = AnnotationHelper.createP13NColumnKey(oDataField, oContextProp);
				sP13N = '\\{"columnKey":"' + sColumnKey + '", "leadingProperty":"' + oDataField.Value.Path;
				// get Navigation Prefix
				var oMetaModel = oInterface.getInterface(0).getModel();
				if (oMetaModel) {
					var oEntityType = oMetaModel.getODataEntityType(oContextSet.entityType);
					if (oEntityType) {
						sNavigation = AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oDataField.Value.Path);
						if (sNavigation) {
							sNavigation = sNavigation + "/";
						}
					}
				}
			} else if (oDataField.Value.Apply && oDataField.Value.Apply.Name === "odata.concat") {
				oDataField.Value.Apply.Parameters.forEach(function (oParameter) {
					if (oParameter.Type === "Path") {
						if (!sP13N) {
							sP13N = '\\{"columnKey":"' + oParameter.Value + '", "leadingProperty":"' + oParameter.Value;
						} else {
							aAdditionalProperties.push(oParameter.Value);
						}
					}
				});
			}
			//$select for ListPage - additional properties are required
			if (oWorkingContext) {
				aAdditionalProperties.push("Pernr");
				aAdditionalProperties.push("Deletable");
				aAdditionalProperties.push("DraftLinkVisible");
				aAdditionalProperties.push("DraftLinkType");
				aAdditionalProperties.push("DraftUserId");
				aAdditionalProperties.push("Persistencestatus");
				aAdditionalProperties.push("TripChange");
				aAdditionalProperties.push("Datecha");
				aAdditionalProperties.push("Timecha");
			}
			//$select for Advances - AdvCurrFc and PayCurrFc are needed
			if (oContextSet.name === "Advances") {
				aAdditionalProperties.push("Pernr");
				aAdditionalProperties.push("Tripno");
				aAdditionalProperties.push("AdvCurrFc");
				aAdditionalProperties.push("PayCurrFc");
				aAdditionalProperties.push("Deletable");
			}

			//Criticality for sub-sections - Specific for Travel Request Apps
			if (oContextSet.name === "Advances" || oContextSet.name === "CostAssignments" || oContextSet.name === "EstimatedCostCats" ||
				oContextSet.name === "Destinations" || oContextSet.name === "TravelServices") {
				aAdditionalProperties.push("Criticality");
			}
			// $Select field ReturnPossible for button Add Return - For Visibility
			if (oContextSet.name === "TravelServices") {
				aAdditionalProperties.push("ReturnPossible");

				//Workaround - Keys are missing !
				aAdditionalProperties.push("Tripno");
				aAdditionalProperties.push("Pernr");
				aAdditionalProperties.push("Request");
			}

			if ((oContextProp.type === "Edm.DateTime") && (oContextProp["sap:display-format"] === "Date")) {
				sP13N += '", "type":"date';
			}
			if ((oContextProp.type === "Edm.DateTimeOffset")) {
				sP13N += '", "type":"datetime';
			}
			if (oDataField.Criticality && oDataField.Criticality.Path) {
				aAdditionalProperties.push(oDataField.Criticality.Path);
			}
			if (oContextProp["com.sap.vocabularies.Common.v1.Text"] && oContextProp["com.sap.vocabularies.Common.v1.Text"].Path) {
				aAdditionalProperties.push(sNavigation + oContextProp["com.sap.vocabularies.Common.v1.Text"].Path);
			}
			if (oContextProp["Org.OData.Measures.V1.ISOCurrency"] && oContextProp["Org.OData.Measures.V1.ISOCurrency"].Path) {
				aAdditionalProperties.push(sNavigation + oContextProp["Org.OData.Measures.V1.ISOCurrency"].Path);
			}
			if (oContextProp["Org.OData.Measures.V1.Unit"] && oContextProp["Org.OData.Measures.V1.Unit"].Path) {
				aAdditionalProperties.push(sNavigation + oContextProp["Org.OData.Measures.V1.Unit"].Path);
			}
			if (oContextProp["com.sap.vocabularies.Common.v1.FieldControl"] && oContextProp["com.sap.vocabularies.Common.v1.FieldControl"].Path) {
				aAdditionalProperties.push(sNavigation + oContextProp["com.sap.vocabularies.Common.v1.FieldControl"].Path);
			}

			if ((oDataField["RecordType"] === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") && oDataField.Url && oDataField.Url.Apply &&
				oDataField.Url.Apply.Parameters) {
				oDataField.Url.Apply.Parameters.forEach(function (oParameter) {
					if (oParameter.Type === "LabeledElement") {
						aAdditionalProperties.push(oParameter.Value.Path);
					}
				});
			}
			if ((oDataField["RecordType"] === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") && oDataField.Url && oDataField.Url.Path) {
				aAdditionalProperties.push(oDataField.Url.Path);
			}
			if (aAdditionalProperties.length > 0) {
				var sAdditionalProperties = "";
				aAdditionalProperties.forEach(function (oProperty) {
					if (sAdditionalProperties) {
						sAdditionalProperties = sAdditionalProperties + ",";
					}
					sAdditionalProperties = sAdditionalProperties + oProperty;
				});
				sP13N += '", "additionalProperty":"' + sAdditionalProperties;
			}
			var bNotSortable = false;
			if (oContextSet["Org.OData.Capabilities.V1.SortRestrictions"] && oContextSet["Org.OData.Capabilities.V1.SortRestrictions"].NonSortableProperties) {
				var aNonSortableProperties = oContextSet["Org.OData.Capabilities.V1.SortRestrictions"].NonSortableProperties;
				for (var i = aNonSortableProperties.length - 1; i >= 0; i--) {
					if (aNonSortableProperties[i].PropertyPath === oDataField.Value.Path) {
						bNotSortable = true;
						break;
					}
				}
			}
			if (!bNotSortable) {
				if (sNavigation) {
					sP13N += '", "sortProperty":"' + sNavigation + oContextProp.name;
				} else {
					sP13N += '", "sortProperty":"' + oContextProp.name;
				}
			}
			var bNotFilterable = false;
			if (oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"]) {
				if (oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"].Filterable !== 'false') {
					if (oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"].NonFilterableProperties) {
						var aNonFilterableProperties = oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"].NonFilterableProperties;
						for (var j = aNonFilterableProperties.length - 1; j >= 0; j--) {
							if (aNonFilterableProperties[j].PropertyPath === oDataField.Value.Path) {
								bNotFilterable = true;
								break;
							}
						}
					}
				} else {
					bNotFilterable = true;
				}
			}
			if (!bNotFilterable) {
				sP13N += '", "filterProperty":"' + oContextProp.name;
			}
			var oContext = oInterface.getInterface(2);
			var iColumnIndex = AnnotationHelper._determineColumnIndex(oContext);
			if (iColumnIndex >= 0) {
				sP13N += '", "columnIndex":"' + iColumnIndex;
			}
		}
		return sP13N + '" \\}';
	};

	AnnotationHelper.createP13NColumnKey = function (oDataField, oContextProp) {
		var sColumnKey = "";
		var sFioriTemplatePrefix = "template";
		var sSeperator = "::";
		if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataField") {
			sColumnKey = oDataField.Value.Path;
		} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation") {
			sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldWithIntentBasedNavigation" + sSeperator + oDataField.SemanticObject.String +
				sSeperator + oDataField.Action.String + sSeperator + oDataField.Value.Path;
		} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath") {
			sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldWithNavigationPath" + sSeperator + oDataField.Target.String;
		} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
			sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForIntentBasedNavigation" + sSeperator + oDataField.SemanticObject.String +
				sSeperator + oDataField.Action.String;
		} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
			sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForAction" + sSeperator + oDataField.Action.String;
		} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
			if (oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.Communication.v1.Contact') >= 0 ||
				oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.UI.v1.DataPoint') >= 0 ||
				oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.UI.v1.Chart') >= 0) {
				sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForAnnotation" + sSeperator + oDataField.Target.AnnotationPath;
				sColumnKey = sColumnKey.replace('@', '');
			}
		}
		return sColumnKey;
	};

	AnnotationHelper._determineColumnIndex = function (oContext) {
		var sColumn = oContext.getPath();
		var iColumnIndex = Number(sColumn.slice(sColumn.lastIndexOf("/") + 1));
		var sLineItem = sColumn.slice(0, sColumn.lastIndexOf("/"));
		var oLineItem = oContext.getModel().getObject(sLineItem);
		var index = 0;
		for (var iRecord = 0; iRecord < iColumnIndex; iRecord++) {
			if ((oLineItem[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
					oLineItem[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") &&
				(!oLineItem[iRecord].Inline || oLineItem[iRecord].Inline.Bool === "false")) {
				continue;
			} else {
				index++;
			}
		}
		return index;
	};

	AnnotationHelper.getColumnToolTip = function (oDataFieldValue, oDataField) {
		var sResult;
		if (oDataField.Label) {
			return oDataField.Label.String;
		} else {
			sResult = oDataFieldValue["sap:quickinfo"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.QuickInfo"] || "").String ||
				oDataFieldValue["sap:label"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			return sResult;
		}
	};

	AnnotationHelper.getColumnHeaderText = function (oDataFieldValue, oDataField) {
		var sResult;
		if (oDataField.Label) {
			return oDataField.Label.String;
		} else {
			sResult = oDataFieldValue["sap:label"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			return sResult;
		}
	};

	AnnotationHelper.getSubDetailPageIntent = function (sListEntitySet, aSubPages, sAnnotationPath, sMode, hideChevronForUnauthorizedExtNav) {
		// if variable hideChevronForUnauthorizedExtNav is true, then sub object outbound target is returned only if hideChevronForUnauthorizedExtNav (manifest flag) is set to true for the corresponding table.
		var sNavigationProperty;
		if (sAnnotationPath) {
			//AnnotationPath is only filled on Object Page which contains facets->annotationPath
			sNavigationProperty = sAnnotationPath.split("/")[0];
		}
		if (sListEntitySet && aSubPages && aSubPages.length > 0) {
			var i;
			if (sNavigationProperty) {
				for (i = 0; i < aSubPages.length; i++) {
					if (sListEntitySet === aSubPages[i].entitySet && sNavigationProperty === aSubPages[i].navigationProperty && aSubPages[i].navigation &&
						aSubPages[i].navigation[sMode]) {
						if (hideChevronForUnauthorizedExtNav) {
							if (aSubPages[i].component && aSubPages[i].component.settings && aSubPages[i].component.settings.hideChevronForUnauthorizedExtNav) {
								return aSubPages[i].navigation[sMode].target;
							}
						} else {
							return aSubPages[i].navigation[sMode].target;
						}
					}
				}
			} else {
				for (i = 0; i < aSubPages.length; i++) {
					if (sListEntitySet === aSubPages[i].entitySet && aSubPages[i].navigation && aSubPages[i].navigation[sMode]) {
						if (hideChevronForUnauthorizedExtNav) {
							if (aSubPages[i].component && aSubPages[i].component.settings && aSubPages[i].component.settings.hideChevronForUnauthorizedExtNav) {
								return aSubPages[i].navigation[sMode].target;
							}
						} else {
							return aSubPages[i].navigation[sMode].target;
						}
					}
				}
			}
		}
	};

	AnnotationHelper.getDataFieldTarget = function (oDataField) {
		var sResult;
		if (oDataField.Target) {
			return "{ path: '" + oDataField.Target.AnnotationPath + "' }";
		} else {
			return sResult;
		}
	};

	AnnotationHelper.getKeyItem = function (oInterface, sEntitySet) {
		var oMetaModel = oInterface.getModel();
		var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet.Target.AnnotationPath || '');
		var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
		var key = oEntityType.key.propertyRef[0].name;
		return "{" + key + "}";
	};
	AnnotationHelper.getDescriptionItem = function (oInterface, sEntitySet) {
		var oMetaModel = oInterface.getModel();
		var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet.Target.AnnotationPath || '');
		var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
		var key = oEntityType.key.propertyRef[0].name;
		for (var i = 0; i < oEntityType.property.length; i++) {
			if (oEntityType.property[i].name === key) {
				var description = oEntityType.property[i]["sap:text"];
				return "{" + description + "}";
			}
		}
	};

	AnnotationHelper.getColumnListItemType = function (aPages, sListEntitySet) {
		var bPageFound = false;
		var i = 0;
		if (aPages) {
			while (!bPageFound && i < aPages.length) {
				bPageFound |= AnnotationHelper.hasNavigationByName(aPages[i++], sListEntitySet);
			}
		}
		return bPageFound ? "Navigation" : "Inactive";
	};

	// AnnotationHelper.getColumnListItemType = function (aPages, sListEntitySet, oEditablePath) {
	// 	var oEditableResolvedPath;
	// 	var bPageFound = false;
	// 	var i = 0;
	// 	if (aPages) {
	// 		while (!bPageFound && i < aPages.length) {
	// 			bPageFound |= AnnotationHelper.hasNavigationByName(aPages[i++], sListEntitySet);
	// 		}
	// 	}
	// 	if (oEditablePath != undefined) {
	// 		if (typeof oEditablePath === "boolean") {
	// 			return oEditablePath && bPageFound ? "Navigation" : "Inactive";
	// 		} else {
	// 			if (oEditablePath && oEditablePath.charAt(0) === '!') {
	// 				oEditablePath = oEditablePath.slice(1);
	// 				oEditableResolvedPath = "!${" + oEditablePath + "}";
	// 			} else {
	// 				oEditableResolvedPath = "${" + oEditablePath + "}";;
	// 			}
	// 			return bPageFound ? "{= " + oEditableResolvedPath + " ? 'Navigation' : 'Inactive' }" : "Inactive";
	// 		}
	// 	} else {
	// 		return bPageFound ? "Navigation" : "Inactive";
	// 	}
	// };

	AnnotationHelper.hasNavigationByName = function (aPages, sListEntitySet) {
		if (aPages) {
			for (var i = 0; i < aPages.length; i++) {
				if (aPages[i].split("|").slice(-1).pop() === sListEntitySet.name) {
					return true;
				}
			}
		}
		return false;
	};

	AnnotationHelper.listAppPages = function (oManifestExtract, result) {
		for (var property in oManifestExtract) {
			if (oManifestExtract.hasOwnProperty(property)) {
				if (property === "pages") {
					result.pages.push(Object.keys(oManifestExtract[property]));
					for (var pageProperty in oManifestExtract[property]) {
						if (oManifestExtract[property].hasOwnProperty(pageProperty)) {
							result.settings.push(oManifestExtract[property][pageProperty].component.settings);
						}
					}
				}
				if (typeof oManifestExtract[property] === "object") {
					AnnotationHelper.listAppPages(oManifestExtract[property], result);
				}
			}
		}
		return result;
	};

	AnnotationHelper.getDisplayNavigationIntent = function (sListEntitySet, aSubPages, sAnnotationPath) {
		return AnnotationHelper.getSubDetailPageIntent(sListEntitySet, aSubPages, sAnnotationPath, 'display');
	};

	AnnotationHelper.getColumnCellFirstText = function (oDataFieldValue, oDataField, oEntityType, bCheckVisibility) {
		var sResult;
		sResult = AnnotationHelper.getTextForDataField(oDataFieldValue);
		if (!sResult) {
			sResult = oDataField.Value.Path;
		}
		if (sResult) {
			if (bCheckVisibility) {
				return true;
			} else {
				if (oDataFieldValue.type === "Edm.DateTimeOffset" || oDataFieldValue.type === "Edm.DateTime" || oDataFieldValue.type === "Edm.Time") {
					var sFormattedDateTime = AnnotationHelper.formatDateTimeForCustomColumn(oDataFieldValue.type,
						sResult);
					return sFormattedDateTime;
				} else {
					return "{" + sResult + "}";
				}
			}
		}
	};

	AnnotationHelper.getTextForDataField = function (oDataFieldValue) {
		var sValue = oDataFieldValue["com.sap.vocabularies.Common.v1.Text"] && oDataFieldValue["com.sap.vocabularies.Common.v1.Text"].Path;
		return sValue;
	};

	AnnotationHelper.formatDateTimeForCustomColumn = function (oDataFieldValueType, sResult) {
		if (oDataFieldValueType === "Edm.DateTimeOffset") {
			return "{ path: '" + sResult +
				"', type: 'sap.ui.model.odata.type.DateTimeOffset', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
		} else if (oDataFieldValueType === "Edm.DateTime") {
			return "{ path: '" + sResult +
				"', type: 'sap.ui.model.odata.type.DateTime', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
		} else {
			return "{ path: '" + sResult + "', type: 'sap.ui.model.odata.type.Time', formatOptions: { style: 'medium'}}";
		}
	};

	AnnotationHelper.getColumnCellFirstTextVisibility = function (oDataFieldValue, oDataField, oEntityType) {
		var bCheckVisibility = true;
		var bVisible = !!AnnotationHelper.getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType,
			bCheckVisibility);
		return bVisible;
	};

	AnnotationHelper.getIdForMoreBlockContent = function (oFacet) {
		if (oFacet["com.sap.vocabularies.UI.v1.PartOfPreview"] && oFacet["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "false") {
			return "::MoreContent";
		}
	};

	AnnotationHelper.getEntityTypesForFormPersonalization = function (oInterface, oFacet, oEntitySetContext) {
		oInterface = oInterface.getInterface(0);
		var aEntityTypes = [];
		var oMetaModel = oInterface.getModel();
		var oEntitySet = oMetaModel.getODataEntitySet(oEntitySetContext.name || '');
		var aFacets = [];
		if (oFacet.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet" && oFacet.Facets) {
			aFacets = oFacet.Facets;
		} else if (oFacet.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
			aFacets.push(oFacet);
		}
		aFacets.forEach(function (oFacet) {
			var sNavigationProperty;
			if (oFacet.Target && oFacet.Target.AnnotationPath && oFacet.Target.AnnotationPath.indexOf("/") > 0) {
				sNavigationProperty = oFacet.Target.AnnotationPath.split("/")[0];
				var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				var oAssociationEnd = oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigationProperty);
				if (oAssociationEnd && oAssociationEnd.entitySet) {
					oEntitySet = oMetaModel.getODataEntitySet(oAssociationEnd.entitySet);
					if (aEntityTypes.indexOf(oEntitySet.entityType.split(".")[1]) === -1) {
						aEntityTypes.push(oEntitySet.entityType.split(".")[1]);
					}
				}
			} else {
				if (aEntityTypes.indexOf(oEntitySetContext.entityType.split(".")[1]) === -1) {
					aEntityTypes.push(oEntitySetContext.entityType.split(".")[1]);
				}
			}
		});
		return aEntityTypes.join(", ");
	};

	AnnotationHelper.getDataFieldLabel = function (oDataFieldValue, oDataField) {
		var sResult;
		if (oDataField.Label) {
			return oDataField.Label.String;
		} else {
			sResult = oDataFieldValue["sap:label"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			if (sResult === "") {
				var labelFromExtension = (oDataFieldValue.extensions) ? oDataFieldValue.extensions.find(function (extension) {
					return extension.name === "label";
				}) : null;
				if (labelFromExtension !== undefined && labelFromExtension !== null) {
					if (labelFromExtension.length !== undefined && labelFromExtension.length > 0) {
						sResult = labelFromExtension[0].value;
					} else {
						sResult = labelFromExtension.value;
					}
				} else {
					sResult = "";
				}
			}
			return sResult;
		}
	};

	AnnotationHelper.searchForFirstSemKeyTitleDescription = function (oEntityType) {
		var bTitle, bDescr, iDescIndex, iTitleIndex, oEntityTypeAnnotations, sFirstSemKeyPropPath, aLineItemAnnotations,
			oHeaderInfoAnnotations, sHeaderTitle, sHeaderDescription, iLineItemsNumber, i;
		var sEntityTypePath = oEntityType.getPath();
		var sTargetString = sEntityTypePath + '/' + "com.sap.vocabularies.UI.v1.LineItem" + '/';
		if (oEntityType) {
			oEntityTypeAnnotations = oEntityType.getObject();
			// we consider the first field of the semantic key only, the same way SmartTable does
			sFirstSemKeyPropPath = oEntityTypeAnnotations["com.sap.vocabularies.Common.v1.SemanticKey"] && oEntityTypeAnnotations[
				"com.sap.vocabularies.Common.v1.SemanticKey"][0] && oEntityTypeAnnotations["com.sap.vocabularies.Common.v1.SemanticKey"][0].PropertyPath;
			aLineItemAnnotations = oEntityTypeAnnotations["com.sap.vocabularies.UI.v1.LineItem"];
			oHeaderInfoAnnotations = oEntityTypeAnnotations["com.sap.vocabularies.UI.v1.HeaderInfo"];
			sHeaderTitle = "";
			sHeaderDescription = "";
			if (oHeaderInfoAnnotations) {
				sHeaderTitle = oHeaderInfoAnnotations && oHeaderInfoAnnotations["Title"] && oHeaderInfoAnnotations["Title"].Value &&
					oHeaderInfoAnnotations["Title"].Value.Path;
				sHeaderDescription = oHeaderInfoAnnotations && oHeaderInfoAnnotations["Description"] && oHeaderInfoAnnotations["Description"].Value &&
					oHeaderInfoAnnotations["Description"].Value.Path;
			}
			iLineItemsNumber = aLineItemAnnotations && aLineItemAnnotations.length;
			for (i = 0; i < iLineItemsNumber; i++) {
				if (aLineItemAnnotations[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aLineItemAnnotations[i].Value.Path ===
					sFirstSemKeyPropPath) {
					if (AnnotationHelper.isPropertyHidden(aLineItemAnnotations[i])) {
						continue;
					}
					sTargetString = sTargetString + i + '/Value/Path';
					return sTargetString;
				}
				if (aLineItemAnnotations[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aLineItemAnnotations[i].Value.Path ===
					sHeaderTitle) {
					if (AnnotationHelper.isPropertyHidden(aLineItemAnnotations[i])) {
						continue;
					}
					bTitle = true;
					iTitleIndex = i;
				}
				if (aLineItemAnnotations[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aLineItemAnnotations[i].Value.Path ===
					sHeaderDescription) {
					if (AnnotationHelper.isPropertyHidden(aLineItemAnnotations[i])) {
						continue;
					}
					bDescr = true;
					iDescIndex = i;
				}
			}
			if (bTitle) {
				sTargetString = sTargetString + iTitleIndex + '/Value/Path';
				return sTargetString;
			} else if (bDescr) {
				sTargetString = sTargetString + iDescIndex + '/Value/Path';
				return sTargetString;
			}
		} else { // Cannot do anything
			jQuery.sap.log.warning("No entity type provided");
		}
	};

	AnnotationHelper.isPropertyHidden = function (oLineItemAnnotations) {
		//AnnotationHelper.debugArgs(arguments);
		var bHidden = false;
		// "com.sap.vocabularies.Common.v1.FieldControl" annotation is deprecated but we check it here for compatibility reasons
		if (oLineItemAnnotations["com.sap.vocabularies.UI.v1.Hidden"] || (oLineItemAnnotations["com.sap.vocabularies.Common.v1.FieldControl"] &&
				oLineItemAnnotations["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember &&
				oLineItemAnnotations["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember ===
				"com.sap.vocabularies.Common.v1.FieldControlType/Hidden")) {
			bHidden = true;
		}
		return bHidden;
	};

	AnnotationHelper.isCurrentEntity = function (oEntitySet, sSectionId) {
		return oEntitySet.name === sSectionId;
	};

	AnnotationHelper.isCurrentFacet = function (oFacet, sFragmentId) {
		var sId = AnnotationHelper.getStableIdPartFromFacet(oFacet);
		if (sId === sFragmentId) {
			return true;
		} else {
			return false;
		}
	};

	AnnotationHelper.extensionPointBeforeFacetExists = function (sEntitySet, oFacet, oManifestExtend) {
		//AnnotationHelper.debugArgs(arguments);
		if (oManifestExtend) {
			var sExtensionPointId = getBeforeExtensionPointId(sEntitySet, oFacet);
			return oManifestExtend[sExtensionPointId];
		}
		return false;
	};

	AnnotationHelper.extensionPointAfterFacetExists = function (sEntitySet, oFacet, oManifestExtend) {
		//AnnotationHelper.debugArgs(arguments);
		var bExists = false;
		if (oManifestExtend) {
			var sExtensionPointId = "AfterFacet|" + sEntitySet + "|" + AnnotationHelper.getStableIdPartFromFacet(oFacet);
			Object.keys(oManifestExtend).forEach(function (sKey) {
				if (sKey.startsWith(sExtensionPointId)) {
					bExists = true;
					return;
				}
			});
		}
		return bExists;
	};

	AnnotationHelper.extensionPointAfterFacetCheckExistence = function (sEntitySet, oFacet, oManifestExtend, sAfterFacetName) {
		//AnnotationHelper.debugArgs(arguments);
		if (oManifestExtend[sAfterFacetName]) {
			var aAfterFacetName = sAfterFacetName.split('|');
			aAfterFacetName.pop(); // poping name
			var oExtFacetId = aAfterFacetName.pop(); // poping facet id
			return AnnotationHelper.getStableIdPartFromFacet(oFacet) === oExtFacetId;
		}
		return false;
	};

	function getBeforeExtensionPointId(sEntitySet, oFacet) {
		var sExtensionPointId = "BeforeFacet|" + sEntitySet + "|" + AnnotationHelper.getStableIdPartFromFacet(oFacet);
		return sExtensionPointId;
	}

	AnnotationHelper.getStableIdPartFromBeforeFacet = function (sEntitySet, oFacet, oManifestExtend) {
		//default to getStableIdPartFromFacet from oFacet if needed
		var sExtensionPointId = getBeforeExtensionPointId(sEntitySet, oFacet);
		var oExtension = oManifestExtend[sExtensionPointId];
		if (oExtension && oExtension["sap.fin.travel.lib.reuse"] && oExtension["sap.fin.travel.lib.reuse"].sectionId) {
			return oExtension["sap.fin.travel.lib.reuse"].sectionId;
		}
		return AnnotationHelper.getStableIdPartFromFacet(oFacet);
	};

	/**
	 * Return the formula to decide whether to display the before facet extension section or not.
	 * It looks at manifest configuration for the "hiddenProperty" property in the "sap.fin.travel.lib.reuse" section of the extension manifest
	 * Default is to return true (section visible)
	 *
	 */
	AnnotationHelper.shouldDisplayBeforeFacetSection = function (sEntitySet, oFacet, oManifestExtend) {
		var sExtensionPointId = getBeforeExtensionPointId(sEntitySet, oFacet);
		var oExtension = oManifestExtend[sExtensionPointId];
		if (oExtension && oExtension["sap.fin.travel.lib.reuse"] && oExtension["sap.fin.travel.lib.reuse"].hiddenProperty) {
			return AnnotationHelper.shouldDisplaySection(oExtension["sap.fin.travel.lib.reuse"].hiddenProperty);
		}
		return true;
	};
	AnnotationHelper.shouldDisplayAfterFacetSection = function (sEntitySet, oFacet, oManifestExtend, sAfterFacetName) {
		//AnnotationHelper.debugArgs(arguments);
		var oExtension = oManifestExtend[sAfterFacetName];
		if (oExtension && oExtension["sap.fin.travel.lib.reuse"] && oExtension["sap.fin.travel.lib.reuse"].hiddenProperty) {
			return AnnotationHelper.shouldDisplaySection(oExtension["sap.fin.travel.lib.reuse"].hiddenProperty);
		}
		return true;
	};

	AnnotationHelper.getExtensionPointBeforeFacetTitle = function (sEntitySet, oFacet, oManifestExtend) {
		//AnnotationHelper.debugArgs(arguments);
		var sExtensionPointId = getBeforeExtensionPointId(sEntitySet, oFacet);
		var oExtension = oManifestExtend[sExtensionPointId];
		if (oExtension && oExtension["sap.fin.travel.lib.reuse"] && oExtension["sap.fin.travel.lib.reuse"].title) {
			return oExtension["sap.fin.travel.lib.reuse"].title;
		}
	};

	AnnotationHelper.getExtensionPointAfterFacetTitle = function (sEntitySet, oFacet, oManifestExtend, sAfterFacetName) {
		//AnnotationHelper.debugArgs(arguments);
		var oExtension = oManifestExtend[sAfterFacetName];
		if (oExtension && oExtension["sap.fin.travel.lib.reuse"] && oExtension["sap.fin.travel.lib.reuse"].title) {
			return oExtension["sap.fin.travel.lib.reuse"].title;
		}
	};

	AnnotationHelper.getNavigationPropertyByName = function (oSourceEntitySet, sNavigationProperty) {
		if (oSourceEntitySet && oSourceEntitySet.navigationProperty) {
			for (var i = 0; i < oSourceEntitySet.navigationProperty.length; i++) {
				if (oSourceEntitySet.navigationProperty[i].name === sNavigationProperty) {
					return oSourceEntitySet.navigationProperty[i];
				}
			}
		}
		return undefined;
	};

	AnnotationHelper.isSourceEntityNavigationCreatable = function (oInterface, oSourceEntitySet) {
		var oModel = oInterface.getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var oSearchRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;

		if (oInsertRestrictions && oInsertRestrictions.Insertable && !oSearchRestrictions) {
			if (AnnotationHelper.isSourceEntityNavigationEntitySet(oModel,
					oInsertRestrictions.Insertable.Path)) {
				return true;
			}
		}

		return false;
	};

	AnnotationHelper.getSourceEntityNavigationCreatableVisibility = function (oInterface, sAnnotationPath, oSourceEntitySet,
		oParentEntityType) {
		var oModel = oInterface.getInterface(0).getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var sCreatablePath, sCreatablePathResolved;

		// Look into annotation path
		if (sAnnotationPath) {
			var sNavigationProperty = sAnnotationPath.split("/")[0];
			var oNavigationProperty = AnnotationHelper.getNavigationPropertyByName(oParentEntityType, sNavigationProperty);
			if (oNavigationProperty && oNavigationProperty.hasOwnProperty("sap:creatable-path")) {
				//AnnotationPath is only filled on Object Page which contains facets->annotationPath
				if (oNavigationProperty["sap:creatable-path"] == "false") {
					return false;
				} else if (!(oNavigationProperty["sap:creatable-path"] == "true")) {
					sCreatablePath = oNavigationProperty["sap:creatable-path"] == "true" ? undefined : oNavigationProperty["sap:creatable-path"];
					if (sCreatablePath && sCreatablePath.charAt(0) === '!') {
						sCreatablePath = sCreatablePath.slice(1);
						sCreatablePathResolved = "!${" + sCreatablePath + "}";
					} else {
						sCreatablePathResolved = "${" + sCreatablePath + "}";;
					}
				}
			}
		}

		// Look into InsertRestrictions
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var oSearchRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;
		if (oInsertRestrictions && oInsertRestrictions.Insertable && !oSearchRestrictions) {
			if (AnnotationHelper.isSourceEntityNavigationEntitySet(oModel,
					oInsertRestrictions.Insertable.Path)) {
				return sCreatablePath ? "{= !${DisplayMode} ? " + sCreatablePathResolved + " : false }" : "{= !${DisplayMode} }";
			}
		}

		return false;
	};

	AnnotationHelper.isSourceEntitySearchNavigationCreatable = function (oInterface, oSourceEntitySet) {
		var oModel = oInterface.getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var oSearchRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;

		if (oInsertRestrictions && oInsertRestrictions.Insertable && oSearchRestrictions && oSearchRestrictions.Searchable) {
			if (AnnotationHelper.isSourceEntityNavigationEntitySet(oModel,
					oInsertRestrictions.Insertable.Path)) {
				return true;
			}
		}
		return false;
	};

	AnnotationHelper.getSourceEntitySearchNavigationCreatableVisibility = function (oInterface, sAnnotationPath, oSourceEntitySet,
		oParentEntityType) {
		var oModel = oInterface.getInterface(0).getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var sCreatablePath, sCreatablePathResolved;

		// Look into annotation path
		if (sAnnotationPath) {
			var sNavigationProperty = sAnnotationPath.split("/")[0];
			var oNavigationProperty = AnnotationHelper.getNavigationPropertyByName(oParentEntityType, sNavigationProperty);
			if (oNavigationProperty && oNavigationProperty.hasOwnProperty("sap:creatable-path")) {
				//AnnotationPath is only filled on Object Page which contains facets->annotationPath
				if (oNavigationProperty["sap:creatable-path"] == "false") {
					return false;
				} else if (!(oNavigationProperty["sap:creatable-path"] == "true")) {
					sCreatablePath = oNavigationProperty["sap:creatable-path"] == "true" ? undefined : oNavigationProperty["sap:creatable-path"];
					if (sCreatablePath && sCreatablePath.charAt(0) === '!') {
						sCreatablePath = sCreatablePath.slice(1);
						sCreatablePathResolved = "!${" + sCreatablePath + "}";
					} else {
						sCreatablePathResolved = "${" + sCreatablePath + "}";;
					}
				}
			}
		}

		// Look into InsertRestrictions
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || undefined;
		var oSearchRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.SearchRestrictions"] || undefined;
		if (oInsertRestrictions && oInsertRestrictions.Insertable && oSearchRestrictions && oSearchRestrictions.Searchable) {
			if (AnnotationHelper.isSourceEntityNavigationEntitySet(oModel,
					oInsertRestrictions.Insertable.Path)) {
				return sCreatablePath ? "{= !${DisplayMode} ? " + sCreatablePathResolved + " : false }" : "{= !${DisplayMode} }";
			}
		}
		return false;
	};

	AnnotationHelper.isSourceEntityNavigationEntitySet = function (oModel, sPropertyPath) {
		var oEntitySet = oModel.getODataEntitySet(sPropertyPath);
		return (oEntitySet && oEntitySet.entityType);
	};

	AnnotationHelper.getSourceEntityCreatableVisibility = function (oInterface, sAnnotationPath, oSourceEntitySet, oParentEntityType) {
		var result = "{= !${DisplayMode} }";
		var oModel = oInterface.getInterface(0).getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var sCreatablePath, sCreatablePathResolved;

		// Look into annotation path
		if (sAnnotationPath) {
			var sNavigationProperty = sAnnotationPath.split("/")[0];
			var oNavigationProperty = AnnotationHelper.getNavigationPropertyByName(oParentEntityType, sNavigationProperty);
			if (oNavigationProperty && oNavigationProperty.hasOwnProperty("sap:creatable-path")) {
				//AnnotationPath is only filled on Object Page which contains facets->annotationPath
				if (oNavigationProperty["sap:creatable-path"] == "false") {
					return false;
				} else {
					sCreatablePath = oNavigationProperty["sap:creatable-path"] == "true" ? undefined : oNavigationProperty["sap:creatable-path"];
					if (sCreatablePath && sCreatablePath.charAt(0) === '!') {
						sCreatablePath = sCreatablePath.slice(1);
						sCreatablePathResolved = "!${" + sCreatablePath + "}";
					} else {
						sCreatablePathResolved = "${" + sCreatablePath + "}";;
					}
				}
			}
		}

		// Look into InsertRestrictions
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || [];

		if (oInsertRestrictions && oInsertRestrictions.Insertable) {
			if (AnnotationHelper.isSourceEntityPropertyBoolean(oModel, oSourceEntitySet.entityType,
					oInsertRestrictions.Insertable.Path)) {
				return sCreatablePath ? "{= !${DisplayMode} ? (" + sCreatablePathResolved + " ? ${" + oInsertRestrictions.Insertable.Path +
					"} : false) : false }" : "{= !${DisplayMode} ? " + oInsertRestrictions.Insertable.Path + " : false }";
			} else {
				return false;
			}
		}
		return sCreatablePath ? "{= !${DisplayMode} ? " + sCreatablePathResolved + " : false }" : "{= !${DisplayMode} }";
	};

	AnnotationHelper.isSourceEntityPropertyBoolean = function (oModel, sEntityTypeName, sPropertyPath) {
		var sProperty = sPropertyPath;
		var oPathEntityType = oModel.getODataEntityType(sEntityTypeName);
		if (sProperty.indexOf("/") > -1) { // if it's a navigation path, we have to expand to find the right entity type
			var aPathParts = sProperty.split("/");
			for (var j = 0; j < aPathParts.length - 1; j++) { // go through the parts finding the last entity type;
				var oAssociationEnd = oModel.getODataAssociationEnd(oPathEntityType, aPathParts[j]);
				oPathEntityType = oModel.getODataEntityType(oAssociationEnd.type);
			}
			sProperty = aPathParts[aPathParts.length - 1]; // last entry in array is a property
		}

		var oODataProperty = oModel.getODataProperty(oPathEntityType, sProperty);
		return (oODataProperty && oODataProperty.type === "Edm.Boolean");
	};

	AnnotationHelper.getTargetEntitySettings = function (oInterface, oSourceEntitySet) {
		var aSettings = [];
		var oModel = oInterface.getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || [];

		if (oInsertRestrictions && oInsertRestrictions.Insertable) {
			if (AnnotationHelper.isSourceEntityNavigationEntitySet(oModel,
					oInsertRestrictions.Insertable.Path)) {
				// Target entity name.
				aSettings.push(oInsertRestrictions.Insertable.Path);
				// Main property name of the target entity.
				var oRelatedEntitySet = oModel.getODataEntitySet(oInsertRestrictions.Insertable.Path);
				var oRelatedEntityType = oModel.getODataEntityType(oRelatedEntitySet.entityType);
				var oRelatedEntityHeaderInfo = oRelatedEntityType ? oRelatedEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"] : undefined;
				aSettings.push(oRelatedEntityHeaderInfo ? oRelatedEntityHeaderInfo.Title.Value.Path : "");
			}
		}
		return JSON.stringify(aSettings);
	};

	AnnotationHelper.getTargetEntityProperties = function (oInterface, oSourceEntitySet) {
		var aProperties = [];
		var oModel = oInterface.getModel();
		var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
		var oInsertRestrictions = oSourceEntityType["Org.OData.Capabilities.V1.InsertRestrictions"] || [];

		if (oInsertRestrictions && oInsertRestrictions.NonInsertableNavigationProperties) {
			for (var i = 0; i < oInsertRestrictions.NonInsertableNavigationProperties.length; i++) {
				aProperties.push(oInsertRestrictions.NonInsertableNavigationProperties[i].NavigationPropertyPath);
			}
		}
		return JSON.stringify(aProperties);
	};

	AnnotationHelper.matchesBreadCrumb = function (oInterface, oCandidate, sPath) {
		if (sPath) {
			var aSections = sPath.split("/");
			var oEntitySet, oEntityType, oAssociationEnd;

			if (aSections.length > 0) {
				// there's at least one section left - crate breadcrumbs
				var oMetaModel = oInterface.getInterface(0).getModel();
				var sEntitySet = aSections[0];

				for (var i = 0; i < aSections.length; i++) {
					if (i > 0) {
						oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
						oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
						oAssociationEnd = oMetaModel.getODataAssociationSetEnd(oEntityType, aSections[i]);
						sEntitySet = oAssociationEnd.entitySet;
					}

					if ((i + 1) === aSections.length) {
						if (sEntitySet === oCandidate.name) {
							return true;
						} else {
							return false;
						}
					}
				}
			}
		}
	};

	// build expression binding for bread crumbs
	AnnotationHelper.buildBreadCrumbExpression = function (oContext, oTitle, oTypeName) {
		var sBinding,
			sBindingTitle = sap.ui.model.odata.AnnotationHelper.format(oContext, oTitle);

		if (oTitle && oTitle.Path && oTypeName && oTypeName.String) {
			var sTypeNameEscaped = oTypeName.String.replace(/'/g, "\\'");
			sBinding = "{= $" + sBindingTitle + " ? $" + sBindingTitle + " : '" + sTypeNameEscaped + "' }";
			return sBinding;
		} else {
			// in case of a complex binding of the title we do not introduce our default text fallback
			if (!sBindingTitle) {
				// string "[[no title]]" should never been shown in UI therefore no transaltion needed
				return oTypeName && oTypeName.String || "[[no title]]";
			}
			return sBindingTitle;
		}
	};

	AnnotationHelper.resolveI18n = function (sText) {
		if (Utils.isEmptyObjectOrString(sText)) {
			return sText;
		}
		var sKey = sText.replace(/[{}\\]/g, "").split(">");
		if (sKey.length > 0 && sKey[0] === "i18n") {
			return I18n.get().resolveText(sKey[1]);
		}
		return I18n.get().resolveText(sText);
	};

	AnnotationHelper.isEntityDeletable = function (oInterface, oEntitySet) {
		var result = "{= ${view>/level} === 1 ? true : !${DisplayMode}}";
		var oModel = oInterface.getModel();
		var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"] || [];

		if (oDeleteRestrictions && oDeleteRestrictions.Deletable) {
			var oODataProperty = oModel.getODataProperty(oEntitySet, oDeleteRestrictions.Deletable.Path);
			if (oODataProperty && oODataProperty.type === "Edm.Boolean") {
				result = "{= ${view>/level} === 1 ? ${" + oDeleteRestrictions.Deletable.Path + "} : (!${DisplayMode} ? ${" + oDeleteRestrictions.Deletable
					.Path + "} : false) }";
			} else {
				result = "false";
			}
		}
		return result;
	};

	AnnotationHelper.actionControlInline = function (sActionApplicablePath) {
		var oPropertyResolvedPath;
		if (sActionApplicablePath) {
			if (typeof sActionApplicablePath === "boolean") {
				return "{= !${DisplayMode} ? " + sActionApplicablePath + " : false }";
			} else {
				if (sActionApplicablePath && sActionApplicablePath.charAt(0) === '!') {
					sActionApplicablePath = sActionApplicablePath.slice(1);
					oPropertyResolvedPath = "!${" + sActionApplicablePath + "}";
				} else {
					oPropertyResolvedPath = "${" + sActionApplicablePath + "}";
				}
				return "{= !${DisplayMode} ? " + oPropertyResolvedPath + " : false }";
			}
		}
		return "{= !${DisplayMode} }";
	};

	AnnotationHelper.actionControlNotInline = function (sActionApplicablePath) {
		var oPropertyResolvedPath;
		if (sActionApplicablePath) {
			if (typeof sActionApplicablePath === "boolean") {
				return "{= !${DisplayMode} ? " + sActionApplicablePath + " : false }";
			} else {
				if (sActionApplicablePath && sActionApplicablePath.charAt(0) === '!') {
					sActionApplicablePath = sActionApplicablePath.slice(1);
					oPropertyResolvedPath = "!${" + sActionApplicablePath + "}";
				} else {
					oPropertyResolvedPath = "${" + sActionApplicablePath + "}";
				}
				return "{= " + oPropertyResolvedPath + " }";
			}
		}
		return "{= !${DisplayMode} }";
	};

	AnnotationHelper.actionHeaderControl = function (sActionApplicablePath) {
		var oPropertyResolvedPath;
		if (sActionApplicablePath) {
			if (typeof sActionApplicablePath === "boolean") {
				return "{= " + sActionApplicablePath + " }";
			} else {
				if (sActionApplicablePath && sActionApplicablePath.charAt(0) === '!') {
					sActionApplicablePath = sActionApplicablePath.slice(1);
					oPropertyResolvedPath = "!${" + sActionApplicablePath + "}";
				} else {
					oPropertyResolvedPath = "${" + sActionApplicablePath + "}";
				}
				return "{= " + oPropertyResolvedPath + " }";
			}
		}
		return true;
	};

	AnnotationHelper.actionEnabled = function (sActionApplicablePath, sTarget) {
		if (!sActionApplicablePath) {
			return true;
		} else {
			return "{path: '" + sTarget.AnnotationPath.split("/")[0] + "/" + sActionApplicablePath + "'}";
		}
	};

	AnnotationHelper.toolbarButtonEnabled = function (sActionApplicablePath, sActionActionFor) {
		if (sActionActionFor) {
			return false;
		} else if (!sActionApplicablePath) {
			return true;
		} else {
			return "{path: '" + sActionApplicablePath + "'}";
		}
	};

	AnnotationHelper.actionLabel = function (oLabel, sTarget) {
		if (oLabel.String) {
			return oLabel.String;
		} else {
			return "{path: '" + sTarget.AnnotationPath.split("/")[0] + "/" + oLabel.Path + "'}";
		}
	};

	AnnotationHelper.actionLabelForText = function (oLabel, sTarget, oUrlIcon) {
		if (oUrlIcon) {
			return "";
		} else if (oLabel.String) {
			return oLabel.String;
		} else {
			return "{path: '" + sTarget.AnnotationPath.split("/")[0] + "/" + oLabel.Path + "'}";
		}
	};

	AnnotationHelper.actionIcon = function (oIconUrl, sTarget) {
		if (oIconUrl && oIconUrl.Path) {
			return oIconUrl.Path;
		} else if (!Utils.isEmptyObjectOrString(sTarget)) {
			return "{path: '" + sTarget.AnnotationPath.split("/")[0] + "/" + oIconUrl.Path + "'}";
		}
	};

	AnnotationHelper.resolveIdentification = function (oInterface, oTarget) {
		var sPath = oInterface.getPath(); // Current path
		var oMetaData = oInterface.getModel();
		var aParentPath = sPath.split('/');
		aParentPath.pop();
		var sParentPath = aParentPath.join('/');
		// oMetaData.getProperty(sParentPath)["com.sap.vocabularies.UI.v1.Identification"];
		return oMetaData.createBindingContext(sParentPath);
	};

	AnnotationHelper.getVisibilityByPropertyPath = function (oProperty, oBindingExpression) {
		if (typeof oProperty === "boolean") {
			return oProperty;
		}
		var sBindingExpResolved = oBindingExpression ? oBindingExpression : "true";
		if (oProperty) {
			// determine if property path a relative (not starting by '/') or absolute (starting by '/')
			if (oProperty.startsWith('/')) {
				// We look into global model property
				return "{= !${DisplayMode} ? (!!${_global>" + oProperty + "} ? " + sBindingExpResolved + " : false) : false }";
			} else {
				// We look into relative binding context
				return "{= !${DisplayMode} ? (${" + oProperty + "} ? " + sBindingExpResolved + " : false) : false }";
			}
		}
		return "{= !${DisplayMode} ? " + sBindingExpResolved + " : false }";
	};

	AnnotationHelper.getStableIdPartFromFacet = function (oFacet) {
		if (oFacet.RecordType && (oFacet.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet" || oFacet.RecordType ===
				"com.sap.vocabularies.UI.v1.ReferenceFacet")) {
			if (oFacet.ID && oFacet.ID.String) {
				return oFacet.ID.String;
			} else {
				jQuery.sap.log.error("Annotation Helper: Unable to get stable ID. Please check the facet annotations.");
				return Math.floor((Math.random() * 99999) + 1).toString();
			}
		} else {
			jQuery.sap.log.error("Annotation Helper: Unable to get stable ID. Please check the facet annotations.");
			return Math.floor((Math.random() * 99999) + 1).toString();
		}
	};

	AnnotationHelper.containsFormWithBreakoutAction = function (oFacetCandidate, sIdCriterion) {
		var sCandidateId = AnnotationHelper.getStableIdPartFromFacet(oFacetCandidate);
		if (sCandidateId === sIdCriterion) {
			if (oFacetCandidate.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet" &&
				oFacetCandidate.Target &&
				oFacetCandidate.Target.AnnotationPath &&
				oFacetCandidate.Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.FieldGroup") != -1) {
				return true;
			}
		}
		return false;
	};

	AnnotationHelper.getEntityCreatable = function (oInsertRestrictions) {
		return oInsertRestrictions === undefined || oInsertRestrictions.Insertable === undefined || oInsertRestrictions.Insertable.Bool;
	};

	AnnotationHelper.getDataFieldForActionId = function (oAction, oCriticality, oVariant) {
		if (oVariant) {
			return "Variant::" + oVariant.key + "ToolBarButton::" + oAction.name + "::" + oAction.entitySet + "::" + (oCriticality ? oCriticality
				.EnumMember.split('/').pop() :
				'Default') + "::" + (oAction["sap:action-for"] ? 'DataFieldForActionButton' : 'DataFieldActionButton');
		} else {
			return "ToolBarButton::" + oAction.name + "::" + oAction.entitySet + "::" + (oCriticality ? oCriticality.EnumMember.split('/').pop() :
				'Default') + "::" + (oAction["sap:action-for"] ? 'DataFieldForActionButton' : 'DataFieldActionButton');
		}
	};

	AnnotationHelper.getOverrideButtonVisibility = function (sId, oOverrideButtons) {
		if (oOverrideButtons) {
			for (var oButton in oOverrideButtons) {
				if (oOverrideButtons.hasOwnProperty(oButton)) {
					if (oOverrideButtons[oButton].id === sId) {
						return oOverrideButtons[oButton].visible;
					}
				}
			}

		}
		return true;
	};

	AnnotationHelper.getVariantKey = function (oVariant) {
		if (oVariant) {
			return oVariant.key;
		}
		return "NoVariant";
	};

	AnnotationHelper.getPresentationVariantVisualisation = function (oEntityType, sVariantAnnotationPath, oFacetAnnotationPath) {
		if (sVariantAnnotationPath) {
			var oVariant = oEntityType[sVariantAnnotationPath];
			if (oVariant) {
				if (oVariant.Visualizations) {
					return oVariant.Visualizations[0].AnnotationPath.split('#')[1];
				}
			}
		}
		return oFacetAnnotationPath.split('#')[1];
	};

	AnnotationHelper.getSegmentedId = function (oSetting) {
		return "detailPage::multipleViews::" + oSetting.referenceFacetId;
	};

	AnnotationHelper.getIconTabBarSelectedKey = function (oSetting) {
		if (oSetting && oSetting.quickVariantSelection && oSetting.quickVariantSelection.selectField) {
			var sSelectField = oSetting.quickVariantSelection.selectField;
			var aFormulas = [];
			for (var i in oSetting.quickVariantSelection.variants) {
				var oVariant = oSetting.quickVariantSelection.variants[i];

				aFormulas.push("${" + sSelectField + "} === '" + oVariant.selectValue + "' ? '" + oVariant.key + "' : ");

			}

			var sFormula = "{= " + aFormulas.join("") + " '' }";
			return sFormula;
		}
	};

	AnnotationHelper.hasQuickSelectionVariant = function (oFacet, oSettings) {
		if (oSettings) {
			var facetId = (oFacet.ID && oFacet.ID.String) ? oFacet.ID.String : undefined;
			for (var i = 0; i < oSettings.length; i++) {
				if (facetId && oSettings[i].referenceFacetId && oSettings[i].referenceFacetId === facetId) {
					return true;
				}
			}
		}
		return false;
	};

	AnnotationHelper.isCurrentSection = function (oFacet, oSetting) {
		if (oSetting) {
			var facetId = (oFacet.ID && oFacet.ID.String) ? oFacet.ID.String : undefined;
			if (facetId && oSetting.referenceFacetId) {
				return oSetting.referenceFacetId === facetId;
			}
		}
		return false;
	};

	AnnotationHelper.hasLineItemQualifier = function (oFacetAnnotationPath, sVariantAnnotationPath) {
		return sVariantAnnotationPath || oFacetAnnotationPath.split('#')[1];
	};

	AnnotationHelper.getEnabledIconTab = function (oPropertyPath) {
		if (oPropertyPath != undefined) {
			var oPropertyResolvedPath;
			if (typeof oEnabledPath === "boolean") {
				return "{= !${DisplayMode} ? " + oPropertyPath + " : false }";
			} else {
				if (oPropertyPath && oPropertyPath.charAt(0) === '!') {
					oPropertyPath = oPropertyPath.slice(1);
					oPropertyResolvedPath = "!${" + oPropertyPath + "}";
				} else {
					oPropertyResolvedPath = "${" + oPropertyPath + "}";
				}
				return "{= !${DisplayMode} ? " + oPropertyResolvedPath + " : false }";
			}
		} else {
			return "{= !${DisplayMode} }";
		}
	};

	AnnotationHelper.getEnabledMode = function (oEntityType, oDataField) {
		var sDataFieldFc;
		var sDataField = oDataField.Value.Path;
		oEntityType.property.forEach(function (oProperty) {
			if (oProperty.name == sDataField) {
				sDataFieldFc = oProperty["com.sap.vocabularies.Common.v1.FieldControl"].Path;
			}
		});

		return "{= !${DisplayMode} ? ${" + sDataFieldFc + "} > 1 : false }";
	};

	AnnotationHelper.getNoDataText = function (oEntitySet) {
		if (oEntitySet && oEntitySet["sap:searchable"]) {
			// You can add here your custom label for filterable entities
		} else {
			return AnnotationHelper.resolveI18n("NO_ITEMS_FOUND");
		}
	};

	AnnotationHelper.resolveBoolean = function (oProperty) {
		var bValue = false; // default is false
		if (typeof oProperty === "boolean") { // oProperty is boolean
			bValue = oProperty;
		} else if (typeof oProperty === "string") { // oProperty is string
			if (oProperty === "X" || oProperty === "") { // oProperty value 'X' or ''
				bValue = oProperty === "X";
			} else if (oProperty.toLowerCase() === "true" || oProperty.toLowerCase() === "false") { // oProperty value 'true' or 'false'
				bValue = oProperty.toLowerCase() === "true";
			} else { // oProperty is considered as a property
				bValue = "{= ${" + oProperty + "} }";
			}
		}
		return bValue;
	};

	AnnotationHelper.isSelectionFieldCandidate = function (oContext, oDataField) {
		if (oContext && oContext.length > 0) {
			for (var i = 0; i < oContext.length; i++) {
				if (oContext[i] && oContext[i].PropertyPath === oDataField.PropertyPath) {
					return true;
				}
			}
		}
		return false;
	};

	AnnotationHelper.getColumnListItemStableId = function (oEntityType, oDataField) {
		return oEntityType.name + "::ColumnListItem::" + oDataField.Value.Path;
	};

	AnnotationHelper.isContactJobTitleAvailable = function (oInterface, oEntitySet) {
		var oEntityType;
		var oMetaModel = oInterface && oInterface.getModel && oInterface.getModel();
		if (!oMetaModel) {
			// called with entity set therefore use the correct interface
			oInterface = oInterface.getInterface(0);
			oMetaModel = oInterface.getModel();
		}
		// We have to keep model name space to get contact entity type name.
		var aEntityType = oEntitySet.entityType.split('.');
		aEntityType.pop();
		aEntityType.push("Contact");
		var sEntityTypeName = aEntityType.join('.');
		oEntityType = oMetaModel.getODataEntityType(sEntityTypeName);
		if (oEntityType) {
			var aTitleProp = jQuery.grep(oEntityType.property, function (oField) {
				return oField.name === "Title";
			});
			return aTitleProp.length == 1;
		}
		return false;
	};

	AnnotationHelper.isContactJobTitleAvailable.requiresIContext = true;
	AnnotationHelper.matchesBreadCrumb.requiresIContext = true;
	AnnotationHelper.buildBreadCrumbExpression.requiresIContext = true;
	AnnotationHelper
		.getEntityTypesForFormPersonalization.requiresIContext = true;
	AnnotationHelper.formatWithExpand.requiresIContext = true;
	AnnotationHelper
		.formatWithExpandSimpleWithDefault.requiresIContext = true;
	AnnotationHelper.getNavigationPathWithExpand.requiresIContext = true;
	AnnotationHelper
		.formatWithExpandSimple.requiresIContext = true;
	AnnotationHelper.getSourceEntitySearchNavigationCreatableVisibility.requiresIContext =
		true;
	AnnotationHelper.getSourceEntityNavigationCreatableVisibility.requiresIContext = true;
	AnnotationHelper.isSourceEntitySearchNavigationCreatable
		.requiresIContext = true;
	AnnotationHelper.isSourceEntityNavigationCreatable.requiresIContext = true;
	AnnotationHelper.getSourceEntityCreatableVisibility
		.requiresIContext = true;
	AnnotationHelper.getTargetEntitySettings.requiresIContext = true;
	AnnotationHelper.getTargetEntityProperties.requiresIContext =
		true;
	AnnotationHelper.createP13NColumnForAction.requiresIContext = true;
	AnnotationHelper.createP13N.requiresIContext = true;
	AnnotationHelper
		.isEntityDeletable.requiresIContext = true;
	AnnotationHelper.getKeyItem.requiresIContext = true;
	AnnotationHelper.getDescriptionItem.requiresIContext =
		true;
	AnnotationHelper.resolveIdentification.requiresIContext = true;

	return AnnotationHelper;
}, true);
/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
		"sap/ui/base/Object",
		"sap/fin/travel/lib/reuse/util/i18n",
		"sap/ui/core/MessageType",
		"sap/fin/travel/lib/reuse/util/Utils"
	],
	function (BaseObject, I18n, MessageType, Utils) {
		"use strict";

		function formatCriticality(iCiticality) {
			if (iCiticality) {
				switch (iCiticality) {
				case 1:
					return MessageType.Error;
				case 2:
					return MessageType.Warning;
				default:
					return MessageType.None;
				}
			}
			return MessageType.None;
		}

		function formatDraftLinkType(DraftLinkType) {
			if (DraftLinkType && !Utils.isEmptyObjectOrString(DraftLinkType)) {
				return DraftLinkType;
			} else {
				return "Draft"; // Default value - cannot be initial
			}
		}

		function getMethods(oController) {
			function formatText() {
				var aArgs = Array.prototype.slice.call(arguments, 1);
				var sKey = arguments[0];
				if (!sKey) {
					return "";
				} else {
					return I18n.get().getText(oController, sKey, aArgs[0]);
				}
			}

			function formatDraftLockText(DraftLinkType) {
				if (DraftLinkType === "Draft") {
					return I18n.get().getText(oController, "DRAFT_OBJECT");
				} else {
					return I18n.get().getText(oController, "UNSAVED_CHANGES");
				}
			}

			return {
				formatDraftLinkType: formatDraftLinkType,
				formatText: formatText,
				formatDraftLockText: formatDraftLockText,
				formatCriticality: formatCriticality
			};
		}

		return BaseObject.extend("sap.fin.travel.lib.reuse.util.FormatHandler", {
			constructor: function (oController) {
				jQuery.extend(this, getMethods(oController));
			}
		});

	});

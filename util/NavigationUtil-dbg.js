/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/fin/travel/lib/reuse/util/FCLayoutUtil",
	"sap/ui/core/routing/HashChanger",
	"sap/fin/travel/lib/reuse/util/Utils"
], function (FCLayoutUtil, HashChanger, Utils) {
	"use strict";

	function getMethods() {

		function fnInternalSetHash(sPath) {
			var sCurrentPath = HashChanger.getInstance().getHash();

			//if current hash and destination hash are equivalent, there is no need to record history for that
			if (sCurrentPath === sPath) {
				return;
			}

			var sDestinationTripNo = sPath.match(/Tripno='(\d+)'/) && sPath.match(/Tripno='(\d+)'/)[1];
			if ("0000000000" === sDestinationTripNo) {
				HashChanger.getInstance().replaceHash(sPath);
			} else {
				HashChanger.getInstance().setHash(sPath);
			}
		}

		function _findAndReplaceOrAppend(sParentPath, sSubPath) {
			var sNavPath = [];
			sSubPath = sSubPath.substring(1);
			if (sParentPath) {
				var oParentPath = sParentPath.split("/");
				for (var i = 0; i < oParentPath.length; i++) {
					if (oParentPath[i] !== "") {
						if (sSubPath.split("(")[0] === oParentPath[i].split("(")[0]) {
							sNavPath.push(sSubPath);
							return "/" + sNavPath.join("/");
						} else {
							sNavPath.push(oParentPath[i]);
						}
					}
				}
				sNavPath.push(sSubPath);
				return "/" + sNavPath.join("/");
			}
			return "/" + sSubPath;
		};

		/**
		 * Get the returned Hash from response
		 */
		function _getHashFromResponse(oResponse) {
			var oResponseBody;
			if (oResponse) {
				var oBatchResponse, oBody;
				if (oResponse.hasOwnProperty("__batchResponses")) {
					oBatchResponse = oResponse.__batchResponses[0];
					if (oBatchResponse && oBatchResponse.__changeResponses[0]) {
						oResponseBody = oBatchResponse.__changeResponses[0].body;
						if (oResponseBody) {
							var oBody = JSON.parse(oResponseBody);
							if (oBody && oBody.d && oBody.d.__metadata) {
								var oServiceType = oBody.d.__metadata.type.split(".").shift();
								return oBody.d.__metadata.uri.split(oServiceType).pop();
							}
						}
					}
				} else if (oResponse.hasOwnProperty("data")) {
					if (oResponse.data.hasOwnProperty("__batchResponses")) {
						oBatchResponse = oResponse.data.__batchResponses[0];
						if (oBatchResponse && oBatchResponse.__changeResponses[0]) {
							oResponseBody = oBatchResponse.__changeResponses[0].body;
							if (oResponseBody) {
								var oBody = JSON.parse(oResponseBody);
								if (oBody && oBody.d && oBody.d.__metadata) {
									var oServiceType = oBody.d.__metadata.type.split(".").shift();
									return oBody.d.__metadata.uri.split(oServiceType).pop();
								}
							}
						}
					} else {
						oBody = oResponse.data;
						if (oBody && oBody.__metadata) {
							var oServiceType = oBody.__metadata.type.split(".").shift();
							return oBody.__metadata.uri.split(oServiceType).pop();
						}
					}
				}
			}
			return "";
		}

		/**
		 * Navigate to the given path, and adjust FCL Layout accordingly.
		 * Default is to go one level deeper than the provided iLevel.
		 * Otherwise, if bInPlace is true, the layout should match the given level.
		 */
		function fnNavigate(sPath, iLevel, bInPlace) {
			if (iLevel === FCLayoutUtil.layout.beginColumn.level) { // in case of first level navigation.
				// Flush messages
				sap.ui.getCore().getMessageManager().removeAllMessages();
			}
			FCLayoutUtil.get().setNavigationLayout(sPath, iLevel, bInPlace);
			fnInternalSetHash(sPath);
		}

		/**
		 * @param {integer} iLevel: provides the iLevel of the current controller. It will navigate one step back from this level. For instance, iLevel === 1, the layout and path will be set for the level 0.
		 * @side-effect: changes the hash to the required level (level 0 == "", level 1 == "/entity". level 2 == "/entity1/entity2". etc..
		 */
		function fnNavigateBack(iLevel) {
			FCLayoutUtil.get().setNavigationBackLayout(iLevel);
			var sHash = HashChanger.getInstance().getHash();
			if (0 !== sHash.indexOf("/")) {
				sHash = "/" + sHash;
			}
			//pop several elements from the hash to adjust the depth level. 
			var aHash = sHash.split("/");
			var iSliceLevel = iLevel - aHash.length;
			sHash = sHash.split("/").slice(0, iSliceLevel).join("/");
			fnInternalSetHash(sHash);
		}

		function fnNavigateToRoot() {
			FCLayoutUtil.get().setLayout(FCLayoutUtil.layout.beginColumn.layout);
			fnInternalSetHash("");
		}

		/** 
		 * Verifies that the given binding path is currently in the Hash path
		 * @return: true is the binding path is in the Hash url, false otherwise.
		 */
		function fnIsBindingPathDisplayed(sBindingPath) {
			var hash = HashChanger.getInstance().getHash();
			if (0 !== hash.indexOf("/")) {
				hash = "/" + hash;
			}
			return -1 !== hash.indexOf(sBindingPath);
		}

		/**
		 * Determine binding path for the given url (usually retrieved through HashChanger.getInstance().getHash().
		 * This is useful to know which is the depth level, or which bindings are required for different FCL columns.
		 *
		 * @param {string} sPath: url
		 * 
		 * @return { depth: integer, paths: array} structure with an integer corresponding to the depth level (starting from 0) and an array of binding paths with heading slash. For example, "/TravelRequests(Pernr='00181086',Tripno='0000019100')/CostAssignments(Pernr='00181086',Tripno='0000019100',Costdistno='002')" would return
		 *	[/TravelRequests(Pernr='00181086',Tripno='0000019100'), /CostAssignments(Pernr='00181086',Tripno='0000019100',Costdistno='002')]		 **/
		function fnDetermineBindingPaths(sPath) {
			if (Utils.isEmptyObjectOrString(sPath)) {
				return {
					depth: 0,
					paths: []
				};
			}
			var aBindings = [];
			if (0 === sPath.indexOf("/")) {
				aBindings = sPath.split("/").slice(1);
			} else {
				aBindings = sPath.split("/");
			}
			aBindings = aBindings.map(function (e) {
				return "/" + e;
			});
			return {
				depth: aBindings.length,
				paths: aBindings
			};
		}

		/**
		 * Wrapper around the inline navigate function which adjust the FCL layout if needed.
		 * It takes the current hash in the URL path to determine the FCL depth needed and triggers an inline navigation on the current url.
		 */
		function fnAdjustLayout() {
			var sHash = HashChanger.getInstance().getHash();
			var oBindingPaths = fnDetermineBindingPaths(sHash);
			var ibindPathDepth = oBindingPaths.depth;
			fnNavigate(sHash, ibindPathDepth, true);
		}

		/**
		 * Depending uri in reponse triggers a navigation is new hash path is different from the current one. 
		 */
		function fnGetNavigationPathFromReponse(oData, oResponse) {
			var sParentPath, sHashPath = HashChanger.getInstance().getHash(),
				sNavPath, sSubPath;
			
			if (0 !== sHashPath.indexOf("/")) {
				sHashPath = "/" + sHashPath;
			}
			if (fnDetermineBindingPaths(sHashPath).depth > 1) {
				sParentPath = fnDetermineBindingPaths(sHashPath).paths.shift();
			} else {
				sParentPath = fnDetermineBindingPaths(sHashPath).paths[0];
			}
			//lookup directly in reply
			if (oResponse && oResponse.headers && oResponse.headers["location"]) {
				sSubPath = oResponse.headers && oResponse.headers["location"] && oResponse.headers["location"].split("/").slice(-1).pop();
				sNavPath = sParentPath + '/' + sSubPath;
			//or in first batch that is (shall be) the function import reply
			} else if (oResponse && oResponse.data && oResponse.data.__batchResponses && oResponse.data.__batchResponses[0]
				&& oResponse.data.__batchResponses[0].__changeResponses && oResponse.data.__batchResponses[0].__changeResponses[0]
				&& oResponse.data.__batchResponses[0].__changeResponses[0].headers && oResponse.data.__batchResponses[0].__changeResponses[0].headers["location"]){
				sSubPath = "/" + oResponse.data.__batchResponses[0].__changeResponses[0].headers["location"].split("/").slice(-1).pop();
				sNavPath = _findAndReplaceOrAppend(sParentPath, sSubPath);
			}
			if (!Utils.isEmptyObjectOrString(sSubPath) && sHashPath !== sNavPath) {
				return {
					navPath: sNavPath,
					subPath: sSubPath
				};
			}
			return {
				subPath: sSubPath,
				navPath: ""
			};
		}

		return {
			bindingPaths: fnDetermineBindingPaths,
			navigate: fnNavigate,
			navigateBack: fnNavigateBack,
			navigateToRoot: fnNavigateToRoot,
			isBindingPathDisplayed: fnIsBindingPathDisplayed,
			adjustLayout: fnAdjustLayout,
			getNavigationPathFromReponse: fnGetNavigationPathFromReponse
		};
	}

	return getMethods();
}, true);

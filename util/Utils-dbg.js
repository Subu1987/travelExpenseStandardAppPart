/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([], function () {
	"use strict";

	var TYPES_UTIL = {
		OBJECT: "object",
		DATE: "date",
		STRING: "string",
		BOOLEAN: "boolean",
		NUMBER: "number"
	};

	function getMethods() {

		function _isObject(obj) {
			return obj && typeof obj === 'object';
		}

		/**
		 * The jQuery isEmptyObject is not consistent across browsers. This ensures that
		 * an empty string is also considered as "empty"
		 * 
		 * @return: true if the plain object or the string is empty. Null, undefined, empty array, number, etc. also return false
		 */
		function fnIsEmptyObjectOrString(value) {
			if ("string" === typeof value) {
				return value.length === 0;
			}
			return jQuery.isEmptyObject(value);
		}

		/**
		 * Check is "DateObject" is empty.
		 * Chekc if value is not a string and not a valid date.
		 * 
		 * @return: true if value is not a string and not a valid date. also return false
		 */
		function fnIsEmptyDateOrString(value) {
			if ("string" === typeof value) {
				return value.length === 0;
			}
			return !value || (typeof value.getTime !== "function" || !(value.getTime() > 0));
		}

		function fnGetPropertyOrSubPropery(obj, property) {
			if (obj && typeof obj === 'object') {
				if (obj.hasOwnProperty(property)) {
					return obj[property];
				} else {
					for (var prop in obj) {
						return fnGetPropertyOrSubPropery(obj[prop], property);
					}
				}
			}
			return undefined;
		}

		/**
		 * Check if a list of objects is from one the type provided in parameter
		 * If no types speficied checking into the default type list.
		 **/
		function fnIsOfTypes(aObjs, aTypes) {
			var bResult = false;
			if (aObjs) {
				aObjs.forEach(function (obj) {
					bResult = bResult || _fnIsOfTypes(obj, aTypes);
				});
			}
			return bResult;
		};

		/**
		 * Check if an object is from one the type provided in parameter
		 * If no types speficied checking into the default type list.
		 **/
		function _fnIsOfTypes(obj, aTypes) {
			var bResult = false;
			if (aTypes && aTypes.length > 0) {
				// check if type of obj is one of specified in parameter
				aTypes.forEach(function (type) {
					if (_fnIsObjectDate(obj) || _fnIsObjectTime(obj)) {
						bResult = bResult || type === TYPES_UTIL.DATE;
					} else {
						bResult = bResult || typeof obj === type;
					}
				});
			} else {
				// check if type of obj is one of default list
				for (var type in TYPES_UTIL) {
					if (_fnIsObjectDate(obj) || _fnIsObjectTime(obj)) {
						bResult = bResult || type === TYPES_UTIL.DATE;
					} else {
						bResult = bResult || typeof obj === TYPES_UTIL[type];
					}
				}
			}
			return bResult;
		};

		function _fnIsObjectDate(obj) {
			return obj && typeof obj.getMonth === 'function';
		}

		function _fnIsObjectTime(obj) {
			return obj && obj.hasOwnProperty("ms");
		}

		/**
		 * Retrun a list of origin's object property names of all property when value is different in target object.
		 **/
		function fnGetObjectChanges(origin, target, aObjectChanges) {
			for (var property in origin) {
				if (fnIsOfTypes([origin[property]], [TYPES_UTIL.STRING, TYPES_UTIL.BOOLEAN, TYPES_UTIL.DATE, TYPES_UTIL.NUMBER])) {
					if (target.hasOwnProperty(property)) {
						if (_fnIsObjectDate(origin[property])) {
							if (origin[property].getTime() !== target[property].getTime()) {
								aObjectChanges.push(property);
							}
						} else if (_fnIsObjectTime(origin[property])) {
							if (origin[property].ms !== target[property].ms) {
								aObjectChanges.push(property);
							}
						} else if (origin[property] !== target[property]) {
							aObjectChanges.push(property);
						}
					}
				}
			}
		}

		/**
		 * Determines if on of the emement contained in aArray is one of the element from aObjs
		 **/
		function fnIncludes(aArray, aObjs) {
			var i = aArray.length;
			while (i--) {
				if (Array.isArray(aObjs)) {
					var j = aObjs.length;
					while (j--) {
						if (aArray[i] === aObjs[j]) {
							return true;
						}
					}
				} else if (aArray[i] === aObjs) {
					return true;
				}
			}
			return false;
		}

		return {
			TypesUtil: TYPES_UTIL,
			isEmptyObjectOrString: fnIsEmptyObjectOrString,
			isEmptyDateOrString: fnIsEmptyDateOrString,
			getPropertyOrSubPropery: fnGetPropertyOrSubPropery,
			isOfTypes: fnIsOfTypes,
			getObjectChanges: fnGetObjectChanges,
			includes: fnIncludes
		};
	}

	return getMethods();
}, true);

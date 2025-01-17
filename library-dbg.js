/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
/**
 * Initialization Code and shared classes of library sap.fin.travel.lib.reuse.
 */
sap.ui.define(["jquery.sap.global",
		"sap/ui/core/library",
		"sap/ui/core/IconPool"
	], // library dependency
	function (jQuery, library, iconPool) {

		"use strict";

		/**
		 * Reuse components for Travel apps
		 *
		 * @namespace
		 * @name sap.fin.travel.lib.reuse
		 * @author SAP SE
		 * @version 2.0.49
		 * @public
		 */

		// delegate further initialization of this library to the Core
		sap.ui.getCore().initLibrary({
			name: "sap.fin.travel.lib.reuse",
			version: "2.0.49",
			dependencies: ["sap.ui.core"],
			types: [],
			interfaces: [],
			controls: [
				"sap.fin.travel.lib.reuse.controls.Attachments",
				"sap.fin.travel.lib.reuse.controls.UploadCollectionExtension",
				"sap.fin.travel.lib.reuse.util.formatters"
			],
			elements: []
		});

		// Add library CSS
		this.sStyleSheetId = "TravelLibReuseStyleSheet";
		jQuery.sap.includeStyleSheet(jQuery.sap.getModulePath("sap.fin.travel.lib.reuse.css.travellibreuse", ".css"), this.sStyleSheetId);

		// Add custom icons for attachments
		iconPool.addIcon("custom-add-attachment", "customIcons", "custom-icons", "0061");
		iconPool.addIcon("custom-add-link", "customIcons", "custom-icons", "0062");
		iconPool.addIcon("custom-add-note", "customIcons", "custom-icons", "0063");

		//Polyfill for compatibility cross-browsers
		if (!String.prototype.startsWith) {
			Object.defineProperty(String.prototype, 'startsWith', {
				value: function (search, pos) {
					return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
				}
			});
		}

		//Polyfill for compatibility cross-browsers
		if (!String.prototype.endsWith) {
			String.prototype.endsWith = function (search, this_len) {
				if (this_len === undefined || this_len > this.length) {
					this_len = this.length;
				}
				return this.substring(this_len - search.length, this_len) === search;
			};
		}

		//Polyfill for compatibility cross-browsers
		// Production steps of ECMA-262, Edition 6, 22.1.2.1
		if (!Array.from) {
			Array.from = (function () {
				var toStr = Object.prototype.toString;
				var isCallable = function (fn) {
					return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
				};
				var toInteger = function (value) {
					var number = Number(value);
					if (isNaN(number)) {
						return 0;
					}
					if (number === 0 || !isFinite(number)) {
						return number;
					}
					return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
				};
				var maxSafeInteger = Math.pow(2, 53) - 1;
				var toLength = function (value) {
					var len = toInteger(value);
					return Math.min(Math.max(len, 0), maxSafeInteger);
				};

				// The length property of the from method is 1.
				return function from(arrayLike /*, mapFn, thisArg */ ) {
					// 1. Let C be the this value.
					var C = this;

					// 2. Let items be ToObject(arrayLike).
					var items = Object(arrayLike);

					// 3. ReturnIfAbrupt(items).
					if (arrayLike == null) {
						throw new TypeError('Array.from requires an array-like object - not null or undefined');
					}

					// 4. If mapfn is undefined, then let mapping be false.
					var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
					var T;
					if (typeof mapFn !== 'undefined') {
						// 5. else
						// 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
						if (!isCallable(mapFn)) {
							throw new TypeError('Array.from: when provided, the second argument must be a function');
						}

						// 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
						if (arguments.length > 2) {
							T = arguments[2];
						}
					}

					// 10. Let lenValue be Get(items, "length").
					// 11. Let len be ToLength(lenValue).
					var len = toLength(items.length);

					// 13. If IsConstructor(C) is true, then
					// 13. a. Let A be the result of calling the [[Construct]] internal method
					// of C with an argument list containing the single item len.
					// 14. a. Else, Let A be ArrayCreate(len).
					var A = isCallable(C) ? Object(new C(len)) : new Array(len);

					// 16. Let k be 0.
					var k = 0;
					// 17. Repeat, while k < len (also steps a - h)
					var kValue;
					while (k < len) {
						kValue = items[k];
						if (mapFn) {
							A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
						} else {
							A[k] = kValue;
						}
						k += 1;
					}
					// 18. Let putStatus be Put(A, "length", len, true).
					A.length = len;
					// 20. Return A.
					return A;
				};
			}());
		}

		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
		if (!Array.prototype.find) {
			Object.defineProperty(Array.prototype, 'find', {
				value: function (predicate) {
					// 1. Let O be ? ToObject(this value).
					if (this == null) {
						throw new TypeError('"this" is null or not defined');
					}

					var o = Object(this);

					// 2. Let len be ? ToLength(? Get(O, "length")).
					var len = o.length >>> 0;

					// 3. If IsCallable(predicate) is false, throw a TypeError exception.
					if (typeof predicate !== 'function') {
						throw new TypeError('predicate must be a function');
					}

					// 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
					var thisArg = arguments[1];

					// 5. Let k be 0.
					var k = 0;

					// 6. Repeat, while k < len
					while (k < len) {
						// a. Let Pk be ! ToString(k).
						// b. Let kValue be ? Get(O, Pk).
						// c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
						// d. If testResult is true, return kValue.
						var kValue = o[k];
						if (predicate.call(thisArg, kValue, k, o)) {
							return kValue;
						}
						// e. Increase k by 1.
						k++;
					}

					// 7. Return undefined.
					return undefined;
				},
				configurable: true,
				writable: true
			});
		}

		return sap.fin.travel.lib.reuse;

	}, /* bExport= */ false);

/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define([
	"sap/ui/model/Context"
], function(Context) {
	"use strict";

	var _oInstance;

	function createInstance(oAppComponent) {

		var mPaginator = new Map();

		/**
		 * Get the binding with the given index if exists
		 * @param oPaginator map of binding.
		 * @param idx index.
		 * @retruns the binding with the given index if exists.
		 **/
		function fnGetById(oPaginator, idx) {
			if (oPaginator && oPaginator.has(idx)) {
				return oPaginator.get(idx);
			}
			throw new Error("No entry found for index " + idx + " in Paginator map");
		}

		/** 
		 * Get the index the corresponding binding.
		 * @param iViewLevel view level.
		 * @param sBindingPath binding to found
		 * @returns the index the corresponding binding.
		 */
		function fnGetEntryIndex(iViewLevel, sBindingPath) {
			if (mPaginator.has(iViewLevel)) {
				var oPaginator = mPaginator.get(iViewLevel);
				var idx = 1;
				while (idx < oPaginator.size && fnGetById(oPaginator, idx) !== sBindingPath) {
					idx++;
				}
				return idx;
			}
			throw new Error("No entry found for view level " + iViewLevel + " in Paginator map");
		}

		/** 
		 * Determines if the given binding of the view level has a previous entry.
		 * @param iViewLevel view level.
		 * @param sBindingPath binding to found.
		 * @returns <code>true</code> if the given binding of the view level has a previous entry. Otherwise returns <code>false</code>.
		 */
		function fnHasPrevEntry(iViewLevel, sBindingPath) {
			return fnGetEntryIndex(iViewLevel, sBindingPath) > 1;
		}

		/** 
		 * Determines if the given binding of the view level has a next entry.
		 * @param iViewLevel view level.
		 * @param sBindingPath binding to found.
		 * @returns <code>true</code> if the given binding of the view level has a next entry. Otherwise returns <code>false</code>.
		 */
		function fnHasNextEntry(iViewLevel, sBindingPath) {
			return fnGetEntryIndex(iViewLevel, sBindingPath) < mPaginator.get(iViewLevel).size;
		}

		/** 
		 * Get the next entry of a given binding.
		 * @param iViewLevel view level.
		 * @param sBindingPath binding to found.
		 * @returns the next entry of a given binding.
		 */
		function fnGetNextEntry(iViewLevel, sBindingPath) {
			if (fnHasNextEntry(iViewLevel, sBindingPath)) {
				var oPaginator = mPaginator.get(iViewLevel);
				return fnGetById(oPaginator, fnGetEntryIndex(iViewLevel, sBindingPath) + 1);
			}
			throw new Error("No next entry found for view level " + iViewLevel + "and binding path " + sBindingPath + " in Paginator map");
		}

		/** 
		 * Get the previous entry of a given binding.
		 * @param iViewLevel view level.
		 * @param sBindingPath binding to found.
		 * @returns the previous entry of a given binding.
		 */
		function fnGetPrevEntry(iViewLevel, sBindingPath) {
			if (fnHasPrevEntry(iViewLevel, sBindingPath)) {
				var oPaginator = mPaginator.get(iViewLevel);
				return fnGetById(oPaginator, fnGetEntryIndex(iViewLevel, sBindingPath) - 1);
			}
			throw new Error("No previous entry found for view level " + iViewLevel + "and binding path " + sBindingPath + " in Paginator map");
		}

		/** 
		 * Create a binding Map based on the given binding list
		 * @param aBingingPath binding array
		 * @returns a binding Map based on the given binding list
		 */
		function fnCreateEntryForBindingPath(aBingingPath) {
			var mBindingPath = new Map();
			var idx = 1;
			aBingingPath.forEach(function(sBindingPath) {
				mBindingPath.set(idx++, "/" + sBindingPath);
			});
			return mBindingPath;
		}

		/** 
		 * Update the paginator property of the global model based on the given binding.
		 * @param iViewLevel view level.
		 * @param sBindingPath binding path.
		 */
		function fnUpdatePaginatorModel(iViewLevel, sBindingPath) {
			oAppComponent.updateGlobalModel("/paginator/navUpEnabled", fnHasPrevEntry(iViewLevel, sBindingPath));
			oAppComponent.updateGlobalModel("/paginator/navDownEnabled", fnHasNextEntry(iViewLevel, sBindingPath));
		}

		/** 
		 * Update the view level map of binding if the binding list is provided. Create a new one if not already defined.
		 * Update the global model.
		 * @param iViewLevel view level
		 * @param sBindingPath binding path.
		 * @param aBingingPath binding array
		 */
		function fnUpdateEntry(iViewLevel, sBindingPath, aBingingPath) {
			if (aBingingPath) {
				if (mPaginator.has(iViewLevel)) {
					mPaginator.delete(iViewLevel);
				}
				mPaginator.set(iViewLevel, fnCreateEntryForBindingPath(aBingingPath));
			}
			fnUpdatePaginatorModel(iViewLevel, sBindingPath);
		}

		return {
			// methods
			hasNextEntry: fnHasNextEntry,
			hasPrevEntry: fnHasPrevEntry,
			getNextEntry: fnGetNextEntry,
			getPrevEntry: fnGetPrevEntry,
			updatePaginatorModel: fnUpdatePaginatorModel,
			updateEntry: fnUpdateEntry
		};
	}

	return {
		get: function() {
			if (!_oInstance) {
				throw new Error("Paginator has not been initialized yet.");
			}
			return _oInstance;
		},

		/*
		 * One and only one instance shall be created.
		 */
		init: function(oAppComponent) {
			if (_oInstance){
				this.destroy();
			}
			_oInstance = createInstance(oAppComponent);
		},
		
		destroy: function(){
			_oInstance = null;
		}

	};
}, true);

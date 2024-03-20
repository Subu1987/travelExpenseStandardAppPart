/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
sap.ui.define(['sap/uxap/BlockBase'],
	function (BlockBase) {
		"use strict";

		var DummyBlock = BlockBase.extend("sap.fin.travel.lib.reuse.view.fragments.DummyBlock", {
			metadata: {
				views: {
					Collapsed: {
						viewName: "sap.fin.travel.lib.reuse.view.fragments.DummyBlock",
						type: "XML"
					},
					Expanded: {
						viewName: "sap.fin.travel.lib.reuse.view.fragments.DummyBlock",
						type: "XML"
					}
				}
			}.fragments
		});

		return DummyBlock;

	});

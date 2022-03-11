/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis = function() {
	let vis = {};

	vis.color = d3.schemeSet1;

	vis.font_family = 'sans-serif'

	// replace this domain address by your own port, or server address
	vis.domain = "http://localhost:7070/";

	vis.pred_err_color = ['#9ecae1', '#de2d26'];
	vis.shap_color = ['#cbd5e8', '#dfc27d'];

	vis.projectColor = {
		"unselected": "rgba(128, 128, 128, .1)",
		"right": vis.pred_err_color[0],
		"error": '#fbb4ae',
	}

	vis.err_bar_color = '#d73027';

	vis.data_name = "";

	// rule type
	vis.BINARY = "BINARY";
	vis.NUMERIC = "NUMERIC";
	vis.CONCEPT = "CONCEPT";
	vis.rule_type = vis.BINARY;
	vis.rule_add_type = vis.BINARY;

	// document types
	vis.QA = "QA";
	vis.INFERENCE = "INFERENCE";
	vis.REVIEW = "REVIEW";
	vis.SENTIMENT = "SENTIMENT";

	vis.doc_types = {
		"twitter": vis.SENTIMENT,
		"mnligovernment": vis.INFERENCE,
	};

    vis.val_des = ['Low', 'Medium', 'High'];
    vis.des2val = {
    	'l': 0, 'm': 1, 'h': 2,
    }

	vis.inference_label = {
		"mnli_government_travel": ["entailment", "neutral", "contradiction"],
	};

	vis.model_accuracy = {
		"twitter": 0.72,
		"mnli_government_travel": 0.72,
	};
	vis.doc_size = {
		"twitter": 12284,
		"mnli_government_travel": 1945,
	},
	vis.model_name = {
		"twitter": "twitter-roberta-base-sentiment",
		"mnli_government_travel": "DistilBERT",
	};

	vis.hfeat_range = ['Low', 'Medium', 'High'];
	vis.hfeat = ['ADJ', 'ADV', 'NOUN', 'PRON', 'NUM', 'doc_len', 'pred', 'label', 'overlap'];

	vis.sentiment_label = ["negative", "neutral", "positive"];
	vis.sig_test = {"pval": "pval", "95ci": "95ci"};

	return vis;
}();
/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


let default_data, default_surrogate, default_threshold, doc_type;
let data_name, dataset;

let statView = vis.statView();
let docView = vis.docView();
let ruleView = vis.ruleView();
let exploreView = vis.exploreView();
let errcorView = vis.errcorView();
let projectionView = vis.projectionView();
let conceptView = vis.conceptView();

let filter_threshold = {
    "support": 20,
    "fidelity": .9,
    "num_feat": 3,
    "num_bin": 3,
};

document.addEventListener("DOMContentLoaded", function(){
  // Handler when the DOM is fully loaded
  main();

  // bind listeners across views
  wire_events();
});

function main() {
    default_data = "twitter_binary";
    // default_data = "mnlitravel_binary";
    ruleView.render_rule_header();

    d3.select('#data_select')
        .on("change", function() {
            clear();
            dataset = this.value;
            loadData();
        });

    d3.select('#rule_level')
        .on("change", function() {
            clear();
        });

    d3.select('#sig_select')
        .on("change", function() {
            sig_test = this.value;
            ruleView.sig_test(sig_test).update_err_rate();
        })

    // initialize explore view
    exploreView.container().initialize();

    dataset = default_data;
    loadData();
}


function loadData() {
    let data = dataset.split('_')[0];
    doc_type = vis.doc_types[data];
    data_name = data;
    vis.data_name = data_name;
    vis.doc_type = doc_type;
    let rule_position = data;
    if (vis.rule_type == vis.NUMERIC) {
        rule_position += "_hfeat";
    } else rule_position += "_binary"

    d3.queue()
      .defer(d3.json, `data/${data}_binary/list.json`) // vals[0], the binary rule (based on tokens)
      .defer(d3.json, `data/${data}_binary/test.json`) // 1, tokens
      .defer(d3.json, `data/${data}/doc.jsonl`) // 2, the actual document file
      .defer(d3.csv, `data/${data}/model_output.csv`) //3, model output: predictions and ground truth
      .defer(d3.json, `data/${data}/model_stat.json`) // 4, statistics for overall stat. view
      .defer(d3.csv, `data/${data}/hfeat_stat.csv`) // 5, extracted high-level feature values
      .defer(d3.json, `data/${data}_hfeat/list.json`) // 6, rules based on high-level features
      .defer(d3.json, `data/${data}_hfeat/test.json`) // 7, features used as high-level features, and thresholds for low/medium/high values
      .defer(d3.csv, `data/${data}/sentence_tsne.csv`) // 8, 2d positions for document embeddings
      .await(render);
}

function render(err, ...vals){
    if (err) {
        return console.error(err);
    }

    // render top tokens/features
    errcorView.container(d3.select('#errcorView'))
        .token(vals[0], vals[1])
        .hfeat(vals[6], vals[7], doc_type)
        .render();

    // render projection
    projectionView.container(d3.select('#projectionView'))
        .make_legend()
        .position(vals[8])
        .model_output(vals[3])
        .render()

    // rendering rule list
    ruleView.container(d3.select('#ruleView')).data(vals[0]).attrs(vals[1])
        .update_binary()
        .render_err_histogram()
        .render_list();

    docView.container(d3.select('#doc_div')).data(vals[0])
        .docs(vals[2]['content']).model_output(vals[3]).doc_type(doc_type)
        .initialize(vis.doc_types[data_name]);

    // rendering model statistics
    statView.container(d3.select("#model_stat")).data(vals[4])
        .data_name(data_name).doc_type(doc_type)
        .clear().make_legend().draw();   

    // initialize concept div
    conceptView.container(d3.select("#conceptView"))
        .base_err_rate(1-vis.model_accuracy[data_name])
        .initialize();
}

function wire_events() {
    ruleView.dispatch.on("rule_select", function(rule_idx) {
        console.log("select rule");

        // update single rule inspection
        let processed_rule = ruleView.get_processd_rule_content(rule_idx);
       
        let updated_rule = {
            "rules": processed_rule,
            "data_name": data_name,
            "key_list": statView.key_list(),
            "error_only": 0,
        }

        postData("inspect_rule/", JSON.stringify(updated_rule), (res) => {
            // update rule details
            exploreView.data(res['path_info']).rule_content(processed_rule)
                .update_conditions()
                .update_hint(res['hint'])
                .render_condition_path();

            docView.processed_rule(processed_rule).clear()
                .shap_vals(res['top_token_list'])
                .render_shap_bars()
                .update_rule_collection(res['doc_list'], rule_idx);
            
            statView.container(d3.select("#select_stat"), rule_idx).data(res['stat']).draw();

            if ('train_stat' in res) {
                statView.container(d3.select("#select_stat")).train_data(res['train_stat']).draw_train_stat();
            }

            projectionView.highlight_subpopulation(res['doc_list'], rule_idx);
        })
    })

    exploreView.dispatch.on("rule_inspect", function(rule_content) {
        // update rule content
        let updated_rule = {
            "rules": conceptView.change_concept_to_token_list(rule_content).filter(Boolean),
            "data_name": data_name,
            "key_list": statView.key_list(),
            "error_only": 0,
        }

        console.log(updated_rule['rules']);

        postData("inspect_rule/", JSON.stringify(updated_rule), (res) => {
            // remove rule selection highlight
            ruleView.clear();

            // update rule details
            exploreView.data(res['path_info'])
                .rule_content(updated_rule["rules"])
                .update_conditions()
                .update_hint(res['hint'])
                .render_condition_path();

            // update document collection
            docView.processed_rule(updated_rule['rules']).clear()
                .shap_vals(res['top_token_list'])
                .render_shap_bars()
                .update_rule_collection(res['doc_list']);
            
            statView.container(d3.select("#select_stat"), "edited").data(res['stat']).draw();
            if ('train_stat' in res) {
                statView.container(d3.select("#select_stat")).train_data(res['train_stat']).draw_train_stat();
            }

            projectionView.highlight_subpopulation(res['doc_list']);
        })
    })

    ruleView.dispatch.on("rule_unselect", function() {
        exploreView.clear();
        docView.clear();
        projectionView.render();

    })

    conceptView.dispatch.on("concept_update", function(cid) {
        let concept = {
            "concept": conceptView.get_concept(cid),
            "data_name": data_name,
        }
        postData("update_concept", JSON.stringify(concept), (res) => {
            conceptView.update_summary(res, cid);
        });
        if (conceptView.get_concept_num() > 0) {
            d3.select('#add_concept_btn')
                .attr('disabled', null);
        }
    });
}

function clear() {
    statView.clear();
}

function clickTab(evt, viewName) {
    // Declare all variables
    let i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = d3.select("#playView").selectAll(".tabcontent")._groups[0];
    for (i = 0; i < tabcontent.length; i++) {
        d3.select(tabcontent[i]).style("display", "none");
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = d3.select("#playView").selectAll(".tablinks")._groups[0];
    for (i = 0; i < tablinks.length; i++) {
        d3.select(tablinks[i]).classed("active", false);
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    d3.select(`#${viewName}`).style("display", "block");
    evt.currentTarget.className += " active";
}

function clickStatTab(evt, viewName) {
    // Declare all variables
    let i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = d3.select("#statView").selectAll(".tabcontent")._groups[0];
    for (i = 0; i < tabcontent.length; i++) {
        d3.select(tabcontent[i]).style("display", "none");
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = d3.select("#statView").selectAll(".tablinks")._groups[0];
    for (i = 0; i < tablinks.length; i++) {
        d3.select(tablinks[i]).classed("active", false);
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    d3.select(`#${viewName}`).style("display", "block");
    evt.currentTarget.className += " active";
}

function click_setting() {
    d3.select("#myModel")
        .style("display", "block");
}

function click_cancel(id) {
    d3.select(id)
        .style("display", "none");
}

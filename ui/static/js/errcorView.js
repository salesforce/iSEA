/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.errcorView = function () {
	let errcorView = {},
        words = [],
        labels = [],
        width = 350,
        height = 140,
        margin = 10,
        token_svg = d3.select('#token_list'),
        hfeat_svg = d3.select("#hfeat_list"),
        top_token_list,
        top_hfeat_list,
        top_k = 5,
        pred_des = [],
        line_height = 20,
        rect_height = 15,
        indent = 5,
        font_size;


    //=======================
    // Public Functions
    //=======================

    errcorView.token = function(list, test) {
        top_token_list = [];
        attrs = test['good_cols'];
        list['top_list'].forEach(item => {
            top_token_list.push(
                {
                    "feature": attrs[item['feature']],
                    "err_rate": item['err_rate'],
                }
            )
        })

        return errcorView;
    }

    errcorView.hfeat = function(list, test, data_type) {
        top_hfeat_list = [];
        attrs = test['columns'];

        if (data_type == vis.QA) {
            pred_des = (x) => vis.boolq_label[x];
        } else if (data_type == vis.SENTIMENT) {
            pred_des = (x) => vis.sentiment_label[x];
        } else if (data_type == vis.INFERENCE) {
            pred_des = (x) => vis.inference_label[data_name][x];
        } else {
            pred_des = (x) => x;
        }

        list['top_list'].forEach(item => {
            let name = attrs[item['feature']];

            top_hfeat_list.push(
                {
                    "feature": name,
                    "val": name == "pred" ? pred_des(item['val']) : vis.val_des[item['val']],
                    "err_rate": item['err_rate'],
                }
            )
        })
        
        return errcorView;
    }

    errcorView.container = function(_) {
        
        return errcorView;
    }

  
    errcorView.render = function() {
        d3.select('#dataname')
            .html(data_name);

        d3.select('#modelname')
            .html(vis.model_name[data_name]);

        d3.select('#acctext')
            .html(`${(vis.model_accuracy[data_name]*100).toFixed(1)}%`);

        d3.select('#errtext')
            .html(`${(100-vis.model_accuracy[data_name]*100).toFixed(1)}%`);

        d3.select('#datasize')
            .html(vis.doc_size[data_name]);

        render_err_list(token_svg, top_token_list, false);
        render_err_list(hfeat_svg, top_hfeat_list, true);
        return errcorView;
    }

    //=======================
    // Private Functions
    //=======================
    function render_err_list(err_div, err_list, show_val) {
        err_svg = err_div.select('svg');
        err_svg.selectAll("*").remove();


        err_div.style("height", `${err_list.length * line_height}px`);

        err_svg.attr("width", width+"px")
            .attr("height", `${err_list.length * line_height}px`);

        err_group = err_svg.selectAll('g')
            .data(err_list)
            .enter()
            .append("text")
            .attr("x", 15)
            .attr("y", (d, i) => `${i * line_height + 5}px`)
            .attr("text-anchor", "start")
            .attr("dy", ".5em")
            .text(d => {
                let str = d['feature'];
                if (show_val) {
                    str += "=" + d['val'];
                }
                str += `, err_rate: ${(d['err_rate']*100).toFixed(2)}%`;
                return str;
            });
    }

    return errcorView;
}
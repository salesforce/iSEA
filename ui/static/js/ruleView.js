/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.ruleView = function () {
    let ruleView = {},
        container = null,
        list_svg,
        size = [250, 80],
        indent = 30,
        order = undefined,
        attrs,
        mrs_coverage,
        text_rules,
        real_percentile,
        node_data,
        lattice,
        binary = true,
        clicked = -1,
        histogram,
        row_height = 30,
        target_names,
        err_bar_width = 115,
        err_bar_height = 15,
        xScale = d3.scaleLinear().range([0, err_bar_width]).domain([0, 1]),
        hist_width = 100,
        hist_height = 25,
        hist_x,
        hist_y,
        to_print,
        err_rate_threshold = 0,
        show_count = 0,
        rule_order,
        pval_threshold = 0.05,
        rule_all = -1,
        sig_test = vis.sig_test['pval'],
        margin = 0;


    //=======================
    // Public Functions
    //=======================        
    ruleView.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        list_svg = _.select('#rule_list');

        return ruleView;
    };

    ruleView.data = function (_) {
        target_names = _['target_names'];
        histogram = _['histogram'];
        hist_y = d3.scaleLinear().domain([0, d3.max(histogram)]).range([0, hist_height]);
        hist_x = d3.scaleBand().domain(d3.range(0, histogram.length)).range([0, hist_width]);


        // ruleSet = _['rule_lists'].filter(rule => rule['p_one'] <= pval_threshold);
        ruleSet = _['rule_lists'];
        reset();
        return ruleView;
    };

    ruleView.sig_test = function(_) {
        sig_test = _;
        return ruleView;
    }

    ruleView.attrs = function (_) {
        if (!arguments.length) return attrs;
        if (vis.rule_type == vis.BINARY){
            attrs = _['good_cols'];
        } else if (vis.rule_type == vis.NUMERIC){
            attrs = _['columns'];
        } else if (vis.rule_type == vis.CONCEPT) {
            attrs = _['columns'];
        }

        return ruleView;
    }

    ruleView.update_binary = function () {
        if (vis.rule_type == vis.BINARY) {
            binary = true;
        } else {
            binary = false;
        }
        return ruleView;
    }

    ruleView.get_doc_list = function(rule_idx) {
        return ruleSet[rule_idx]['doc_idx'];
    }

    ruleView.get_processd_rule_content = function(rule_idx) {
        let rules = [];

        ruleSet[rule_idx]['rules'].forEach((cond) => {
            let processed = {
                'feature': attrs[cond['feature']],
                'sign': cond['sign'],
            }
            if (vis.rule_type !== vis.BINARY) {
                processed['val'] = cond['val'];
            } else {
                processed['threshold'] = 0.5;

            }
            rules.push(processed)
        })
        return rules;
    }

    ruleView.render_err_histogram = function() {
        let err_svg = d3.select('#rule_error_hist')
            .attr('width', hist_width)
            .attr('height', hist_height);

        let bar_width = hist_x.bandwidth();

        d3.select("#err_select_rule")
            .html(ruleSet.length);
        show_count = ruleSet.length;

        err_svg.selectAll('.err_hist_bar')
            .data(histogram)
            .enter()
            .append('rect')
            .attr('class', 'err_hist_bar')
            .attr('fill', '#fbb4ae')
            .attr('stroke', 'black')
            .attr('x', (d,i) => hist_x(i))
            .attr('y', d => hist_height - hist_y(d))
            .attr('height', d => hist_y(d))
            .attr('width', bar_width);

        d3.select('#err_range')
            .on("input", function() {
                d3.select("#err_select_num")
                    .html(`${this.value}﹪:&nbsp`);

                let count = 0;
                err_rate_threshold = this.value / 100;
                ruleSet.forEach(rule => {
                    if (rule['err_rate'] >= err_rate_threshold) {
                        count++;
                    }
                })
                show_count = count;
                d3.select("#err_select_rule")
                    .html(count);
            }).on("change", function() {
                ruleView.render_list();
            });

        d3.select("#rule_order")
            .on("change", function() {
                rule_order = this.value;
                ruleView.render_list();
            });

        d3.select("#rule_len")
            .on("change", function() {
                rule_len = +this.value;
                ruleView.render_list();
            })

        return ruleView;
    }

    ruleView.update_err_rate = function() {
        // update rule list header
        d3.select('#rule_list_header')
            .select('.err_rate_head')
            .text(`err_rate (${sig_test == "pval" ? "pval" : "95﹪ CI"})`)

        // update bars in rule list
        to_print.forEach((rules, ix) => {
            if (rules['err_rate'] < err_rate_threshold) return; 
        
            if (rules['rules'].length !== rule_len && rule_len > 0) return;

            rule_line = d3.select(`#rule-${ix}`);

            let sig_val = rules['p_one'].toFixed(2);
            if (sig_test !== 'pval') {
                sig_val = `${(rules['ci'][0]*100).toFixed(0)}﹪-${(rules['ci'][1]*100).toFixed(0)}﹪`
            }

            rule_line.select('.err_rate_txt')
                .text(`${(rules['err_rate']*100).toFixed(0)}﹪(${sig_val})`)
        });
    }

    ruleView.render_rule_header = function() {
        let y_offset = 0,
            x_offset = 60;

        let g = d3.select("#rule_list_header")
            .attr("width", 800)
            .append("g")
                .attr("class", "list")
                .attr('transform', `translate(20, 10)`)
                .attr('height', `${row_height+10}px`);

        
        // numbering
        let rule_line = g.append('g')
            .attr('class', 'rule_line')

        rule_line.append("text")
            .attr("x", 0)
            .attr("y", y_offset)
            .style("font-weight", "medium")
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .style("stroke-width", "1px")
            .text("RID");

        // render error 
        rule_line.append("rect")
            .attr("x", indent + 10)
            .attr("y", y_offset - err_bar_height/2)
            .attr("width", err_bar_width)
            .attr("height", err_bar_height)
            .attr('class', 'err_bar')
            .attr("fill", "none")
            .attr("stroke", "black");

        rule_line.append("rect")
            .attr("x", indent + 10)
            .attr("y", y_offset - err_bar_height/2)
            .attr("width", xScale.range()[1]/2)
            .attr("height", err_bar_height)
            .attr('class', 'err_bar')
            .attr("fill", "#fbb4ae")
            // .attr("fill", "lightgrey")
            .attr("stroke", "none");

        rule_line.append('text')
            .attr("x", indent + err_bar_width)
            .attr("y", y_offset)
            .attr("class", "err_rate_head")
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(`err_rate (${sig_test=='pval'?'pval' : '95﹪ CI'}) `)

        x_offset = indent + err_bar_width + 15;

        // support
        rule_line.append("text")
            .attr("x", x_offset)
            .attr("y", y_offset)
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .text(`support`)
        x_offset += 60;

        // rule list
        rule_line.append("text")
            .attr("x", x_offset)
            .attr("y", y_offset)
            .attr("fill", "black")
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .style("font-weight", "bold")
            .text("Rule (Descriptions of Error Subpopulation)");

        // divider
        rule_line.append("line")
            .attr("x", x_offset)
            .attr("y", y_offset)
            .attr("fill", "black")
            .attr("width", 500)
    }
 
    ruleView.render_list = function() {
        let y_offset = 0,
            x_offset = 60;
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");

        let rule_offset = 0;
        let font_size;

        clicked = -1;

        list_svg.attr('height', `${row_height * show_count}px`)
            .select("g").remove();

        let g = list_svg.append("g")
            .attr("class", "list")
            .attr('transform', `translate(20, 10)`)
            .attr('height', `${row_height * show_count}px`);

        font_size = 14;
        font = font_size + "px " + vis.font_family;
        ctx.font = font;

        // show the rule lists
        let longest_rule = 0;
        to_print = [];

        // reorder rules
        to_print = ruleSet;
        if (rule_order == 'error'){
            to_print.sort((a, b) => {
                return b['err_rate'] - a['err_rate'];
            }) 
        } else if (rule_order == 'support') {
            to_print.sort((a, b) => {
                return b['doc_idx'].length - a['doc_idx'].length;
            }) 
        } else if (rule_order == "test_error") {
            to_print.sort((a, b) => {
                return b['err_rate_test'] - a['err_rate_test'];
            }) 
        } else if (rule_order == "pval") {
             to_print.sort((a, b) => {
                if (Math.abs(a['p_one'] - b['p_one'])<1e-4) {
                    return b['err_rate'] - a['err_rate'];
                }
                return a['p_one'] - b['p_one'];
            }) 
        }

        let rule_count = 0, base_rate = 1-vis.model_accuracy[vis.data_name];
        to_print.forEach((rules, ix) => {
            if (rules['err_rate'] < err_rate_threshold) return; 
            rule_count++;
            if (rules['rules'].length !== rule_len && rule_len > 0) return;

            // numbering
            let rule_line = g.append('g')
                .attr('class', 'rule_line')
                .attr('id', `rule-${ix}`);

            rule_line.append('rect')
                .attr('x', indent)
                .attr('y', y_offset-row_height/2)
                .attr('height', row_height * .8)
                .attr("id", `rule_back-${ix}`)
                .attr('class', 'rule_back')

            rule_line.append("text")
                .attr("x", 0)
                .attr("y", y_offset)
                .style("font-weight", "medium")
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                .style("stroke-width", "1px")
                .text("R"+(ix+1));

            // render error 
            rule_line.append("rect")
                .attr("x", indent + 10)
                .attr("y", y_offset - err_bar_height/2)
                .attr("width", err_bar_width)
                .attr("height", err_bar_height)
                .attr('class', 'err_bar')
                .attr("fill", "white")
                .attr("stroke", "black");

            rule_line.append("rect")
                .attr("x", indent + 10)
                .attr("y", y_offset - err_bar_height/2)
                .attr("width", xScale(rules['err_rate']))
                .attr("height", err_bar_height)
                .attr('class', 'err_bar')
                .attr("fill", "#fbb4ae")
                // .attr("fill", "lightgrey")
                .attr("stroke", "none");

            let sig_val = rules['p_one'].toFixed(2);
            if (sig_test !== 'pval') {
                sig_val = `${(rules['ci'][0]*100).toFixed(0)}﹪-${(rules['ci'][1]*100).toFixed(0)}﹪`
            }

            rule_line.append('text')
                .attr("x", indent + err_bar_width)
                .attr("y", y_offset)
                .attr("class", "err_rate_txt")
                .classed("high_rate", rules['err_rate'] > base_rate)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .text(`${(rules['err_rate']*100).toFixed(0)}﹪(${sig_val})`)

            x_offset = indent + err_bar_width + 15;

            // support
            rule_line.append("text")
                .attr("x", x_offset)
                .attr("y", y_offset)
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                .text(`${rules['doc_idx'].length}`)
            x_offset += 60;

            // rule list
            let rule_str = "IF ";
            if (binary) {
                rule_str += " contain "
            }
            rule_line.append("text")
                .attr("x", x_offset)
                .attr("y", y_offset)
                .attr("fill", "black")
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                // .style("font-weight", "bold")
                .text(rule_str);
            x_offset += ctx.measureText(rule_str).width;
            // x_offset = indent;
            let complete_str = ""

            // reorder features
            conditions = rules['rules'];
            if (order !== undefined) {
                conditions.sort((a, b) => {
                    return order[a['feature']] - order[b['feature']]
                })
            }

            conditions.forEach((rule, i) => {
                let feat = attrs[rule["feature"]];
                if (binary) {
                    
                } else {
                    feat += rule['sign'];
                    if (attrs[rule["feature"]] == 'pred') {
                        feat += rule['val'];
                    } else {
                        feat += vis.val_des[rule['val']];
                    }
                }
                feat += " ";

                rule_line.append("text")
                    .attr("x", x_offset)
                    .attr("y", y_offset)
                    .style("font-style", 'italic')
                    .attr("dy", ".35em")
                    .attr("text-decoration", "underline")
                    .attr("text-anchor", "start")
                    .text(feat);

                x_offset += ctx.measureText(feat + " ").width
                if (!binary) {
                    x_offset += ctx.measureText(" ").width;
                } 
               
                if (i < conditions.length - 1) {
                    rule_line.append("text")
                        .attr("x", x_offset)
                        .attr("y", y_offset)
                        // .style("font-weight", "bold")
                        .attr("dy", ".35em")
                        .attr("text-anchor", "start")
                        .text(" AND ");
                    rule_str = "";
                    x_offset += ctx.measureText(" AND ").width;
                }
            });
            rule_line.append("text")
                .attr("x", x_offset)
                .attr("y", y_offset)
                // .style("font-weight", "bold")
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                .text(" THEN ");
            x_offset += ctx.measureText(" THEN ").width;

            rule_line.append("text")
                .attr("x", x_offset)
                .attr("y", y_offset)
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                // .text(target_names[rules['label']])
                .text(`${(rules['err_rate']*100).toFixed(0)}﹪ errors`)

            x_offset += indent*.4 + ctx.measureText(target_names[rules['label']]).width;
            
            rule_line.select(`#rule_back-${ix}`)
                .attr('width', x_offset);

            if (x_offset > longest_rule) {
                longest_rule = x_offset;
            }

            y_offset += row_height;
            rule_offset++;
        });

        d3.selectAll('.rule_line')
            .on("mouseover", function() {
                d3.select(this).select('.rule_back')
                    .classed('rule_back', false)
                    .classed('rule_highlight', true)
            })
            .on("mouseout", function() {
                d3.selectAll('.rule_line > rect:not(.rule_selected):not(.err_bar)')
                    .classed('rule_back', true)
                    .classed('rule_highlight', false)
            }) 
            .on('click', click_rule);

        list_svg.attr('width', `${longest_rule + indent*2}px`);
        g.attr('width', `${longest_rule + indent}px`);


        function click_rule() {
            let rule_idx = +this.id.split('-')[1];

            d3.selectAll('.rule_line > rect:not(.err_bar)')
                .classed('rule_back', true)
                .classed('rule_selected', false)
                .classed('rule_highlight', false);

            if (clicked != rule_idx) {
                dispatch.call("rule_select", this, rule_idx);
                d3.select(this).select('rect:not(.err_bar)')
                    .classed('rule_back', false)
                    .classed('rule_highlight', false)
                    .classed('rule_selected', true)
                clicked = rule_idx;
            } else {
                clicked = -1;
                dispatch.call("rule_unselect", this);
            }
        }
    }

    ruleView.clear = function() {
        d3.selectAll('.rule_line > rect:not(.err_bar)')
            .classed('rule_back', true)
            .classed('rule_selected', false)
            .classed('rule_highlight', false);
        clicked = -1;
    }

    let dispatch = d3.dispatch("rule_select", "rule_unselect");
    ruleView.dispatch = dispatch;

    //=======================
    // Private Functions
    //=======================
    function reset() {
        rule_order = "error";

        d3.select("#rule_order")
            .attr("value", "error");
        d3.select('#rule_error_hist')
            .selectAll('rect').remove();
    }
    
    return ruleView;
}
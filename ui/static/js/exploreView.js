/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.exploreView = function () {
	let exploreView = {},
        words = [],
        labels = [],
        dist_list = undefined,
        explore_svg,
        condition_div,
        rule_content = [],
        width = 350,
        height = 350,
        margin = 10,
        xScale, yScale,
        level_height = 70,
        margin_top = 25,
        duration = 750,
        size_scale = null,
        max_rect_size = 50,
        root,
        treemap;


    //=======================
    // Public Functions
    //=======================

    exploreView.data = function (_) {
        if (!arguments.length) return data;
        treeData = _;
        root = d3.hierarchy(treeData, function(d) { return d.children; });
        root.y0 = height / 2;
        root.x0 = 0;
        size_scale = d3.scaleLinear().domain([20, 300])
            .range([10, max_rect_size])
            .clamp(true);

        return exploreView;
    }

    exploreView.container = function() {
        explore_svg = d3.select("#cond_explore")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(0, ${margin_top})`);
    
        treemap = d3.tree().size([width, height]);
        condition_div = d3.select("#added_condition");
        content_div = d3.select('#hint_content');

        return exploreView;
    }

    exploreView.attrs = function (_) {
        if (!arguments.length) return attrs;
        attrs = _['columns'];

        return ruleView;
    }

    exploreView.rule_content = function(_) {
        rule_content = _;
        return exploreView;
    }

    exploreView.initialize = function(_) {
        rule_content = [];

        d3.selectAll(".cond_type_btn")
            .on("click", function() {
                let id = this.id,
                    val = id.split('_')[1];
                console.log("type btn clicked", val);
                d3.selectAll('.cond_type_btn')
                    .classed('clicked', false);

                d3.select(this)
                    .classed('clicked', true);

                if (val == 'token' || val == 'concept') {
                    d3.select('#val_to_add')
                        .style('display', "none");
                    d3.select('#add_equal')
                        .style('display', "none");
                    d3.select('#add_contain')
                        .style('display', "block");

                    if (val == 'token') {
                        vis.rule_add_type = vis.BINARY;
                        d3.select('#add_contain')
                            .html("contain:");
                    } else {
                        vis.rule_add_type = vis.CONCEPT;
                        d3.select('#add_contain')
                            .html("contain concept_");
                    }

                } else {
                    d3.select('#val_to_add')
                        .style('display', "block");
                    d3.select('#add_contain')
                        .style('display', "none");
                    d3.select('#add_equal')
                        .style('display', "block");

                    vis.rule_add_type = vis.NUMERIC;
                }

            })

        d3.select('#add_cond')
            .on("click", function() {
                let cond = {};
                if (vis.rule_add_type == vis.BINARY) {
                    // token type
                    cond['feature'] = formalize(d3.select('#word_to_add')._groups[0][0].value);
                    cond['sign'] = '>';
                    cond['threshold'] = .5;
                } else if (vis.rule_add_type  == vis.NUMERIC) {
                    // high-level feature
                    let text = formalize(d3.select('#word_to_add')._groups[0][0].value),
                        val = formalize_value(d3.select('#val_to_add')._groups[0][0].value);

                    cond['feature'] = text;
                    cond['sign'] = '=';
                    cond['val'] = val;
                } else if (vis.rule_add_type == vis.CONCEPT) {
                    // concept type
                    let text = formalize(d3.select('#word_to_add')._groups[0][0].value);

                    cond['feature'] = text;
                    cond['sign'] = 'is';
                    cond['val'] = [];
                }
                
                if (cond['threshold'] !== undefined || cond['val'] !== undefined) {
                    add_condition_div(cond, rule_content.length-1);
                    rule_content.push(cond);
                }

                // reset adding part
                d3.select('#word_to_add')._groups[0][0].value = "";
                d3.select('#val_to_add')._groups[0][0].value = "";
            });

        d3.select('#submit_reset')
            .on("click", () => reset_rule_content());

        d3.select("#submit_inspect")
            .on("click", () => {
                dispatch.call("rule_inspect", this, rule_content);
                console.log(rule_content)
            })
    }

    exploreView.render_condition_path = function() {
        explore_svg.selectAll('*').remove();
        
        update_hierarchical_path(root);
        return exploreView;
    }

    exploreView.update_conditions = function() {
        condition_div.selectAll('*').remove();

        update_rule_condition_div();
        return exploreView;
    }

    exploreView.update_hint = function(hint_content) {
        content_div.selectAll('*').remove();

        // update_hint_content(hint_content);
        return exploreView;
    }

    exploreView.clear = function() {
        condition_div.selectAll('*').remove();
        explore_svg.selectAll('g > *').remove();

        return exploreView;
    }

    let dispatch = d3.dispatch("rule_inspect");
    exploreView.dispatch = dispatch;

    //=======================
    // Private Functions
    //=======================
    update_hierarchical_path = function(source) {
        // Assigns the x and y position for the nodes
        var treeData = treemap(root);

        // Compute the new tree layout.
        var nodes = treeData.descendants(),
        links = treeData.descendants().slice(1)

        // Normalize for fixed-depth.
        nodes.forEach(function(d){ d.y = d.depth * level_height});

        // ****************** Nodes section ***************************

        // Update the nodes...
        var node = explore_svg.selectAll('g.node')
            .data(nodes, function(d) {return d.id || (d.id = ++i); });

        // Enter any new modes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr("transform", function(d) {
                return "translate(" + source.x + "," + source.y + ")";
            })

        // Add Circle for the nodes
        let tree_nodes = nodeEnter.append('g')
            .attr("class", "node_g")
            .attr("transform", "scale(0)")

        let conf_fill = ['lightgrey', '#fbb4ae']
        tree_nodes.selectAll('rect')
            .data(node => {
                let rects = [
                    {'x': -.5, 'y': -.5, 'height': 1, 'width': 1, 'stroke': "black"},
                    {'x': -.5, 'y': .5-node['data']['error_rate'], 'stroke': "none",
                    'height': node['data']['error_rate'], 'width': 1},
                ];
                return rects;
            }).enter()
            .append('rect')
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('width', d=> d.width)
            .attr('height', d=> d.height)
            .attr('fill', (d, i) => conf_fill[i])
            .attr('stroke', "none")

        // Add labels for the nodes
        nodeEnter.append('text')
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .html(function(d) { 
                let name = "";
                
                if (d.data['sign'] == '>') {
                    // type: contain token
                    name = `<tspan x=-13>contain: ${d.data['feature']}</tspan>`
                } else if (d.data['sign'] == 'is') {
                    // type: contain concpet
                    name = `<tspan x=-13>contain: ${d.data['val']}</tspan>`
                } else {
                    // type: high-level feature
                    let feat = d.data['feature'];
                   
                    feat += d.data['sign'] + vis.val_des[d.data['val']];
                    name = `<tspan x=-13>${feat}</tspan>`
                }
                name += `<tspan x=-13 dy=15>${d.data['size']} (${(d.data['error_rate']*100).toFixed(2)}%)</tspan>`
                return name;
            });

        // UPDATE
        var nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(duration)
            .attr("transform", function(d) { 
                return "translate(" + d.x + "," + d.y + ")";
             });

        // Update the node attributes and style
        nodeUpdate.select('g.node_g')
            .attr('transform', d => {
                return `scale(${size_scale(d.data.size)})`
            })
            .attr('cursor', 'pointer');


        // ****************** links section ***************************

        // Update the links...
        var link = explore_svg.selectAll('path.link')
            .data(links, function(d) { 
                return d.id; 
            });

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link");

        // UPDATE
        var linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .attr('d', function(d){ return diagonal(d, d.parent) });

        // Remove any exiting links
        var linkExit = link.exit().transition();

        // Creates a curved (diagonal) path from parent to the child nodes
        function diagonal(s, d) {
            path = `M ${s.x} ${s.y}
                C ${(s.x + d.x) / 2} ${s.y},
                  ${(s.x + d.x) / 2} ${d.y},
                  ${d.x} ${d.y}`
            return path
        }
    }

    update_rule_condition_div = function() {
        rule_content.forEach((cond, feat_ix) => {
            add_condition_div(cond, feat_ix)
        });
    }

    reset_rule_content = function(_) {
        rule_content = [];

        // reset adding part
        d3.select('#word_to_add').html("");

        // remove visual elements
        condition_div.selectAll('*').remove();
        explore_svg.selectAll('*').remove();
        content_div.selectAll('*').remove();

        return exploreView;
    }


    add_condition_div = function(cond, feat_ix) {
        let str = cond["feature"];
        if (cond['sign'] == '>'){
            str = "contain: " + str;
        } else if (cond['sign'] == '='){
            str += cond['sign'] + vis.val_des[cond['val']];
        } else {
            str = "contain: " + str;
        }

        let cond_div = condition_div.append("div")
            .attr("class", "cond_div")
            .attr('id', `cond-${feat_ix}`);

        cond_div.append('div')
            .attr('class', 'cond_content')
            .text(str);

        cond_div.append('div')
            .attr('class', 'cond_content')
            .text('x')
            .on('click', function() {
                let fix = this.parentNode.id.split('-')[1];
                delete rule_content[fix];
                console.log(rule_content)
                this.parentNode.parentNode.removeChild(this.parentNode);
            })
    }

    function update_hint_content(hint_content) {
        content_div.selectAll(".hint")
            .data(hint_content).enter()
            .append('div')
            .attr('class', 'hint')
            .html(d=> `${d['feature']}: ${(d['err_rate']*100).toFixed(2)}%`);

    }

    function formalize(feature) {
        let feat = remove_beginning_space(feature);

        if (vis.rule_add_type == vis.BINARY) {
            // fill space in between with underline
            feat = feat.replaceAll(' ', '_');
        } else if (vis.rule_add_type == vis.CONCEPT) {
            feat = 'concept_'+feat;
        } else {
            // high-level features
            for (let i = 0; i < vis.hfeat.length; i++) { 
                let key = vis.hfeat[i],
                    standard = key.toLowerCase().substring(0,3),
                    typed = feat.toLowerCase().substring(0,3);
                if (standard == typed) {
                    return key;
                }
            }
        }
        return feat;
    }

    let range_vals = ['l', 'm', 'h']

    function formalize_value(val) {
        let hfeat_val = remove_beginning_space(val);

        let val1 = hfeat_val.toLowerCase()[0];
        if (val1 == 'l' || val1 == 'm' || val1 == 'h') {
            if (hfeat_val[0] == 'L' || hfeat_val[0] == 'l') {
                return 0;
            }
            if (hfeat_val[0] == 'M' || hfeat_val[0] == 'm') {
                return 1;
            }
            if (hfeat_val[0] == 'H' || hfeat_val[0] == 'h') {
                return 2;
            }
        } else {
            // labels
            data_type = vis.doc_type;

            if (data_type == vis.QA) {
                labels = vis.boolq_label;
            } else if (data_type == vis.SENTIMENT) {
                labels = vis.sentiment_label;
            } else if (data_type == vis.INFERENCE) {
                labels = vis.inference_label[data_name];
            } 
            for (let i = 0; i < labels.length; i++) {
                let standard = labels[i].toLowerCase()[0];
                if (standard = val1) {
                    return i;
                }
            }
        }
    }

    function remove_beginning_space(str) {
        let pos = 0;
        while (pos<str.length && str[pos] == ' ') {
            pos++;
        }
        return str.substring(pos);
    }


    return exploreView;
}
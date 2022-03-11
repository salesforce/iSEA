/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.conceptView = function () {
	let conceptView = {},
        concept_div,
        svg_size = [150, 70],
        margin = 5,
        indent = 15,
        concept_list = {},
        concept_last_id,
        base_err_rate,
        sizeScale,
        xScale,
        editting = false,
        font_size;

    //=======================
    // Public Functions
    //=======================
    conceptView.container = function(_) {
        concept_div = _;
        return conceptView;
    }

    conceptView.initialize = function() {
        concept_list = {};
        concept_last_id = 0;

        d3.select('#add_concept').on('click', () => {
            if (!editting) {
                editting = true;
                concept_list[concept_last_id] = [];
                add_concept_block(concept_last_id);
                concept_last_id++;
            }
        })

        xScale = d3.scaleLinear()
            .domain([0.2, .5])
            .range([indent+margin, svg_size[1]-margin])
            .clamp(true);

        sizeScale = d3.scaleLinear()
            .domain([20, 800])
            .range([1, svg_size[1]/2-indent])
            .clamp(true);

        return conceptView;
    }

    conceptView.base_err_rate = function(_) {
        base_err_rate = _;
        return conceptView;
    }

    conceptView.get_concept = function(cid) {
        return concept_list[cid];
    }
    
    conceptView.update_summary = function(stat, cid) {
        render_err_summary(d3.select(`#err_svg-${cid}`), stat);
        return conceptView;
    }

    conceptView.change_concept_to_token_list = function(rules) {
        rules.forEach(rule => {
            if (rule['sign'] == 'is') {
                let cid = +rule['feature'].split('_')[1];
                rule['val'] = concept_list[cid-1];
            }
        });
        return rules;
    }

    conceptView.get_concept_num = function() {
        return Object.keys(concept_list).length;
    }

    //=======================
    // Private Functions
    //=======================
    function add_concept_block(concept_id) {
        let words_div = concept_div.append("div")
            .attr("class", "concept_div")
            .attr('id', `concept-${concept_id}`);

        // concept name
        let row0 = words_div.append('div')
            .attr('class', 'row concept_row0')

        row0.append('div')
            .attr('class', 'concept_name')
            .append('span')
            .html(`concept_${concept_id+1}`);

        row0.append('div')
            .attr("id", `remove-${concept_id}`)
            .attr("class", "remove_btn")
            .text('x')
            .on('click', function() {
                let cix = this.id.split('-')[1];
                delete concept_list[cix];
                console.log(concept_list)
                this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);
                if (conceptView.get_concept_num() == 0) {
                    d3.select('#add_concept_btn')
                        .attr('disabled', true);
                    if (d3.select('#add_concept_btn')._groups[0][0].className.indexOf('clicked') > 0) {
                        d3.select('#add_concept_btn')
                            .classed('clicked', false);
                        d3.select('#add_token_btn')
                            .classed('clicked', true);
                        vis.rule_add_type = vis.BINARY;
                    }
                }
            });


        // input and results
        let row1 = words_div.append('div')
            .attr("class", "row concept_row1")

        let content = row1.append('div')
            .attr("class", "row")

        content.append('input')
            .attr("class", "concept_content")
            .attr("id", `concept_content-${concept_id}`)
            .attr("type", "text")
            .style("height", "70px")
            .text("")
            .on("click", function() {
                let cix = this.id.split('-')[1];
                editting = true;
                edit_concept(cix);
            })

        content.append("svg")
            .attr("id", `err_svg-${concept_id}`)
            .attr('class', 'err_svg')
            .attr("width", 0)
            .attr("height", 0);

        let row2 = words_div.append('div')
            .attr("id", `concept_edit-${concept_id}`)
            .classed("show_edit", true)
            .classed("unshow_edit", false)

        row2.append("button")
            .html("submit")
            .attr("id", `submit-${concept_id}`)
            .attr("class", "submit_concept")
            .on('click', function() {
                let cid = this.id.split('-')[1];
                submit_concept(cid);
                dispatch.call("concept_update", this, cid);
                editting = false;
            })
    }

    function submit_concept(cid) {
        d3.select(`#concept_content-${cid}`)
            .attr("readonly", true)
            .classed("concept_content", false)
            .classed("concept_content_narrow", true)

        d3.select(`#concept_edit-${cid}`)
            .classed("show_edit", false)
            .classed("unshow_edit", true);

        d3.select(`#err_svg-${cid}`)
            .attr('width', svg_size[0])
            .attr('height', svg_size[1])

        // process the words
        let text = d3.select(`#concept_content-${cid}`)._groups[0][0].value,
            words = text.split(',');
        concept_list[cid] = [];
        for (let i = 0; i < words.length; i++) {
            concept_list[cid].push(remove_edge_space(words[i]));
        }
    }

    function edit_concept(cid) {
        d3.select(`#concept_content-${cid}`)
            .attr("readonly", null)
            .classed("concept_content", true)
            .classed("concept_content_narrow", false)

        d3.select(`#concept_edit-${cid}`)
            .classed("show_edit", true)
            .classed("unshow_edit", false);

        d3.select(`#err_svg-${cid}`)
            .attr('width', 0)
            .attr('height', 0)
    }

    function render_err_summary(err_svg, stat) {
        err_svg.selectAll('*').remove();

        let y_pos = svg_size[1]/2;

        // draw support
        err_svg.append('circle')
            .attr("cx", xScale(stat['err_rate']))
            .attr('cy', y_pos)
            .attr('r', sizeScale(stat['support']))
            .attr('fill-opacity', 0.3)
            .attr('fill', vis.err_bar_color);

        // draw the base err rate dot
        err_svg.append('g')
            .attr("transform", `translate(${xScale(base_err_rate)}, ${y_pos})`)
            .append("polygon")
            .attr('points', "-5,8 0,0 5,8")
            .attr('fill', 'black');

        // draw the group errs
        err_svg.append('circle')
            .attr("cx", xScale(stat['err_rate']))
            .attr('cy', y_pos)
            .attr('r', 3)
            .attr('fill', vis.err_bar_color);

        err_svg.append('line')
            .attr('x1', xScale(stat['ci'][0]))
            .attr('x2', xScale(stat['ci'][1]))
            .attr('y1', y_pos)
            .attr('y2', y_pos)
            .attr('stroke', vis.err_bar_color);

        // error rate text
        err_svg.append('text')
            .attr('x', xScale(stat['err_rate']))
            .attr('y', y_pos-5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'grey')
            .text(`${(100*stat['err_rate']).toFixed(2)}%`)
    }

    function remove_edge_space(str) {
        let pos_st = 0, pos_end = str.length-1;
        while (pos_st < str.length && str[pos_st]==' ') {
            pos_st++;
        }
        while (pos_end >= 0 && str[pos_end] == ' ') {
            pos_end--;
        }
        let token = str.substring(pos_st, pos_end+1)
        return token.replace(' ', '_');
    }

    let dispatch = d3.dispatch("concept_update");
    conceptView.dispatch = dispatch;

    return conceptView;
}
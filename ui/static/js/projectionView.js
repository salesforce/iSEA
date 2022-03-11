/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.projectionView = function () {
	let projectionView = {},
        size = [],
        labels = [],
        width = 350,
        height = 140,
        margin = 10,
        position = [],
        top_k = 5,
        canvas,
        pred_des = [],
        legend_svg,
        legend_size = 15,
        indent = 5,
        font_size;


    //=======================
    // Public Functions
    //=======================

    projectionView.position = function(_) {
        position = _;
        let coord_max = position.reduce((max, p) => +p.x > max ? +p.x : max, position[0].x),
            coord_min = position.reduce((min, p) => +p.x < min ? +p.x : min, position[0].x);

        xScale = d3.scaleLinear()
            .domain([coord_min, coord_max])
            .range([margin, size[0]-margin]);

        ccoord_max = position.reduce((max, p) => +p.y > max ? +p.y : max, +position[0].y);
        coord_min = position.reduce((min, p) => +p.y < min ? +p.y : min, +position[0].y);

        yScale = d3.scaleLinear()
            .domain([coord_min, coord_max])
            .range([margin, size[1]-margin]);
        
        return projectionView;
    }

    projectionView.model_output = function(_) {
        model_output = _;
        return projectionView;
    }

    projectionView.container = function(_) {
        canvas = _.select("canvas")
        size = [canvas.attr('width'), canvas.attr('height')];
        legend_svg = d3.select("#projection_legend");
        
        return projectionView;
    }

  
    projectionView.render = function() {
        render_list();
        return projectionView;
    }

    projectionView.highlight_subpopulation = function(doc_list, rule_idx=undefined) {
        render_list(doc_list, true, rule_idx);
        return projectionView;
    }

    projectionView.make_legend = function() {
        legend_svg.append("rect")
            .attr("x", indent)
            .attr("y", margin)
            .attr("width", legend_size)
            .attr("height", legend_size)
            .attr("fill", vis.projectColor['error'])
            .attr("stroke", "none");
        legend_svg.append("text")
            .attr("x", indent+legend_size+margin)
            .attr("y", margin+legend_size)
            .text("error");

        x_offset = indent + legend_size + 50;

        legend_svg.append("rect")
            .attr("x", x_offset)
            .attr("y", margin)
            .attr("width", legend_size)
            .attr("height", legend_size)
            .attr("fill", vis.projectColor['right'])
            .attr("stroke", "none");
        legend_svg.append("text")
            .attr("x", x_offset+legend_size+margin)
            .attr("y", margin+legend_size)
            .text("correct");

        return projectionView;
    }   

    //=======================
    // Private Functions
    //=======================
    function render_list(doc_list=undefined, highlight=false, rule_idx=undefined) {
        let context = canvas.node().getContext('2d');

        // clear existing points
        context.clearRect(0, 0, size[0], size[1]);
        
        // draw scatterplot
        if (highlight) {
            for (let i = 0; i < doc_list.length; i++) {
                let j = doc_list[i];

                let is_error = +(+model_output[j]['y_gt'] !== +model_output[j]['y_pred']);

                context.fillStyle = is_error ? vis.projectColor['error'] : vis.projectColor['right'];
                drawPoint(xScale(position[j].x), yScale(position[j].y), context);
            }
            if (rule_idx == undefined) {
                d3.select('#proj_rid')
                    .html("Edited rule")
            } else {
                d3.select('#proj_rid')
                    .html(`Rule ${rule_idx+1}`)
            }
            
        } else {
            for (let i = 0; i < d3.min([position.length, 5000]); i++) {
                let is_error = +(+model_output[i]['y_gt'] !== +model_output[i]['y_pred']);
                context.fillStyle = is_error ? vis.projectColor['error'] : vis.projectColor['right'];
                drawPoint(xScale(position[i].x), yScale(position[i].y), context);
            }
            d3.select('#proj_rid')
                .html("all")
        }
    }

    function drawPoint(x, y, canvas){
        canvas.beginPath();
        canvas.arc(x, y, 2, 0, 2 * Math.PI, true);
        canvas.fill();
    }

    return projectionView;
}
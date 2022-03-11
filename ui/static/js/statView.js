/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.statView = function () {

    let statView = {},
        data = [],
        id_data = [],
        labels = undefined,
        container = null,
        margin = 5,
        margin_left = 20,
        // color = {"err": "#3182bd", "tot": "#9ecae1"},
        color = {"err": "url(#error_pattern_blue)", "tot": "#9ecae1"},
        canvas = document.getElementById("canvas"),
        ctx = canvas.getContext("2d"),
        stat_svg,
        legend_svg,
        legend_size = 15,
        xScale, yScale,
        indent = 20,
        padding = 10,
        stat_height = 290,
        stat_bar_width = 20,
        title_height = 15,
        stat_bar_height = 100,
        key_list = [],
        data_name,
        data_type,
        train_data,
        unit_graph_height = (stat_bar_height + 40 + padding),
        barScale;
    
    //=======================
    // Public Functions
    //=======================
    statView.container = function (_, rule_idx=undefined) {
        if (!arguments.length) return container;
        container = _;
        stat_svg = _.select(".stat_svg");
        legend_svg = d3.select("#stat_legend");

        if (rule_idx=='edited') {
            d3.select('#stat_rid')
                .html("Edited rule");
        } else if (rule_idx!==undefined) {
            d3.select('#stat_rid')
                .html(`Rule ${rule_idx+1}`);
        }

        return statView;
    };

    statView.data = function (_) {
        if (!arguments.length) return data;
        data = _;

        let max_tot = 0;
        Object.keys(data).forEach(key => {
            max_tot = d3.max([max_tot, d3.max(Object.values(data[key]), d=>d.tot)]);
        });
        yScale = d3.scaleLinear()
            .domain([0, max_tot])
            .range([stat_bar_height, 0]);

        // key_list
        key_list = [];
        Object.keys(data).forEach((key) => {
            let words = key.split('_'), col="";
            for (i=1; i<words.length; i++) {
                col+=words[i];
                if (i < words.length-1) {
                    col+="_";
                }
            }
            key_list.push(col);
        });

        // always make label the first, and prediction the second
        let pred_key = ["pred", "y_pred"], gt_key = ["label","y_gt"];
        key_list = key_list.sort(function(a,b){ return pred_key.indexOf(a)>=0 ? -1 : pred_key.indexOf(b)>=0 ? 1 : 0; });
        key_list = key_list.sort(function(a,b){ return gt_key.indexOf(a)>=0 ? -1 : gt_key.indexOf(b)>=0 ? 1 : 0; });
        console.log(key_list);

        let font_size = 14,
            font = font_size + "px " + vis.font_family;

        ctx.font = font;
        return statView;
    };

    statView.train_data = function(_) {
        train_data = _;
        return statView;
    }

    statView.id_data = function(_) {
        id_data = _;
        return statView;
    }

    statView.data_name = function(_) {
        if (!arguments.length) return data_name;
        data_name = _;
        return statView;
    }

    statView.doc_type = function(_) {
        data_type = _;

        if (data_type == vis.QA) {
            labels = vis.boolq_label;
        } else if (data_type == vis.SENTIMENT) {
            labels = vis.sentiment_label;
        } else if (data_type == vis.INFERENCE) {
            labels = vis.inference_label[data_name];
        } 
        return statView;
    }

    statView.key_list = function() {
        return key_list;
    }

    statView.clear = function() {
        legend_svg.selectAll("*").remove();
        d3.selectAll('.stat_svg > g').remove();
        d3.select('#stat_rid')
            .html("no rule")
        return statView;
    }

    statView.make_legend = function() {
        legend_svg.append("rect")
            .attr("x", indent)
            .attr("y", margin)
            .attr("width", legend_size)
            .attr("height", legend_size)
            .attr("fill", `url(#error_pattern)`)
            .attr("stroke", "none");
        legend_svg.append("text")
            .attr("x", indent+legend_size+margin)
            .attr("y", margin+legend_size)
            .text("num_error");

        x_offset = indent + ctx.measureText("num_error").width + legend_size + 50;

        legend_svg.append("rect")
            .attr("x", x_offset)
            .attr("y", margin)
            .attr("width", legend_size)
            .attr("height", legend_size)
            .attr("fill", color['tot'])
            .attr("stroke", "none");
        legend_svg.append("text")
            .attr("x", x_offset+legend_size+margin)
            .attr("y", margin+legend_size)
            .text("num_doc");

        x_offset += legend_size+margin+70;

        return statView;
    }   

    statView.draw = function() {
        // clear
        stat_svg.selectAll('g').remove();

        // initialize
        let xvals = [],
            y_offset = 0,
            max_width = 0
            rotate = 0;

        key_list.forEach((key) => {
            let by_key="by_"+key, words = by_key.split('_'), title = "", col = "";
            for (i=1; i<words.length; i++) {
                title+=`${words[i]} `;
                col+=words[i];
                if (i < words.length-1) {
                    col+="_";
                }
            }
            if (key.indexOf('label') >= 0 || key.indexOf('y_pred') >= 0 || key.indexOf('pred') >= 0 || key.indexOf('gt') >= 0) {
                xvals = labels;
            } else {
                xvals = vis.val_des;
            }
            if (ctx.measureText(xvals[0]).width > stat_bar_width) {
                rotate = 30;
            }
            if (xvals.length * (stat_bar_width+5)+indent > max_width) {
                max_width = xvals.length * (stat_bar_width+5)+indent*3;
            } 

            render_subgraph(by_key, title, xvals, y_offset, rotate);
            y_offset += unit_graph_height;
        })

        stat_svg.attr("width", `${max_width}px`)
            .attr("height", `${Object.keys(data).length * unit_graph_height+ 50}px`);
        
        return statView;
    }

    statView.draw_train_stat = function() {
        // initialize
        let canvas = document.getElementById("canvas"),
            ctx = canvas.getContext("2d"),
            font_size = 14,
            font = font_size + "px " + vis.font_family;

        ctx.font = font;

        let xvals = [],
            unit_chart_width = (stat_bar_width+5)*train_data[Object.keys(train_data)[0]].length+margin_left+indent;
            x_offset = unit_chart_width + margin,
            rotate = 0

        Object.keys(train_data).forEach((key) => {
            xvals = train_data[key];

            render_train_subgraph(key, key+" (in train)", xvals, x_offset, 30)
            
            x_offset += unit_chart_width;
        })


        stat_svg.attr("width", `${x_offset+unit_chart_width}px`);
        
    }

    statView.draw_id_stat = function() {
        let canvas = document.getElementById("canvas"),
            ctx = canvas.getContext("2d"),
            font_size = 14,
            font = font_size + "px " + vis.font_family;

        ctx.font = font;

        let xvals = [],
            y_offset = unit_graph_height * Object.keys(id_data).length,
            max_width = 0
            rotate = 0;

        Object.keys(id_data).forEach((key) => {
            let words = key.split('_'), title = "", col = "";
            for (i=1; i<words.length; i++) {
                title+=`${words[i]} `;
                col+=words[i];
                if (i < words.length-1) {
                    col+="_";
                }
            }
            title += "(in distribution)"
            xvals = Object.values(id_data[key]).map(d => d[col]);
            if (ctx.measureText(xvals[0]).width > stat_bar_width * 2) {
                rotate = 30;
            }
            if (xvals.length * (stat_bar_width*2+5)+indent > max_width) {
                max_width = xvals.length * (stat_bar_width*2+5)+indent*3;
            } 

            render_subgraph(key, title, xvals, y_offset, rotate);
            y_offset += unit_graph_height;
        })

        stat_svg
            .attr("height", `${(Object.keys(id_data).length * unit_graph_height+ 50)*2}px`);
        
        return statView;
    }

    //=======================
    // Private Functions
    //=======================
    
    function render_subgraph(key, title, xvals, y_offset, rotate) {
        xScale = d3.scaleBand()
            .domain(xvals)
            .range([0, xvals.length * (stat_bar_width + 5)]);

        let stat_g = stat_svg.append("g")
            .attr("class", "stat_g")
            .attr("transform", `translate(${indent}, ${y_offset})`)
            
        stat_g.append("text")
            .attr("x", 0)
            .attr("y", title_height)
            .text(title);

        stat_bars = stat_g.selectAll("g")
            .data(Object.values(data[key]))
            .enter()
            .append("g")
            .attr('id', (d,i)=>`${key}-${xvals[i]}`)
            .attr("transform", (d,i) => `translate(${indent+i*(stat_bar_width+5)}, ${padding+title_height})`)


        stat_bars.on("click", function() {
            d3.selectAll(".stat_hover").style("fill-opacity", 0);
            d3.select(this).select(".stat_hover").style("fill-opacity", .3)
            click_category(this.id);
        })

        stat_bars.selectAll(".stat_bar").data(d => {
            return [{"type": "tot", "val": d['tot']}, {"type": "err", "val": d['is_error']}, ];
        }).enter()
            .append("rect")
            .attr('class', "stat_bar")
            // .attr("x", (d,i)=>i*stat_bar_width)
            .attr("x", 0)
            .attr("y", d => yScale(d['val']))
            .attr("width", stat_bar_width)
            .attr("height", d => stat_bar_height - yScale(d['val']))
            .attr("fill", d => color[d['type']]);

        stat_bars.append("rect")
            .attr("class", "stat_hover")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", stat_bar_width)
            .attr("height", d => stat_bar_height)
            .style("fill", "grey")
            .style("fill-opacity", 0);

        // add x axis
        let xAxis = stat_g.append("g")
          .attr("transform", `translate(${indent}, ${stat_bar_height+padding+title_height})`)
          .call(d3.axisBottom(xScale));

        // add y axis
        stat_g.append("g")
            .attr("transform", `translate(${indent}, ${padding+title_height})`)
            .call(d3.axisLeft(yScale));

        if (rotate !== undefined) {
            xAxis.selectAll("text")
                .attr("y", 5)
                .attr("x", 5)
                .attr("dy", ".35em")
                .attr("transform", `rotate(${rotate})`)
                .style("text-anchor", "start");
        }
    }

    function render_train_subgraph(key, title, xvals, x_offset, rotate) {
        xScale = d3.scaleBand()
            .domain(labels)
            .range([0, xvals.length * (stat_bar_width + 5)]);

        let stat_g = stat_svg.append("g")
            .attr("class", "stat_g")
            .attr("transform", `translate(${indent}, ${0})`)
            
        stat_g.append("text")
            .attr("x", x_offset)
            .attr("y", title_height)
            .text(title);

        stat_bars = stat_g.selectAll("g")
            .data(train_data[key])
            .enter()
            .append("g")
            .attr("transform", (d,i) => `translate(${x_offset+indent+i*(stat_bar_width+5)}, ${padding+title_height})`)

        stat_bars.append("rect")
            .attr('class', "stat_bar")
            .attr("x", 0)
            .attr("y", d => yScale(d))
            .attr("width", stat_bar_width)
            .attr("height", d => stat_bar_height - yScale(d))
            .attr("fill", d => color['tot']);

        // add x axis
        let xAxis = stat_g.append("g")
          .attr("transform", `translate(${x_offset + indent}, ${stat_bar_height+padding+title_height})`)
          .call(d3.axisBottom(xScale));

        // add y axis
        stat_g.append("g")
            .attr("transform", `translate(${x_offset + indent}, ${padding+title_height})`)
            .call(d3.axisLeft(yScale));

        if (rotate !== undefined) {
            xAxis.selectAll("text")
                .attr("y", 5)
                .attr("x", 5)
                .attr("dy", ".35em")
                .attr("transform", `rotate(${rotate})`)
                .style("text-anchor", "start");
        }
    }

    function click_category(gid) {
        dispatch.call("category_select", this, gid);
    }

    let dispatch = d3.dispatch("category_select");
    statView.dispatch = dispatch;

    return statView;
}
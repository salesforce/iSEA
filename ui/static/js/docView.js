/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


vis.docView = function () {

    let docView = {},
        data = [],
        labels = undefined,
        container = null,
        docs,
        target_names,
        model_output,
        doc_type,
        ruleSet,
        size = [],
        margin = 5,
        processed_rule,
        xScale, yScale,
        shap_svg = d3.select('#shap_overview'),
        shap_vals,
        shap_pred = 0,
        svg_height = 100,
        bar_width = 15,
        legend_svg = d3.select('#shap_legend'),
        legend_size = 10,
        indent = 20,
        barScale;
    
    //=======================
    // Public Functions
    //=======================
    docView.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return docView;
    };

    docView.docs = function (_) {
        if (!arguments.length) return docs;
        docs = _;
        return docView;
    };

    docView.data = function (_) {
        ruleSet = _['rule_lists'],
        target_names = _['target_names'];

        return docView;
    };

    docView.doc_type = function (_) {
        if (!arguments.length) return doc_type;
        doc_type = _;

        return docView;
    }

    docView.model_output = function (_) {
        model_output = _;

        return docView;
    }

    docView.processed_rule = function(_) {
        processed_rule = _;
        return docView;
    }

    docView.shap_vals = function(_) {
        shap_vals = _;
        return docView;
    }

    docView.initialize = function(data_type) {
        if (data_type == vis.QA) {
            pred_des = vis.boolq_label;
        } else if (data_type == vis.SENTIMENT) {
            pred_des = vis.sentiment_label;
        } else if (data_type == vis.INFERENCE) {
            pred_des = vis.inference_label[data_name];
        } else {
            pred_des = range(5);
        }

        d3.select('#shap_class').selectAll('option')
            .data(pred_des)
            .enter()
            .append('option')
            .attr('value', (d,i)=>i)
            .html(d=>d);

        d3.select('#shap_class')
            .on('change', function(){
                shap_pred = +this.value
                update_shap_view();
            });

        shap_pred = 0;
        make_legend();

        return docView;
    }

    docView.clear = function() {
        // clear existing points
        container.selectAll(".doc_box").remove();
        shap_svg.selectAll('*').remove();

        return docView;
    }

    docView.update = function(rule_idx) {
        // update document to show
        let rule = ruleSet[+rule_idx];

        rule['doc_idx'].sort((a, b) => {
            let a_err = +(model_output[a]['y_gt'] !== model_output[a]['y_pred']),
                b_err = +(model_output[b]['y_gt'] !== model_output[b]['y_pred']);
            return b_err - a_err;
        });

        show_document(rule['doc_idx']);
        d3.select('#text_rid').html(`Rule ${rule_idx+1}`);
    }


    docView.update_rule_collection = function(doc_list, rule_idx=undefined) {
        doc_list.sort((a, b) => {
            let a_err = +(model_output[a]['y_gt'] !== model_output[a]['y_pred']),
                b_err = +(model_output[b]['y_gt'] !== model_output[b]['y_pred']);
            return b_err - a_err;
        });

        show_document(doc_list);
        if (rule_idx!==undefined) {
            d3.select('#text_rid').html(`Rule ${rule_idx+1}`);
        } else {
            d3.select('#text_rid').html(`Edited rule`);
        }
    }

    docView.render_shap_bars = function() {
        update_shap_view();

        return docView;
    }

    //=======================
    // Private Functions
    //=======================
    function show_document_by_cate(cate, key) {
        let err_num = 0, doc_num = 0, col = "";
        let words = cate.split('_');
        for (i=1; i<words.length; i++) {
            col+=words[i];
            if (i < words.length-1) {
                col+="_";
            }
        }

        for (let doc_idx = 0; doc_idx < docs.length; doc_idx++) {
            if (docs[doc_idx][col] !== key) continue;
            doc_num++;
            let doc_box = container.append('div')
                .attr('class', 'doc_box');
            
            let is_error = +(+model_output[doc_idx]['y_gt'] !== +model_output[doc_idx]['y_pred']);

            if (doc_type === vis.QA) {
                render_qa(doc_box, doc_idx, is_error);
            } else if (doc_type === vis.INFERENCE) {
                render_inference(doc_box, doc_idx, is_error);
            }

            err_num += is_error;
            if (doc_num >= 10000) break;
        };

        // update document subgroup information
        d3.select('#text_rid').html(`Category ${cate}: ${key}`);
        d3.select('#text_doc_num').html(doc_num);
        d3.select('#text_err_num').html(err_num);
    }

    function show_document(doc_list) {
        let err_num = 0;
        doc_list.forEach((doc_idx) => {
            let doc_box = container.append('div')
                .attr('class', 'doc_box');
            
            let is_error = +(+model_output[doc_idx]['y_gt'] !== +model_output[doc_idx]['y_pred']);

            if (doc_type === vis.QA) {
                render_qa(doc_box, doc_idx, is_error);
            } else if (doc_type === vis.INFERENCE) {
                render_inference(doc_box, doc_idx, is_error);
            } else if (doc_type === vis.REVIEW) {
                render_review(doc_box, doc_idx, is_error);
            } else if (doc_type === vis.SENTIMENT) {
                render_sentiment(doc_box, doc_idx, is_error);
            }

            doc_box.append

            err_num += is_error;
        });

        // update document subgroup information
        d3.select('#text_doc_num').html(doc_list.length);
        d3.select('#text_err_num').html(err_num);
    }

    function render_qa(doc_box, doc_idx, is_error) {
        doc_box.append('h5')
                .html(`${docs[doc_idx]['title']}`);

        doc_box.append('p')
            .html(`Question: ${add_text_highlight(docs[doc_idx]['question'])}`)

        doc_box.append('p')
            .html(`Passage: ${add_text_highlight(docs[doc_idx]['passage'])}`)

        doc_box.append('p')
            .html(`Answer: ${docs[doc_idx]['answer']}`)

        doc_box.append('p')
            .html(`Prediction: <span style="color:${vis.pred_err_color[is_error]}">${Boolean(+model_output[doc_idx]['y_pred'])}</span>`)
    }

    function render_inference(doc_box, doc_idx, is_error) {
        doc_box.append('p')
            .html(`Sentence1: ${add_text_highlight(docs[doc_idx]['sentence1'])}`)

        doc_box.append('p')
            .html(`Sentence2: ${add_text_highlight(docs[doc_idx]['sentence2'])}`)

        doc_box.append('p')
            .html(`Label: ${docs[doc_idx]['gold_label']}`)

        doc_box.append('p')
            .html(`Prediction: <span style="color:${vis.pred_err_color[is_error]}">${vis.inference_label[data_name][+model_output[doc_idx]['y_pred']]}</span>`)
    }

    function render_review(doc_box, doc_idx, is_error) {
        let review_str = add_text_highlight(docs[doc_idx]['review'])

        doc_box.append('p')
            .html(`Review: ${review_str}`)

        doc_box.append('p')
            .html(`Label: ${docs[doc_idx]['y_true']}`)

        doc_box.append('p')
            .html(`Prediction: <span style="color:${vis.pred_err_color[is_error]}">${+model_output[doc_idx]['y_pred']}</span>`)
    }

    function render_sentiment(doc_box, doc_idx, is_error) {
        let review_str = add_text_highlight(docs[doc_idx]['text'])

        doc_box.append('p')
            .html(`Text: ${review_str}`)

        doc_box.append('p')
            .html(`Label: ${vis.sentiment_label[docs[doc_idx]['label']]}`)

        doc_box.append('p')
            .html(`Prediction: <span style="color:${vis.pred_err_color[is_error]}">${vis.sentiment_label[+model_output[doc_idx]['y_pred']]}</span>`)
    }

    function add_text_highlight(text) {
        let processed_str = text;
        processed_rule.forEach(cond => {
            if (cond['sign'] == '>') {
                let feat = cond['feature'].replaceAll('_', " "),
                    regEx = new RegExp(feat, "ig");
                    
                processed_str = processed_str.replaceAll(regEx, (token) => {
                    return `<span style="background-color:#fde0dd">${token}</span>`
                })
            }
        })
        return processed_str;
    }

    function make_legend() {
        legend_svg.selectAll('*').remove();

        let y_offset = 10;
        legend_svg.append("rect")
            .attr("x", indent)
            .attr("y", y_offset)
            .attr("width", legend_size)
            .attr("height", legend_size)
            .attr("fill", vis.shap_color[0])
            .attr("stroke", "none");
        legend_svg.append("text")
            .attr("x", indent+legend_size+margin)
            .attr("y", y_offset+legend_size)
            .text("neg. shap");

        x_offset = indent + 100;

        legend_svg.append("rect")
            .attr("x", x_offset)
            .attr("y", y_offset)
            .attr("width", legend_size)
            .attr("height", legend_size)
            .attr("fill", vis.shap_color[1])
            .attr("stroke", "none");
        legend_svg.append("text")
            .attr("x", x_offset+legend_size+margin)
            .attr("y", y_offset+legend_size)
            .text("pos. shap");

    } 

    function update_shap_view() {
        let stat = process_shap_by_label();
        shap_svg.selectAll('*').remove();

        let pos_max = stat.reduce((max, p) => +p.positive > max ? +p.positive : max, 0),
        neg_max = stat.reduce((max, p) => +p.negative > max ? +p.negative : max, 0);

        let heightScale = d3.scaleLinear()
                .domain([0, (pos_max+neg_max)])
                .range([0, svg_height]),
            y_base = svg_height / (pos_max+neg_max) * pos_max,
            svg_width = stat.length * bar_width;

        shap_svg.attr('width', svg_width);
        d3.select('#shap_div').attr('width', svg_width);

        if (pos_max > neg_max) {
            stat.sort((a,b) => b.positive - a.positive == 0 ? b.negative - a.negative : b.positive - a.positive);
        } else {
            stat.sort((a,b) => b.negative - a.negative == 0 ? b.positive - a.positive : b.negative - a.negative);
        }

        let token_bars = shap_svg.append('g')
            .attr('transform', `translate(${20}, ${0})`)
            .selectAll('.token_stat')
            .data(stat).enter()
            .append('g')
            .attr('class', 'token_stat')
            .attr('transform', (d, i) => `translate(${i * bar_width}, 0)`);

        token_bars.selectAll('rect')
            .data(d => {
                return [
                    {'y': y_base - heightScale(d.positive), 'height': heightScale(d.positive), 'fill': vis.shap_color[1]},
                    {'y': y_base, 'height': heightScale(d.negative), 'fill': vis.shap_color[0]}
                ]
            }).enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', d => d.y)
            .attr('width', bar_width-5)
            .attr('height', d => d.height)
            .attr('fill', d => d.fill);


        shap_svg.selectAll('.tokens')
            .data(stat).enter()
            .append('g')
            .attr('class', 'tokens')
            .attr('font-size', '12px')
            .attr('transform', (d, i) => {
                if (pos_max > neg_max) {
                    return `translate(${20+i * bar_width+5}, ${y_base})rotate(315)`
                } else {
                    return `translate(${20+i * bar_width}, ${y_base+5})rotate(45)`
                }
            })
            .append('text')
            .text(d => d.token);

    }

    function process_shap_by_label() {
        token_list = {};
        shap_vals.forEach(doc_shaps => {
            doc_shaps[shap_pred].forEach(item => {
                if (!(item['token'] in token_list)) {
                    token_list[item['token']] = [0, 0];
                }
                if (item['val'] < 0) {
                    token_list[item['token']][0]++;
                } else {
                    token_list[item['token']][1]++;
                }
            })
        })
        stat = [];
        Object.keys(token_list).forEach(key => {
            let processed_key;

            if (key[0] == 'Ġ') {
                processed_key = key.substring(1);
            } else {
                processed_key = key;
            }
            stat.push({
                'token': processed_key,
                "positive": token_list[key][1],
                "negative": token_list[key][0],
            })
        })
        return stat;
    }

    return docView;
}
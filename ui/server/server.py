# Copyright (c) 2022, salesforce.com, inc.
# All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause
# For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause

import json
import os
import pandas as pd
import numpy as np
from flask import Flask
from flask_cors import CORS
from flask import request
from flask import send_from_directory
import os
from rule_explorer import util


app = Flask(__name__, static_folder="../static", template_folder="../static")
CORS(app)


@app.route("/",  methods=['POST', 'GET'])
def index():
	print("return index.html")
	return send_from_directory('../static/', 'index.html')

@app.route('/static/<path:path>',  methods=['POST', 'GET'])
def send_static(path):
	print("return file at: "+path)
	return send_from_directory('../static/', path)

@app.route('/data/<path:path>',  methods=['POST', 'GET'])
def send_data(path):
	print("return data: "+path)
	return send_from_directory('../data/', path)

@app.route("/get_stat/", methods=['POST', 'GET'])
def get_stat():
	print("===== get selected group stat =====")
	para = json.loads(str(request.get_json(force=True)))
	data_name = para['data_name']
	doc_list = para['doc_list']
	key_list = para['key_list']
	res = util.get_stat(data_name, doc_list, key_list)
	return json.dumps(res)

@app.route("/inspect_rule/", methods=['POST', 'GET'])
def inspect_rule():
	print("======== inspect customized rule =========")
	para = json.loads(str(request.get_json(force=True)))
	rules = para['rules']
	data_name = para['data_name']
	key_list = para['key_list']
	error_only = para['error_only']
	
	res = util.inspect_rule(rules, data_name, bool(+error_only))
	res['stat'] = util.get_stat(data_name, res['doc_list'], key_list)
	if (data_name == 'twitter' or 'mnli' in data_name):
		res['train_stat'] = util.get_stat_in_train(data_name, rules)

	return json.dumps(res)

@app.route("/update_concept", methods=['POST', 'GET'])
def update_concept():
	print("======== update customized concept =========")
	para = json.loads(str(request.get_json(force=True)))
	concept = para['concept']
	data_name = para['data_name']
	res = util.evaluate_concept(data_name, concept)
	return json.dumps(res)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7070)
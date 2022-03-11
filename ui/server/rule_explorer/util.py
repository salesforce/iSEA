# Copyright (c) 2022, salesforce.com, inc.
# All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause
# For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause

import json
import pandas as pd
from scipy import sparse
import numpy as np
from scipy.stats import bootstrap


def get_stat(data_name, doc_list, key_list):
	# read doc data
	with open("./data/"+data_name+"/doc.jsonl", "r") as json_input:
		data = json.load(json_input)
	model_output = pd.read_csv(filepath_or_buffer = "./data/"+data_name+"/model_output.csv")
	train_data_df = pd.DataFrame(data['content'])

	# read high-level feature
	hfeat_df = pd.read_csv(filepath_or_buffer = "./data/"+data_name+"/hfeat_stat.csv")
	if ("label" not in hfeat_df.columns):
		hfeat_df['label'] = model_output['y_gt'].values

	# get docs
	data_df = pd.DataFrame(train_data_df.iloc[doc_list])
	is_error = (model_output['y_gt'] != model_output['y_pred']).values.astype(int)[doc_list]

	# get stat by key
	to_save = {}
	charts = []
	cols = data_df.columns.values.tolist()
	for key in key_list:
		try:
			cols.index(key)
		except ValueError:
			continue
		stat_df = pd.DataFrame()
		stat_df[key] = data_df[key]
		stat_df['is_error'] = is_error
		to_render = stat_df.groupby([key]).sum().reset_index()
		to_render['tot'] = stat_df.groupby([key]).count().reset_index()['is_error']
		to_save['by_'+key] = to_render.to_dict("index")

	# stat by hfeat
	hfeat_doc_df = pd.DataFrame(hfeat_df.iloc[doc_list])
	for key in hfeat_df.columns:
		stat_df = pd.DataFrame()
		stat_df[key] = hfeat_doc_df[key]
		stat_df['is_error'] = is_error
		to_render = stat_df.groupby([key]).sum().reset_index()
		to_render['tot'] = stat_df.groupby([key]).count().reset_index()['is_error']
		to_save['by_'+key] = to_render.to_dict("index")

	return to_save

def get_stat_in_train(data_name, rules):
	read_train = False
	for rule in rules:
		if (rule['sign'] == '>') :
			read_train = True
			break

	if not read_train:
		return {}

	# read training set
	with open("./data/"+data_name+"/train_token_stat.json") as json_input:
		data = json.load(json_input)
		train_token_labels = data['token_labels']
		train_token_list = data['token_list']

	stat = {}
	for rule in rules:
		if rule['sign'] == '>':
			stat[rule['feature']] = [0] * len(train_token_labels[0])
			try:
				idx = train_token_list.index(rule['feature'])
				stat[rule['feature']] = train_token_labels[idx]
			except ValueError:
				continue
	return stat

def get_stat_id(data_name, doc_list, key_list):
	# read data
	with open("./data/"+data_name+"/doc_id.jsonl", "r") as json_input:
		data = json.load(json_input)

	model_output = pd.read_csv(filepath_or_buffer = "./data/"+data_name+"/model_output_id.csv")
	train_data_df = pd.DataFrame(data['content'])

	# get docs
	data_df = pd.DataFrame(train_data_df.iloc[doc_list])
	is_error = (model_output['y_gt'] != model_output['y_pred']).values.astype(int)[doc_list]

	# get stat by key
	to_save = {}
	charts = []
	for key in key_list:
		stat_df = pd.DataFrame()
		stat_df[key] = data_df[key]
		stat_df['is_error'] = is_error
		to_render = stat_df.groupby([key]).sum().reset_index()
		to_render['tot'] = stat_df.groupby([key]).count().reset_index()['is_error']
		to_save['by_'+key] = to_render.to_dict("index")
	return to_save

def inspect_rule(rule, data_name, error_only=False):
	path_generator = PathGenerator()
	path_generator.intialize(data_name, rule)
	res = []
	res = path_generator.get_doc_matched(rule, error_only)
	return res

def evaluate_concept(data_name, concept):
	concept_obj = Concept().intialize(data_name)
	res = concept_obj.generate_stat(concept)
	return res

class PathGenerator():
	BINARY = "BINARY"
	NUMERIC = "NUMERIC" 
	CONCEPT = "CONCEPT" 
	SHAP = True

	def intialize(self, data_name, rule):
		# read model output
		model_output = pd.read_csv(filepath_or_buffer = "./data/"+data_name+"/model_output.csv")
		self.is_error = (model_output['y_gt'] != model_output['y_pred']).values.astype(int)

		read_doc = False
		read_hfeat = False
		for cond in rule:
			if (cond['sign'] == '>' or cond['sign']=='is'):
				read_doc = True
				break
		for cond in rule:
			if (cond['sign'] == '='):
				read_hfeat = True
				break

		# read dense matrix
		self.matched_data = pd.DataFrame()
		self.cols = []
		if (read_doc):
			loaded = sparse.load_npz("./data/"+data_name+"/corpus_mat.npz")
			X = loaded.toarray()
			# read col nams
			with open("./data/"+data_name+"_binary/test.json") as json_input:
				data = json.load(json_input)
				cols = data['columns']
				self.good_idx = data['good_idx']
			self.df = pd.DataFrame(data=X, columns=cols)
			# self.words = cols
			self.matched_data = pd.concat([self.matched_data, self.df], axis=1, ignore_index=True)
			self.cols.extend(cols)

		if (read_hfeat):
			self.hfeat_df = pd.read_csv(filepath_or_buffer="./data/"+data_name+"/hfeat_stat.csv")
			# self.hfeat = self.hfeat_df.columns.values.tolist()
			self.matched_data = pd.concat([self.matched_data, self.hfeat_df], axis=1, ignore_index=True)
			self.cols.extend(self.hfeat_df.columns.values.tolist())

		self.matched_data.columns = self.cols

		# read shap values
		if (self.SHAP):
			with open('./data/'+data_name+"/shap_values.json") as json_input:
				self.top_tokens = json.load(json_input)['top_tokens']

		return self

	def get_doc_matched(self, rule, error_only=False):
		self.rule_to_inspect = rule
		res = {}
		rule_matched_table = np.zeros(shape=self.matched_data.shape[0])
		conds = rule
		
		path_info = self.get_cond_matched(0)

		matched_index = self.matched_data.index.values.astype(int)
		self.final_error_rate = 0
		if (matched_index.shape[0] > 0):
			self.final_error_rate = int(self.is_error[matched_index].sum())/matched_index.shape[0]
		
		res['doc_list'] = matched_index.tolist()
		res['path_info'] = path_info
		if (self.SHAP):
			res['top_token_list'] = [self.top_tokens[x] for x in matched_index]

		return res

	def get_cond_matched(self, ix):
		cond = self.rule_to_inspect[ix]
		col = cond['feature']
		sign = cond['sign']

		vals = []
		node_stat = cond
		node_stat["error_rate"] = 0

		# check the feature name exists or not
		if (sign == 'is'):
			for val in cond['val']:
				try:
					self.cols.index(val)
					vals.append(val)
				except ValueError:
					continue
			if (len(vals) == 0):
				node_stat["size"] = 0
				return node_stat
		else:
			try:
				self.cols.index(col)
			except ValueError:
				node_stat["size"] = 0
				return node_stat

		# check conditions
		if (sign == '>'):
			self.matched_data = self.matched_data[self.matched_data[col] > 0.5]
		elif (sign == '='):
			# hfeat
			val = cond['val']
			self.matched_data = self.matched_data[self.matched_data[col] == val]
		elif (sign == 'is'):
			# concept
			conds = pd.Series([False] * self.matched_data.shape[0])
			for val in vals:
				conds = conds | (self.matched_data[val] == 1)
			self.matched_data = self.matched_data[conds] 
		else:
			print("!!!!!! Error rule !!!!!!")

		matched_index = self.matched_data.index.values.astype(int)
		tot_doc = matched_index.shape[0]
		error_count = int(self.is_error[matched_index].sum())
		node_stat["size"] = tot_doc
		if tot_doc:
			node_stat['error_rate'] = error_count/float(tot_doc)
		if (ix < len(self.rule_to_inspect)-1):
			child_node = self.get_cond_matched(ix+1)
			node_stat['children'] = [child_node]
		return node_stat

	def get_or_cond_matched(self, ix):
		cond = self.rule_to_inspect[ix]
		node_stat = cond
		node_stat["error_rate"] = 0

		vals = []

		for val in cond['val']:
			try:
				self.cols.index(val)
				vals.append(val)
			except ValueError:
				continue
		
		if (len(vals) == 0):
			node_stat["size"] = 0
			return node_stat

		if (cond['sign'] == 'is'):
			conds = pd.Series([False] * self.matched_data.shape[0])
			for val in vals:
				conds = conds | (self.matched_data[val] == 1)
			self.matched_data = self.matched_data[conds]
		else:
			print("!!!!!! Error or rule !!!!!!")

		matched_index = self.matched_data.index.values.astype(int)
		tot_doc = matched_index.shape[0]
		error_count = int(self.is_error[matched_index].sum())
		node_stat["size"] = tot_doc
		if tot_doc:
			node_stat['error_rate'] = error_count/float(tot_doc)
		if (ix < len(self.rule_to_inspect)-1):
			child_node = self.get_or_cond_matched(ix+1)
			node_stat['children'] = [child_node]
		return node_stat

	def generate_hints(self):
		if (self.rule_type != self.BINARY):
			return []
		increase_err = []
		for col_idx in self.good_idx:
			col = self.cols[col_idx]
			x = self.matched_data[self.matched_data[col] > 0.5]
			matched_index = x.index.values.astype(int)
			error_count = int(self.is_error[matched_index].sum())
			if (matched_index.shape[0] > 20):
				err_rate = error_count/float(matched_index.shape[0])
				if (err_rate > self.final_error_rate):
					increase_err.append({
						'feature': col,
						'sign': '>',
						'threshold': 0.5,
						'err_rate': err_rate
					})
		return sorted(increase_err, key=lambda x: -x['err_rate'])[:2]

class Concept():
	def intialize(self, data_name):
		model_output = pd.read_csv(filepath_or_buffer = "./data/"+data_name+"/model_output.csv")
		self.is_error = (model_output['y_gt'] != model_output['y_pred']).values.astype(int)

		loaded = sparse.load_npz("./data/"+data_name+"/corpus_mat.npz")
		X = loaded.toarray()
		with open("./data/"+data_name+"_binary/test.json") as json_input:
			data = json.load(json_input)
			cols = data['columns']
		self.df = pd.DataFrame(data=X, columns=cols)
		self.cols = cols
		return self 

	def generate_stat(self, concept):
		concept_stat = {
			"err_rate": 0,
			"ci": [0,0],
			"support": 0,
		}
		# check word existence
		vals = []
		for val in concept:
			try:
				self.cols.index(val)
				vals.append(val)
			except ValueError:
				continue
		
		if (len(vals) == 0):
			concept_stat["support"] = 0
			return concept_stat

		self.matched_data = pd.DataFrame(self.df)
		conds = pd.Series([False] * self.matched_data.shape[0])
		for val in vals:
			conds = conds | (self.matched_data[val] == 1)
		self.matched_data = self.matched_data[conds]

		matched_index = self.matched_data.index.values.astype(int)
		tot_doc = matched_index.shape[0]
		concept_stat["support"] = tot_doc

		error_count = int(self.is_error[matched_index].sum())
		if tot_doc:
			concept_stat['err_rate'] = error_count/float(tot_doc)
			# calculate 0.95 ci
			data = (self.is_error[matched_index],)
			res = bootstrap(data, np.mean, confidence_level=0.95, random_state=np.random.default_rng())
			ci_l, ci_u = res.confidence_interval
			concept_stat['ci'] = [ci_l, ci_u]
		return concept_stat



# Copyright (c) 2022, salesforce.com, inc.
# All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause
# For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause

import numpy as np
import pandas as pd
import copy
from sklearn.ensemble import RandomForestClassifier
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.ensemble import AdaBoostClassifier
from sklearn.model_selection import cross_val_score
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score
from sklearn.metrics.pairwise import cosine_similarity
from scipy import sparse
from scipy import stats
from scipy.stats import bootstrap

MAXINT = 1073741819

class DebugRule:
    def initialize(self, X, y, filter_threshold,
            dataname=None, verbose=False):
        self.verbose = verbose
        self.all = X
        self.df = pd.DataFrame(data=X)
        self.train, self.test = train_test_split(self.df, test_size=0.1, random_state=42)
        train_idx = self.train.index
        test_idx = self.test.index
        self.X = X[train_idx]
        self.y = y[train_idx].astype(int)
        self.X_test = X[test_idx]
        self.y_test = y[test_idx].astype(int)

        self.filter_threshold = filter_threshold
        self.num_bin = np.ones(shape=self.X.shape[1]) * 3
        # the last col is always y_pred or label
        self.num_bin[-1] = np.unique(self.all[:,-1]).shape[0]
        self.num_bin = self.num_bin.astype(int)
        self.dataname = dataname

        self.model_err_rate = .3

        return self

    def numerical2ordinal(self):
        self.thresholds = np.zeros(shape=(self.X.shape[1],2))
        self.thresholds[:, 0] = np.percentile(self.all, 10, axis=0)
        self.thresholds[:, 1] = np.percentile(self.all, 90, axis=0)

        self.X = self.transform(self.X)
        self.X_test = self.transform(self.X_test)
        self.all = self.transform(self.all)
        return self

    def transform(self, X):
        cate_X = []
        num_bin = 3
        # the last col is always y_pred or label
        for col_idx in range(X.shape[1]-1):
            cate_X.append([self.transform_func(col_idx, ele, num_bin) for ele in X[:, col_idx]])
        cate_X.append(X[:, -1])
        
        cate_X = np.transpose(np.array(cate_X))
        return cate_X

    def transform_func(self, col_idx, ele, num_bin):
        for i in range(num_bin-1):
            if (ele <= self.thresholds[col_idx][i]):
                return i
        return num_bin-1

    def train_surrogate_random_forest(self):
        self.forest_model = "Random"
        rfc=RandomForestClassifier(random_state=1234, n_estimators=100,
            min_samples_leaf=50, 
            max_depth=3,
            class_weight="balanced_subsample")

        rfc.fit(self.X, self.y)
        if (self.verbose):
            print("***** finish training surrogate random forest *****")
           
        self.importances = rfc.feature_importances_
        
        return self

    def extract_debug_rules(self):
        if (self.rule_type == "token"):
            self.extract_token_rule()
        else:
            self.extract_high_level_rule()
        self.calculate_pval()
        return self

    def extract_token_rule(self):
        self.get_important_matrix()
        self.rules = []
        error_rates = np.zeros(shape=self.good_token_idx.shape[0])
        error_rates_test = np.zeros(shape=self.good_token_idx.shape[0])

        for i in range(len(self.good_token_idx)):
            '''one token rule'''
            error_idx = np.where(self.good_X[:, i] == 1)[0]
            error_idx_test = np.where(self.good_testX[:, i] == 1)[0]
            error_rates[i] = np.sum(self.y[error_idx])/error_idx.shape[0]
            error_rates_test[i] = np.sum(self.y_test[error_idx_test])/error_idx_test.shape[0]
            if (error_rates[i] > self.filter_threshold['err_rate'] and error_idx.shape[0] > self.filter_threshold['support']):
                self.rules.append({
                    'rules': [{'feature': i, 'sign': '>'}],
                    'doc_idx': error_idx.tolist(),
                    'doc_idx_test': error_idx_test.tolist(),
                    'err_rate': error_rates[i],
                    'err_rate_test': error_rates_test[i],
                })

        token_order = np.argsort(error_rates)
        largest_indices = token_order[::-1][:10]
        self.top_token_list = [{"feature": int(x), "err_rate": error_rates[x]} for x in largest_indices]

        for i in range(len(self.good_token_idx)):
            for j in range(i+1, len(self.good_token_idx)):
                error_idx = np.where(np.logical_and(self.good_X[:, i], self.good_X[:, j]) == 1)[0]
                error_idx_test = np.where(np.logical_and(self.good_testX[:, i], self.good_testX[:, j]) == 1)[0]

                err_rate = 0
                err_rate_test = 0
                if (error_idx.shape[0] > 0):
                    err_rate = np.sum(self.y[error_idx])/error_idx.shape[0]
                if (error_idx_test.shape[0] > 0):
                    err_rate_test = np.sum(self.y_test[error_idx_test])/error_idx_test.shape[0]

                if (err_rate > error_rates[i] and err_rate > error_rates[j] and 
                    err_rate > self.filter_threshold['err_rate'] and error_idx.shape[0] > self.filter_threshold['support']):
                    self.rules.append({
                        'rules': [{'feature': i, 'sign': '>'}, {'feature': j, 'sign': '>'}],
                        'doc_idx': error_idx.tolist(),
                        'doc_idx_test': error_idx_test.tolist(),
                        'err_rate': err_rate,
                        'err_rate_test': err_rate_test,
                    })

    def extract_high_level_rule(self):
        self.rules = []
        error_rates = np.zeros(shape=self.X.shape[1])
        error_rate_vals = np.zeros(shape=self.X.shape[1])
        error_rates_test = np.zeros(shape=self.X.shape[1])

        for i in range(self.X.shape[1]):
            '''one token rule'''
            for val in range(self.num_bin[i]):
                error_idx = np.where(self.X[:, i] == val)[0]
                error_idx_test = np.where(self.X_test[:, i] == val)[0]
                error_rate = np.sum(self.y[error_idx])/error_idx.shape[0]
                error_rate_test = np.sum(self.y_test[error_idx_test])/error_idx_test.shape[0]
                if (error_rate > self.filter_threshold['err_rate'] and error_idx.shape[0] > self.filter_threshold['support']):
                    self.rules.append({
                        'rules': [{'feature': i, 'sign': '=', 'val': val}],
                        'doc_idx': error_idx.tolist(),
                        'doc_idx_test': error_idx_test.tolist(),
                        'err_rate': error_rate,
                        'err_rate_test': error_rate_test,
                    })
                if error_rates[i] < error_rate:
                    error_rates[i] = error_rate
                    error_rate_vals[i] = val

        hfeat_order = np.argsort(error_rates)
        largest_indices = hfeat_order[::-1][:5]
        self.top_hfeat_list = [{"feature": int(x), "val": error_rate_vals[x], "err_rate": error_rates[x]} for x in largest_indices]

        for i in range(self.X.shape[1]):
            for val_i in range(self.num_bin[i]):
                temp_cond = (self.X[:, i] == val_i)
                temp_test_cond = (self.X_test[:, i] == val_i)
                for j in range(i+1, self.X.shape[1]):
                    for val_j in range(self.num_bin[i]):
                        error_idx = np.where(temp_cond & (self.X[:, j] == val_j))[0]
                        error_idx_test = np.where(temp_test_cond & (self.X_test[:, j] == val_j))[0]

                        err_rate = 0
                        err_rate_test = 0
                        if (error_idx.shape[0] > 0):
                            err_rate = np.sum(self.y[error_idx])/error_idx.shape[0]
                        if (error_idx_test.shape[0] > 0):
                            err_rate_test = np.sum(self.y_test[error_idx_test])/error_idx_test.shape[0]

                        if (err_rate > error_rates[i] and err_rate > error_rates[j] and err_rate > self.filter_threshold['err_rate'] and error_idx.shape[0] > self.filter_threshold['support']):
                            self.rules.append({
                                'rules': [{'feature': i, 'sign': '=', 'val': val_i}, 
                                    {'feature': j, 'sign': '=', 'val': val_j}],
                                'doc_idx': error_idx.tolist(),
                                'doc_idx_test': error_idx_test.tolist(),
                                'err_rate': err_rate,
                                'err_rate_test': err_rate_test,
                            })


    def get_important_matrix(self):
        if (np.sum(self.importances) > 0):
            self.good_token_idx = np.where(self.importances > 0)[0]
            print("tokens with importance > 0,", self.good_token_idx.shape[0])
        else:
            self.good_token_idx = np.range(self.importances.shape[0])
        self.good_X = self.X[:, self.good_token_idx]
        self.good_testX = self.X_test[:, self.good_token_idx]
        self.good_all = self.all[:, self.good_token_idx]

    def get_subgroup_similarity(self):
        A =  np.array(self.good_X.T)
        A_sparse = sparse.csr_matrix(A)
        self.similarities = cosine_similarity(A_sparse)

    def extract_or_rules(self):
        similarity_threshold = 0.50


    def get_p_right(self, doc_err_list, threshold):
        pop_mean = doc_err_list.mean()
        t, p_two = stats.ttest_1samp(doc_err_list, threshold)
        p_one = p_two/2
        return t, p_one

    def calculate_pval(self):
        for rule in self.rules:
            doc_err_list = self.y[rule['doc_idx']]
            t, p_one = self.get_p_right(doc_err_list, self.model_err_rate)
            rule['t_val'] = t
            rule['p_one'] = p_one

    # calculate 0.95 confidence interval (CI)
    def calculate_ci(self):
        for rule in self.rules:
            doc_err_list = (self.y[rule['doc_idx']],)
            res = bootstrap(doc_err_list, np.mean, confidence_level=0.95, random_state=np.random.default_rng())
            ci_l, ci_u = res.confidence_interval
            rule['ci'] = [ci_l, ci_u]




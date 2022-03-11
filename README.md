# iSEA: An Interactive Pipeline of Semantic Error Analysis for NLP models

This is the official code repository for[ iSEA: An Interactive Pipeline for Semantic Error Analysis of NLP Models](https://arxiv.org/abs/2203.04408), by [Jun Yuan](https://junyuanjun.github.io/), [Jesse Vig](https://twitter.com/jesse_vig), [Nazneen Rajani](https://twitter.com/nazneenrajani).

[](https://youtu.be/lyul-fBx_F0)<a href="https://youtu.be/lyul-fBx_F0" target="_blank">![](https://user-images.githubusercontent.com/9759891/157892428-0e750793-0ad5-4d36-9289-74d2665c3fa4.png)</a>

## Table of Contents

- [Repository Overview](https://github.com/salesforce/iSEA#repository-overview)

- [System Architecture](https://github.com/salesforce/iSEA#system-architecture)

- [Data & Model](https://github.com/salesforce/iSEA#data--model)

- [Citation](https://github.com/salesforce/iSEA#citation)

- [License](https://github.com/salesforce/iSEA#license)

## Repository Overview

This repository contains the following two parts:

- [`pre-process/`](https://github.com/salesforce/iSEA/tree/main/pre-process): This folder contains the code of pre-processing the text documents. We use the pre-trained DistilBERT as an example to demonstrate how we process the data in several Jupyter Notebook files. These notebooks include code for the following content: 
  
  - preprocessing of documents (tokenization, lemmatization, document embedding, etc.); 
  
  - model performance;
  
  - high-level feature generation;
  
  - rule generation;
  
  - instance-level model explanation (SHAP values).

- [`ui/`](https://github.com/salesforce/iSEA/tree/main/ui): This folder contains code and processed data of running the front-end.

## System Architecture

![image](https://user-images.githubusercontent.com/9759891/153971875-2b5e02d0-8e41-4336-9f0b-689d149397dc.png)

We first  pre-compute all the necessary information such as model output, analysis information, and error rules in the server. We then present this information in the user interface. Based on the user input, the server calculates subpopulation-level information (errors, document statistics, aggregated SHAP values, etc.) and returns this information back to the UI.

## Data & Model

In the paper, we present two use cases with the following data and models:

- For [`MultiNLI`](https://cims.nyu.edu/~sbowman/multinli/) dataset, we first train a [`DistilBERT`](https://huggingface.co/docs/transformers/model_doc/distilbert) model based on the *government* genre. We then analyze the model performance on the *travel* genre. The checkpoint can be found [here](https://storage.googleapis.com/sfr-isea-research/mnli_government.tar.gz).

- For the sentiment analysis task on [`Twitter`](https://huggingface.co/datasets/tweet_eval) dataset, we analyze the errors from the open-sourced [`twitter-roberta-base-sentiment`](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment) model on test data via our pipeline.

To apply iSEA to your own data/model, please follow the instructions in the `pre-process/` folder for data preprocessing and the instructions in the `ui/`. 

## Citation

When referencing this repository, please cite [this paper](https://arxiv.org/abs/2203.04408):

```
@misc{yuan22isea,
      title={iSEA: An Interactive Pipeline for Semantic Error Analysis of NLP Models}, 
      author={Yuan, Jun and Vig, Jesse and Rajani, Nazneen},
      year={2022},
      eprint={2203.04408},
      archivePrefix={arXiv},
      primaryClass={cs.HC},
      url={https://arxiv.org/abs/2203.04408}
}
```

## License

This repository is released under the [BSD-3 License](https://github.com/salesforce/query-focused-sum/blob/master/LICENSE.txt).

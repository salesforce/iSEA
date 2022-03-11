# User Interface

This folder contains the code of running the user interface.

To start the local server, you can run `python server/server.py` inside this folder. 

Then you can visit `http://localhost:7070/` to interact with the user interface.

The code of the system of iSEA is organized as below:

- The `data/` folder contains the pre-computed data. We describe thedata processing step in the [pre-process/](https://github.com/salesforce/iSEA/tree/main/pre-process) directory.  For a given <data_name> (e.g., "twitter", "mnli_government" as we describe in the paper), the following files should be included to run the web application successfully:
  
  - `<data_name>_binary/list.json`: the binary rule (based on tokens).
  
  - `<data_name>_binary/test.json`: the tokens.
  
  - `<data_name>/doc.jsonl`: the actual documents. The format of the this file is slightly different from the one used during data process when used for the user interface. Check [`/pre-process/02-doc_process`](https://github.com/salesforce/iSEA/blob/main/pre-process/02-doc_process%20(train%2Btest).ipynb) for more details.
  
  - `<data_name>/model_output.csv`: model predictions and ground truth.
  
  - `<data_name>/model_stat.json`:  model performance statistics used for the overall stat. view.
  
  - `<data_name>/hfeat_stat.csv`: extracted high-level features.
  
  - `<data_name>_hfeat/list.json`: the extracted rules based on high-level features.
  
  - `<data_name>_hfeat/test.json`: features used as high-level features, and thresholds for low/medium/high values.
  
  - `<data_name>/sentence_tsne.csv`: 2-dimensional projection of document embeddings for each document (2d positions in the projection view).

- The `server/` folder contains the code of the server side, include app routing function supported by `Flask`, and other real-time computation functions.

- The `static/` folder contains all the front-end code, including the visualization and interactive functions.
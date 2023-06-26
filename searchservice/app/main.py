"""
Main module for the FastAPI search service.
"""
from genericpath import isfile
import imp
from config import Settings

import os
import pathlib
from fastapi import  Request,Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi import FastAPI, Query, BackgroundTasks
import uvicorn
import time
import numpy as np
import urllib
import json
from typing import List
from pydantic import BaseModel
import torch
from decisionbranches.utils.helpers import generate_fidxs
from searchers.db_searchengine.decisionbranch import DBSearchEngine,EnsembleSearchEngine
from searchers.trees.decisiontree import DTreeSearchEngine
from searchers.trees.randomforest import RFSearchEngine
from searchers.nn_search import NNSearchEngine
from py_kdtree.kdtree import KDTree
from py_kdtree.treeset import KDTreeSet

start_time = time.time()
print("service starting!")

# This environment variable has to be set to avoid errors. It is a workaround but we did not experience any unwanted behavior.
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

STORAGE_PATH = os.environ['SEARCH_STORAGE_PATH']
os.makedirs(STORAGE_PATH, exist_ok=True)

app = FastAPI()

# # We added wildcard CORS middleware for development. For production use this should be refined to only allow valid requests.
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ALLOWED_ORIGINS = '*' 
# # handle CORS preflight requests
# @app.options('/{rest_of_path:path}')
# async def preflight_handler(request: Request, rest_of_path: str) -> Response:
#     response = Response()
#     response.headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS
#     response.headers['Access-Control-Allow-Methods'] = 'POST, GET, DELETE, OPTIONS'
#     response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
#     return response

class SearchIndices(BaseModel):
    idxs_rare: List[int] = []
    idxs_nonrare: List[int] = []

searchers = {}
for s in Settings.Config.cfg.keys():
    print(f"######## Load Layer: {s} ##############")
    CFG = Settings.Config.cfg[s]
    non_rare_feat = None

    ######  Decisionbranches ########
    print("Load DB models")
    db_models = {}
    idx_cfg = CFG["kdt_search"]
    for s_name,s_cfg in CFG["searcher"].items():
        if s_name.startswith("db"):
            search_inst = DBSearchEngine(CFG["nfeat"],idx_cfg["fidx_cfg"]["nfeat"],idx_cfg["fidx_cfg"]["nind"],s_cfg["db_cfg"],s_cfg["njobs"],CFG["seed"])
        elif s_name.startswith("ens"):
            search_inst = EnsembleSearchEngine(CFG["nfeat"],idx_cfg["fidx_cfg"]["nfeat"],idx_cfg["fidx_cfg"]["nind"],
                                                s_cfg["ens_nestimators"],s_cfg["db_cfg"],s_cfg["njobs"],CFG["seed"])
        elif s_name.startswith("dtree"):
            search_inst = DTreeSearchEngine(s_cfg["dtree_cfg"],CFG["seed"])
        elif s_name.startswith("rf"):
            search_inst = RFSearchEngine(s_cfg["rf_cfg"],CFG["seed"])
        elif s_name.startswith("nn"):
            search_inst = NNSearchEngine(s_cfg["nn_k"],CFG["seed"])
        db_models[s_name] = search_inst


    #######  Mapper #######
    patch_mapping = np.load(CFG["mapping_file"])
    cfg = CFG["kdt_mapper"] 
    print("Load KDtree mapping")
    kdt_mapper = KDTree(leaf_size=cfg["leafsize"],path=cfg["model_path"],dtype=cfg["dtype"],inmemory=cfg["inmemory"],verbose=False)
    
    if kdt_mapper.tree is None:
        centers = patch_mapping[:,-4:-2] + ((patch_mapping[:,-2:] - patch_mapping[:,-4:-2]) / 2)
        kdt_mapper.fit(centers.astype(cfg["dtype"]))
    
    print("Load Features")
    mmap_file = os.path.join(CFG["feature_mmap_path"],s+".mmap")
    is_mmap = False
    if os.path.isfile(mmap_file):
        print("Load mmap file")
        features = np.memmap(mmap_file,dtype='float32', mode='r', shape=(len(patch_mapping),CFG["nfeat"]))
        is_mmap = True
    else:
        if CFG["feature_file"].endswith(".npy"):
            features_arr = np.load(CFG["feature_file"])
        elif CFG["feature_file"].endswith(".pth"):
            features_arr = torch.load(CFG["feature_file"]).numpy()
        elif CFG["feature_file"].endswith(".mmap"):
            features = np.memmap(CFG["feature_file"], dtype=CFG["feature_mmap_dtype"], mode='r', shape=(len(patch_mapping),CFG["nfeat"]))
            is_mmap = True

    
    if CFG["features_inmemory"] == True:
        if is_mmap:
            print("Load features into memory from mmap")
            features = features[:].copy()
        else:
            print("Keep features in memory")
            features = features_arr
            del features_arr
    else:
        if not is_mmap:
            if "write_mmap" in CFG.keys():   
                if CFG["write_mmap"]:
                    print("Write features to disk")
                    pathlib.Path(CFG["feature_mmap_path"]).mkdir(parents=True,exist_ok=True)
                    features = np.memmap(mmap_file,dtype='float64', mode='w+', shape=tuple(features_arr.shape))
                    features[:] = features_arr[:]
                    del features_arr
    
    if "non_rare_idxs" in CFG.keys():
        if CFG["non_rare_idxs"] is not None:
            if CFG["non_rare_idxs"] ==  "auto":
                print("Sample non rare idxs automatically!")
                if "non_rare_idxs_num" in CFG.keys():
                    n_nonrare = CFG["non_rare_idxs_num"]
                else:
                    n_nonrare = 1000
                non_rare_idxs = np.random.choice(np.arange(len(features)),size=n_nonrare,replace=False)
                non_rare_idxs.sort()
                non_rare_feat = features[non_rare_idxs]
                non_rare_feat = non_rare_feat.astype(CFG["kdt_search"]["kdtree_dtype"])
                print("N non rares:",len(non_rare_feat))

            elif os.path.isfile(CFG["non_rare_idxs"]):
                print("Load non rare features!")
                non_rare_idxs = np.load(CFG["non_rare_file"])
                non_rare_idxs.sort()
                non_rare_feat = features[non_rare_idxs]
                non_rare_feat = non_rare_feat.astype(CFG["kdt_search"]["kdtree_dtype"])
            else:
                print("No correct input specified for non_rare_idxs")
            


    ##### Search #########
    if "kdt_search" in CFG.keys():
        cfg = CFG["kdt_search"]

        if cfg["index_file"] is not None:
                indexes = np.load(cfg["index_file"])
        else:
            indexes =  generate_fidxs(n_feat=cfg["fidx_cfg"]["nfeat"],n_ind=cfg["fidx_cfg"]["nind"],feats=np.arange(features.shape[1]),seed=CFG["seed"])

        print("Load KDtree search")
        kdt_search = KDTreeSet(indexes,path=cfg["index_dir"],leaf_size=cfg["kdtree_leafsize"],dtype=cfg["kdtree_dtype"],verbose=False)
        print("Create Kdtree indexes")
        if CFG["features_inmemory"]:
            kdt_search.fit(features,mmap=False)
        elif CFG["features_inmemory"] == "subset":
            kdt_search.fit(features,mmap=False)
        else:
            kdt_search.fit(features,mmap=True)
    else:
        print("No KDtree for search given!")
        kdt_search = None

    searchers[s] = {"mapping": patch_mapping,"features":features,"kdt_mapper":kdt_mapper,"kdt_search":kdt_search,"searcher":db_models,
                    "non_rare_feat": non_rare_feat,"seed":CFG["seed"]}

# No empty response
@app.get("/")
async def redirect():
    """
    Empty requests redirect to the docs page.
    """
    return RedirectResponse(url="/docs")


@app.get("/ping")
async def ping():
    """Healthcheck endpoint"""
    return "pong!"

@app.get("/get_available_searchers")
async def get_available_searchers():
    s_dict = {}
    cfg = Settings.Config.cfg
    for layer in cfg.keys():
        s_layer = []
        for s in cfg[layer]["searcher"].keys():
            searcher_display_name = cfg[layer]["searcher"][s]["display_name"]
            searcher_id = layer + "_" + s
            s_layer.append([searcher_display_name,searcher_id])
        s_dict[layer] = {"layer_cfg":{"patch_size":cfg[layer]["patch_size"]},"searchers":s_layer,"layer_display_name":cfg[layer]["display_name"],
                        "max_nonrare_samples":cfg[layer]["non_rare_idxs_num"]}
    return JSONResponse(s_dict)



@app.post("/search/{layer}/{searcher_name}/")
async def search(layer: str, searcher_name: str, search_indices: SearchIndices,n_nonrare_samples: int,background_tasks: BackgroundTasks,mapped_idx=True,nresults=None):
    start_time = time.time()
    print("started search!")
    if searcher_name.startswith(layer):
        db = searcher_name[len(layer)+1:]

    np.random.seed(int(searchers[layer]["seed"]))

    idxs_rare = np.array(search_indices.idxs_rare,dtype="int")
    idxs_nonrare = np.array(search_indices.idxs_nonrare,dtype="int")

    db_model = searchers[layer]["searcher"][db]
    features = searchers[layer]["features"]
    mapping = searchers[layer]["mapping"]
    treeset = searchers[layer]["kdt_search"]
    nonrare_feat =  searchers[layer]["non_rare_feat"]

    assert (len(idxs_rare) > 0)
    if not db.startswith("nn"):
        assert len(idxs_nonrare) > 0 

    idxs_rare.sort()
    idxs_nonrare.sort()

    start_load = time.time()
    idxs = np.hstack([idxs_rare,idxs_nonrare])
    order = idxs.argsort()
    idxs = idxs[order]
    X_train = features[idxs]
    
    if X_train.dtype != np.dtype(treeset.dtype):
        X_train = X_train.astype(treeset.dtype)

    start_nonrare_sampling = time.time()
    if (nonrare_feat is not None) and (n_nonrare_samples > 0):
        print("INFO: Included extra non rare elements")
        if nonrare_feat.dtype != np.dtype(treeset.dtype):
            print("INFO: dtype of non rare features needed to be transformed")
            nonrare_feat = nonrare_feat.astype(treeset.dtype)

        if len(nonrare_feat) > n_nonrare_samples:
            subset_idxs = np.random.choice(np.arange(len(nonrare_feat)),size=n_nonrare_samples,replace=False)
            nonrare_subset = nonrare_feat[subset_idxs]
        else:
            nonrare_subset = nonrare_feat

        print(len(X_train))
        X_train = np.vstack([X_train,nonrare_subset])
        print(len(X_train))
        add_non = np.arange(len(order),len(order)+len(nonrare_subset))
        order = np.hstack([order,add_non])
    end_nonrare_sampling = time.time()

    y_train = np.zeros(len(X_train))
    y_train[:len(idxs_rare)] = 1
    y_train = y_train[order]
    end_load = time.time()

    start_model = time.time()
    if db.startswith("db") or db.startswith("ens"):
        inds = db_model.search(X_train, y_train,features,treeset)
    elif db.startswith("nn"):
        inds = db_model.search(X_train, y_train,treeset)
    else:
        inds = db_model.search(X_train, y_train,features)
    end_model = time.time()
    
    windows = mapping[inds]#[1:]

    if mapped_idx:
        windows[:,0] = inds


    #Only first nresults images are returned as these are also only displayed on the map -> performance
    n_returned = len(windows) 

    windows_sub = windows[:10]

    if nresults is not None:
        nresults = int(nresults)
        windows = windows[:nresults]

    search_id = str(start_time).replace(".","")
    start_save = time.time()
    background_tasks.add_task(store_results, windows[10:],search_id)
    end_save = time.time()

    end_time = time.time()
    print(f"******************")
    print(f"Loading features took {end_load-start_load: .3f} s")
    print(f"Sampling Nonrares {end_nonrare_sampling-start_nonrare_sampling: .3f} s")
    print(f"Model training took {end_model-start_model: .3f} s")
    print(f"Saving features took: {end_save-start_save: .3f} s")
    print(f"Complete query took {end_time-start_time: .3f} s")
    return JSONResponse({"results":windows_sub.tolist(),"time":end_time-start_time,"n_results":n_returned,"search_id":search_id})

@app.get("/get_search_results/{search_id}")
async def get_search_results(search_id: str):
    filename = os.path.join(STORAGE_PATH,search_id+".npy")
    if os.path.isfile(filename):
        windows = np.load(filename)
        os.remove(filename)
        return JSONResponse({"results":windows.tolist()})
    else:
        return JSONResponse({"results":None})


@app.get("/get_box/{layer}/{long}/{lat}/{size}")
async def get_box_from_xy(layer: str, long: float,lat: float,size:int,max_dist=5,in_crs=4326,out_crs=4326):
    #TODO add size to parameters!
    #TODO what about boxes not included in the data?
    kdt = searchers[layer]["kdt_mapper"]
    mapping = searchers[layer]["mapping"]
    arr = np.array([lat,long],dtype=kdt.dtype)
    
    inds,dist,_,_ = kdt.query_point_cy(arr,k=1)
    nw_long,nw_lat,se_long,se_lat = mapping[inds[0]][-4:].tolist()
    box = [[se_long,se_lat],[se_long,nw_lat],[nw_long,nw_lat],[nw_long,se_lat]]

    if dist[0] > max_dist:
        idx = -1
    else:
        idx = int(inds[0])

    return JSONResponse({"rectangle":box,"idx":idx})

@app.get("/get_box_idx/{layer}/{size}/{idx}")
async def get_box_from_idx(layer: str,size:int,idx: int):
    mapping = searchers[layer]["mapping"]

    nw_long,nw_lat,se_long,se_lat = mapping[idx][-4:].tolist()
    box = [[se_long,se_lat],[se_long,nw_lat],[nw_long,nw_lat],[nw_long,se_lat]]

    return JSONResponse({"rectangle":box})

@app.get("/get_boxes_from_area/{layer}/{top_long}/{top_lat}/{bot_long}/{bot_lat}/{size}")
async def get_boxes_from_area(layer: str, top_long: float,top_lat: float,bot_long: float,bot_lat: float, size:int,max_dist=5,in_crs=4326,out_crs=4326):
    #TODO add size to parameters!
    #TODO what about boxes not included in the data?
    kdt = searchers[layer]["kdt_mapper"]
    mapping = searchers[layer]["mapping"]

    mins = np.array([bot_long,bot_lat],dtype=kdt.dtype)
    maxs = np.array([top_long,top_lat],dtype=kdt.dtype)
    
    inds,_,_ = kdt.query_box_cy(mins,maxs)

    xy = mapping[inds][:,-4:] #nwlong,nwlat,selong,selat

    return JSONResponse({"rectangles":xy.tolist(),"idxs":inds.tolist()})

print("server took ", time.time()-start_time, "s to start")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=80)

def parse_uri(encoded):
    s = urllib.parse.unquote(encoded, encoding='utf-8', errors='replace')
    return json.loads(s)


def store_results(array,search_id):
    filename = os.path.join(STORAGE_PATH,search_id+".npy")
    np.save(filename,array)

    #delete old files
    current_time = time.time()
    for filename in os.listdir(STORAGE_PATH):
        filepath = os.path.join(STORAGE_PATH, filename)
        if os.path.isfile(filepath) and (current_time - os.path.getmtime(filepath)) > 600: #10 minutes
            os.remove(filepath)

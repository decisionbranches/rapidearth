"""
Configurations variables for the search service.
"""
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Settings for the search service."""

    app_name: str = "Search Service"

    class Config:
        cfg = {
        "dk_vit_400x_step200_n384_nfeat4": {
                        "display_name": "DK ViT Features 400px Nfeat4",
                        "feature_file": "assets/features_50_dino_px400_float16.npy", 
                        "feature_mmap_path": "indexes/features",
                        "feature_mmap_dtype": "float32",
                        "features_inmemory": True,#True, #False, for mmap
                        "nfeat":384,
                        "non_rare_idxs": "auto",
                        "non_rare_idxs_num": 20_000,#30_000,
                        "seed": 42,
                        "patch_size": 400,
                        "mapping_file": "assets/mapping_400px_step200_V1.npy", #"assets/mapping_V2_part_50.npy",
                        "kdt_mapper": {
                                "dtype":"float64",
                                "leafsize":50,
                                "model_path":"indexes/dk_mapper_400px_stepsize200",
                                "inmemory":True,
                        },
                        "kdt_search":{
                                "index_file": None,#"assets/feature_subsets.npy",
                                "index_dir": "indexes/dk_vit_400px_n384_nfeat4",
                                "kdtree_leafsize": 4500,
                                "kdtree_dtype":"float64",
                                "fidx_cfg": {"nfeat": 4,"nind":200},
                        },
                        "searcher": {
                                "db-maxevals0.5-demo": {
                                        "display_name": "Decisionbranches Demo",
                                        "db_cfg":{"max_nbox":30,"top_down":False,"max_evals":0.5,"stop_infinite":True,"postTree":False,"min_pts":10},
                                        "njobs": 1,
                                },
                                "ens": {
                                        "ens_nestimators":25,
                                        "db_cfg":{"max_nbox":30,"top_down":False,"max_evals":0.5,"stop_infinite":False,"postTree":False},
                                        "njobs": None,
                                        "display_name": "Decisionbranches Ensemble (25 trees)",
                                },
                                "dtree": {
                                        "dtree_cfg":{},
                                        "display_name": "Decision Tree",
                                },
                                "rf": {
                                        "rf_cfg": {"n_estimators":25},
                                        "display_name": "Random Forest (25t)",
                                },
                                "nn":{
                                        "nn_k": 1000,
                                        "display_name": "Nearest Neighbor Search (k=1000)",
                                }
                        }

                  },
 
                }


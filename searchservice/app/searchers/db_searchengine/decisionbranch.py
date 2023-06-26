import numpy as np
import time as t
from decisionbranches.models.boxSearch.boxClassifier import BoxClassifier
from decisionbranches.models.boxSearch.ensemble import Ensemble
from .multiprocessing import NoDaemonPool

class DBSearchEngine:
    def __init__(self,totfeat,nfeat,nind,db_cfg,njobs,seed):
        self.njobs = njobs
        self.seed = seed

        #Box classifier parameters
        self.db_totfeat = totfeat
        self.db_nfeat = nfeat
        self.db_nind = nind
        self.db_postTree = db_cfg.pop("postTree")
        self.db_cfg = db_cfg

        model = BoxClassifier(tot_feat=self.db_totfeat,n_feat=self.db_nfeat,n_ind=self.db_nind,
                                cfg=self.db_cfg,postTree=self.db_postTree,n_jobs=self.njobs,seed=self.seed)#,verbose=False)
        
        if njobs > 1:
            pool = NoDaemonPool(1,initializer=initialize_model,initargs=(model,))
            self.pool = pool
            self.model = None
        else:
            self.model = model
            self.pool = None

    def search(self,X_train,y_train,features,treeset):
        if self.pool is None:
            self.model.fit(X_train,y_train)

            mins,maxs,fidxs = self.model.get_boxes()
        else:
            mins,maxs,fidxs = self.pool.map(fit_model,[(X_train,y_train)])[0]

        start = t.time()
        #### Query boxes #########
        if self.db_postTree == False:
            inds,counts,time,loaded_leaves = treeset.multi_query_ranked_cy(mins,maxs,fidxs)

        else:
            inds = []
            for idx in range(len(fidxs)):
                #TODO return not just indices but also features
                i,time,loaded_leaves = treeset.query_cy(mins[idx],maxs[idx],fidxs[idx])
                X_filter = features[i]
                preds = self.model.tree[idx].predict(X_filter).astype(bool)
                i = i[preds]
                inds.append(i)
            inds = np.unique(inds)
        end = t.time()
        print(f"KDtree search took: {end-start:.3f}")

        return inds


class EnsembleSearchEngine:
    def __init__(self,totfeat,nfeat,nind,ens_nestimators,db_cfg,njobs,seed):
        if njobs is None:
            self.njobs = ens_nestimators
        else:
            self.njobs = njobs
        self.seed = seed

        #Box classifier parameters
        self.db_totfeat = totfeat
        self.db_nfeat = nfeat
        self.db_nind = nind
        self.db_postTree = db_cfg.pop("postTree")
        self.db_cfg = db_cfg

        self.ens_nestimators = ens_nestimators

        self.model = Ensemble(n_estimators=self.ens_nestimators,tot_feat=self.db_totfeat,n_feat=self.db_nfeat,n_ind=self.db_nind,
                        cfg=self.db_cfg,postTree=self.db_postTree,n_jobs=self.njobs,seed=self.seed)#,verbose=False)

    def search(self,X_train, y_train,features,treeset):

        # #TODO do this filtering in the fronted when selecting the cell to save query time
        # idxs_rare = np.intersect1d(idxs_rare,self.mapping[:,0])
        # idxs_nonrare = np.intersect1d(idxs_nonrare,self.mapping[:,0])

        self.model.fit(X_train,y_train)

        mins,maxs,fidxs = self.model.get_boxes()

        start = t.time()
        #### Query boxes #########
        inds,counts,time,loaded_leaves = treeset.multi_query_ranked_cy(mins,maxs,fidxs)

        inds = inds[np.where(counts > self.ens_nestimators // 2)]
        end = t.time()
        print(f"KDtree search took: {end-start:.3f}")

        return inds

    
def initialize_model(m):
    global model
    model = m

def fit_model(args):
    X_train,y_train = args
    model.fit(X_train,y_train)
    return model.get_boxes()
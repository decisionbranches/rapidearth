"""
Python script that loads a template and renders it.
"""
from django.shortcuts import render
from django.http.response import HttpResponse,JsonResponse
from fiona.transform import transform
import rasterio
import math
import requests
import numpy as np

# mapping = {"dk_sub": np.load("/usr/src/app/assets/mapping_V2_part.npy")[:,0],
#             "dk":np.load("/usr/src/app/assets/mapping_V3.npy")[:,0]} #for 50: np.load("/usr/src/app/assets/mapping_V2_part_50.npy")[:,0], #np.load("/usr/src/app/assets/non_empty_idxs_dk_sub.npy")}

# Create your views here.
def index(request):
    return render(request, 'search.html')


# # ### Functions 
# #@api_view(['GET'])
# def get_box_from_latlong(request):
#     longitude = float(request.GET.get('lng'))
#     latitude = float(request.GET.get("lat"))
#     size = int(request.GET.get("size"))
#     layer = str(request.GET.get("layer"))
#     src_crs = "EPSG:"+str(request.GET.get("crs"))
#     dst_crs = "EPSG:3857"

#     longitude,latitude = transform(src_crs, dst_crs, [longitude], [latitude])
    
#     longs,lats,idx = calc_rectangle_coords(longitude,latitude,layer,size)

#     if (idx != -1):
#     #     i = np.where(idx == mapping[layer])[0]
#     #     if len(i) == 0:
#     #         idx = -1
#     #     else:
#     #         idx = int(i)
#         longs,lats = transform(dst_crs,src_crs,longs,lats)
#         rec = list(zip(lats,longs))
#     else:
#         rec = None

#     return JsonResponse({"rectangle":[rec],"idx":idx})

# def calc_rectangle_coords(longitude,latitude,layer,size):
#     #TODO global variable !
#     if layer == "dk" or layer == "dk_sub":
#         width = 3825911
#         height = 3092556
#         transform = rasterio.Affine(0.20805092429419356, 0.0, 897686.0842238902,
#         0.0, -0.20805092429419356, 7916949.670825127)
#     px,py = rasterio.transform.rowcol(transform, longitude, latitude)

#     px = px[0]
#     py = py[0]

#     step_size = size #/ 2

#     ##math.floorh-patch_size[0]+2*padding) // step_size)
#     nx = math.floor(px  / step_size)
#     ny = math.floor(py / step_size)
#     # nx = math.floor(px / size)
#     # ny = math.floor(py / size)

#     #nx_total = math.ceil(width / size)
#     nx_total = math.ceil(width / step_size)
#     #ny_total = math.ceil(height / size)
#     idx = ny + (nx_total * nx)

#     if (px > height) or (px < 0) or (py > width) or (py < 0):
#         idx = -1
#         longs = None
#         lats = None
#     else:
#         # Order: bottom_right,bottom_left,top_left,top_right
#         rec_rows = [nx*size,nx*size,(nx+1)*size,(nx+1)*size]
#         rec_cols = [(ny+1)*size,ny*size,ny*size,(ny+1)*size]
#         # rec_rows = [nx*step_size,nx*step_size,(nx+2)*step_size,(nx+2)*step_size]
#         # rec_cols = [(ny+2)*step_size,ny*step_size,ny*step_size,(ny+2)*step_size]
#         longs,lats = rasterio.transform.xy(transform,rec_rows,rec_cols)
    
#     return longs,lats,idx

# # ### Functions 
# #@api_view(['GET'])
# #TODO add out crs + reduced mapping file where box coordinates are calculated based on pixel coordinates (col_off / row_off)
# def get_mapping(request):
#     layer = str(request.GET.get("layer"))
#     idx = int(request.GET.get('idx'))
#     patch = mapping[layer][idx]
#     response = {
#         "idx": patch[0],
#         "col_off": patch[1],
#         "row_off": patch[2],
#         "size": patch[3],
#         "nw_long": patch[4],
#         "nw_lat": patch[5],
#         "se_long": patch[6],
#         "se_lat": patch[7]
#     }
#     return JsonResponse(response)
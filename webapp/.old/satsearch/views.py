"""
Python script that retrieves data according to the requested parameters, loads a template and renders the template with the retrieved data.
"""
from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
import requests
import numpy as np
from sklearn.neighbors import KDTree
from pyproj import Transformer
import json

# Create CRS transformers
transformer_to_leaflet = Transformer.from_crs(3857, 4326,  always_xy=True)
transformer_from_leaflet = Transformer.from_crs(4326, 3857, always_xy=True)


# Create your views here.
def index(request):
    return render(request, 'index.html')


@api_view(['GET'])
def grid(request):
    lon = request.GET.get('lng')
    lat = request.GET.get('lat')
    (x, y) = transformer_from_leaflet.transform(lon, lat)

    # Query the KDTree to get the Nearest Neighbour
    coordinates = [[x, y]]
    np_array = np.array(coordinates)
    nearest_dist, nearest_ind = kdtree.query(np_array, k=1)
    search_area_center_x = kdtree.data[nearest_ind[0][0]][0]
    search_area_center_y = kdtree.data[nearest_ind[0][0]][1]

    # Transform Nearest Neighbour back to Leaflet CRS
    (leaflet_lon, leaflet_lat) = transformer_to_leaflet.transform(search_area_center_x, search_area_center_y)

    return Response(
        data={"epsg4326": [leaflet_lon, leaflet_lat]}, status=status.HTTP_200_OK)


# Receive the search area of the user
@api_view(['GET'])
def search_area(request):
    lon = request.GET.get('lng')
    lat = request.GET.get('lat')

    # Transform the Leaflet point to the CRS for the KDTree
    (x, y) = transformer_from_leaflet.transform(lon, lat)
    print(f'Transformed lng to x: {x}, Transformed lat to y: {y}.')

    # Query the KDTree to get the Nearest Neighbour
    coordinates = [[x, y]]
    np_array = np.array(coordinates)
    nearest_dist, nearest_ind = kdtree.query(np_array, k=1)
    print('ID of nearest neighbour: ' + str(nearest_ind[0][0]))
    search_area_center_x = kdtree.data[nearest_ind[0][0]][0]
    search_area_center_y = kdtree.data[nearest_ind[0][0]][1]

    # Transform Nearest Neighbour back to Leaflet CRS
    (leaflet_lon, leaflet_lat) = transformer_to_leaflet.transform(search_area_center_x, search_area_center_y)
    print(f'NN in Leaflet CRS: Lat: {leaflet_lat}, Lng: {leaflet_lon}.')

    return Response(data={"epsg4326": [leaflet_lon, leaflet_lat], "epsg3857": [search_area_center_x, search_area_center_y]}, status=status.HTTP_200_OK)


# Receive the search area of the user and return results as a response
@api_view(['GET'])
def search(request):
    limit = 1000
    x = request.GET.get('x')
    y = request.GET.get('y')
    cutout_size = "200.0"

    print(f'https://searchservice.dev.search-engine.space/search/{y}/{x}/{cutout_size}')
    try:
        r = requests.get(f'https://searchservice.dev.search-engine.space/search/{y}/{x}/{cutout_size}')
        search_result_response = json.loads(r.text)
    except Exception as e:
        print(str(e))
        search_result_response = {"data": []}

    # Transform search results to Leaflet CRS
    search_results_epsg_4326 = []
    search_results_epsg_3857 = []
    for result in search_result_response.get("data", []):
        search_results_epsg_4326.append(transformer_to_leaflet.transform(result["x"], result["y"]))
        search_results_epsg_3857.append([result["x"], result["y"], result["distance"]])

    return Response(data={"epsg4326": search_results_epsg_4326[:limit], "epsg3857":  search_results_epsg_3857[:limit]}, status=status.HTTP_200_OK)


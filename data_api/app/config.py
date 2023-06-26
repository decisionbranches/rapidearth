import os
from typing import List, Tuple, Union
from pydantic import BaseSettings, BaseModel

class DataWindow(BaseModel):
    """ResponseModel for single data windows"""
    row: int
    col: int
    coordinates: Tuple[float, float]
    size: int
    window: List[List[List[Union[int, float]]]]

class CountriesList(BaseModel):
    """ResponseModel for the crs info endpoint"""
    countries: List[str]

class BoxCorners(BaseModel):
    """ResponseModel for the corners endpoint"""
    top_left: Tuple[float, float]
    top_right: Tuple[float, float]
    bottom_left: Tuple[float, float]
    bottom_right: Tuple[float, float]


class Settings(BaseSettings):
    """Settings read from the .env file in the parent directory"""
    app_name: str = "BucketAPI"
    aws_access_key_id: str
    aws_secret_access_key: str
    endpoint_url: str
    aws_https: str
    env_test: str
    s3path_de: str
    s3path_dk: str
    s3path_sa: str 
    path_dk: str
    path_dk_sub: str
    path_dk_new: str
    path_dk_sub_new: str
    default_epsg: int
    default_step_factor: float
    default_batch_size: int
    class Config:
        env_prefix = ''
        env_file = ".env"
        env_file_encoding = 'utf-8'

def set_performance_environment_variables():
    """ 
    Sets environment variables to optimize GDAL access speeds to S3 data. 
    """
    os.environ["VSI_CACHE"] = "TRUE"
    os.environ["VSI_CACHE_SIZE"] = "100000000"
    os.environ["GDAL_DISABLE_READDIR_ON_OPEN"] = "EMPTY_DIR"
    os.environ["GDAL_HTTP_MERGE_CONSECUTIVE_RANGES"] = "YES"
    os.environ["GDAL_HTTP_MULTIPLEX"] = "YES"
    os.environ["GDAL_HTTP_VERSION"] = "2"
    os.environ["CPL_VSIL_CURL_ALLOWED_EXTENSIONS"] = ".tif, .vrt, .ovr"
    os.environ["GDAL_CACHEMAX"] = "200"
    

def create_s3path_dict(settings):
    filepath_dict = {}
    for key, value in settings.__dict__.items():
        if "s3path_" in key:
            filepath_dict[key.replace("s3path_", "")] = value
    return filepath_dict

def create_filepath_dict(settings):
    filepath_dict = {}
    for key, value in settings.__dict__.items():
        if key.startswith("path_"):
            filepath_dict[key.replace("path_", "")] = value
    return filepath_dict
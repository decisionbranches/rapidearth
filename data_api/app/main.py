import io
import itertools
import json
import math
from typing import Generator
import rasterio as rio
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from rasterio.plot import reshape_as_image
from rasterio.session import AWSSession
from rasterio.windows import Window
from pyproj import CRS
from pyproj import Transformer
from imageio import v3 as iio
from .config import (
    Settings,
    CountriesList,
    BoxCorners,
    create_s3path_dict,
    create_filepath_dict,
    set_performance_environment_variables
)


# initialize settings
settings = Settings()
aws_session = AWSSession(
    endpoint_url=settings.endpoint_url,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)
AWS_HTTPS = settings.aws_https
s3_filepath = create_s3path_dict(settings)
filepath = create_filepath_dict(settings)
set_performance_environment_variables()


app = FastAPI()

# TODO only for development
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# No empty response
@app.get("/")
async def redirect():
    """
    Empty requests redirect to the docs page.
    """
    return RedirectResponse(url="/docs")


# Healthcheck endpoint
@app.get("/ping")
async def pong():
    """
    Health check endpoint.

        return:

    "ping": pong! if alive and running.

    "env_test": EnvYes! if .env variables were read.
    """
    return {"ping": "pong!", "env_test": settings.env_test}


# return available countries
@app.get("/countries", response_model=CountriesList)
async def list_countries():
    """
    Lists available countries as shortcodes.

        return:

    "countries": list of available country shortcode strings.
    """
    return {"countries": list(filepath.keys())}


# return pixel-specified window
@app.get(
    "/window/file/rowcol/{country}/{row_off}/{col_off}/{size}", 
        responses={
        200: {"content": {"image/jpeg": {}}},
        500: {"content": {"text/plain": {}}},
    },
    response_class=Response,
)
async def image_from_window_file_rowcol(
    country: str, row_off: int, col_off: int, size: int#, out_crs=settings.default_epsg
):
    """
    Returns a Image for the specified position parameters.

        params:

    country: requested country shortcode/identifier, str. Can be obtained via /countries.

    row_off: pixel row offset (aka top left pixel, row value) of the desired DataWindow, int.
     Maximum value can be inquired at /bounds/{country}.

    col_off: pixel column offset (aka top left pixel, col value) of the desired DataWindow, int.
     Maximum value can be inquired at /bounds/{country}.

    size: window size, int.

        return:

    JPEG image

    """
    cog = filepath[country]
    with rio.open(cog) as dataset:
        window = Window(col_off=col_off,row_off=row_off,width=size,height=size)
        # read window from offsets
        arr = dataset.read(
            window=window
        )
    # change data axis order to be displayed as image
    image = reshape_as_image(arr)

    # transform to bytes
    with io.BytesIO() as buf:
        iio.imwrite(buf, image, format="JPEG", extension=".jpeg", plugin="pillow")
        image_bytes = buf.getvalue()
    
    # specify headers & return image bytes
    headers = {"Content-Disposition": 'inline; filename="image.jpeg"'}
    return Response(image_bytes, headers=headers, media_type="image/jpeg")

# return pixel-specified window
@app.get(
    "/window/file/xy/{country}/{lat}/{long}/{size}", 
        responses={
        200: {"content": {"image/jpeg": {}}},
        500: {"content": {"text/plain": {}}},
    },
    response_class=Response,
)
async def image_from_window_file_xy(
    country: str, long: float, lat: float, size: int
):
    """
    Returns a Image for the specified position parameters.

        params:

    country: requested country shortcode/identifier, str. Can be obtained via /countries.

    size: window size, int.

        return:

    JPEG image

    """
    cog = filepath[country]
    with rio.open(cog) as dataset:
        transformer = Transformer.from_crs(4326,dataset.crs)
        long, lat = transformer.transform(long,lat)
        row_off,col_off = rio.transform.rowcol(dataset.transform,long,lat)
        print("row",row_off)
        print("col",col_off)
    
        window = Window(col_off=col_off,row_off=row_off,width=size,height=size)
        # read window from offsets
        arr = dataset.read(
            window=window
        )
    # change data axis order to be displayed as image
    image = reshape_as_image(arr)

    # transform to bytes
    with io.BytesIO() as buf:
        iio.imwrite(buf, image, format="JPEG", extension=".jpeg", plugin="pillow")
        image_bytes = buf.getvalue()
    
    # specify headers & return image bytes
    headers = {"Content-Disposition": 'inline; filename="image.jpeg"'}
    return Response(image_bytes, headers=headers, media_type="image/jpeg")


# return latlongs for pixel coordinates
@app.get("/coord/pixel/{country}/{row_off}/{col_off}")
async def latlong_from_pixel(
    country: str, row_off: int, col_off: int, out_crs=4326
):
    cog = filepath[country]
    with rio.open(cog) as dataset:
        data_crs = dataset.crs.to_epsg()
        long,lat = rio.transform.xy(dataset.transform,row_off,col_off)
    
    if out_crs != data_crs:
        transformer = Transformer.from_crs(data_crs, out_crs)
        long, lat = transformer.transform(long, lat)
    
    return JSONResponse([long,lat])

# return latlongs for pixel coordinates for entire box
@app.get("/coord/box/{country}/{row_off}/{col_off}/{size}",response_model=BoxCorners)
async def latlongbox_from_pixel(
    country: str, row_off: int, col_off: int, size: int, out_crs=4326
):
    left_col = col_off
    right_col = col_off + size
    top_row = row_off
    bottom_row = row_off +size
    
    cog = filepath[country]
    with rio.open(cog) as dataset:
            data_crs = dataset.crs.to_epsg()
            top_left_x, top_left_y = dataset.xy(top_row, left_col)
            top_right_x, top_right_y = dataset.xy(top_row, right_col)
            bottom_left_x, bottom_left_y = dataset.xy(bottom_row, left_col)
            bottom_right_x, bottom_right_y = dataset.xy(bottom_row, right_col)
    
    if out_crs != data_crs:
        transformer = Transformer.from_crs(data_crs, out_crs)
        top_left_x, top_left_y = transformer.transform(top_left_x, top_left_y)
        top_right_x, top_right_y = transformer.transform(top_right_x, top_right_y)
        bottom_left_x, bottom_left_y = transformer.transform(bottom_left_x, bottom_left_y)
        bottom_right_x, bottom_right_y = transformer.transform(bottom_right_x, bottom_right_y)

    
    out = {
        "top_left": (top_left_x, top_left_y),
        "top_right": (top_right_x, top_right_y),
        "bottom_left": (bottom_left_x, bottom_left_y),
        "bottom_right": (bottom_right_x, bottom_right_y),
    }
    return out

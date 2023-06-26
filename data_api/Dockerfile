# pull official base image
FROM osgeo/gdal:ubuntu-small-3.5.0

# set work directory
WORKDIR /usr/src/app

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# copy requirements file
COPY ./requirements.txt /usr/src/app/requirements.txt

# install requirements in separate step for caching
RUN set -e && apt-get update && apt-get install -y python3-pip

# install dependencies
RUN set -u \
    # && pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --upgrade -r /usr/src/app/requirements.txt

# copy project
COPY . /usr/src/app/

EXPOSE 8000

# For replication we use the kubernetes way as documented:
# https://fastapi.tiangolo.com/deployment/concepts/#examples-of-replication-tools-and-strategies
CMD uvicorn app.main:app --workers 1 --host 0.0.0.0 --port 8000
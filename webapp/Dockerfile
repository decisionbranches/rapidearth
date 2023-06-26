FROM python:3.10-bullseye

# set work directory
WORKDIR /usr/src/app

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install requirements or geodjango in separate step for caching
RUN apt-get update -qq && apt-get install -y -qq \
	gdal-bin binutils libproj-dev libgdal-dev

# copy requirements file
COPY requirements.txt .
RUN pip3 install --no-cache --upgrade -r requirements.txt

# copy project
COPY . .

EXPOSE 8080

ENV ENDPOINT_SEARCHSERVICE "search"
ENV ENDPOINT_DATA "data"
ENV ENDPOINT_MAPSERVER "mapserver"
ENV ENDPOINT_PROTOCOL "HTTPS"

RUN chmod u+x startup.sh
CMD ["/bin/sh", "-c", "./startup.sh"] 
#> assets/server.log 2>&1"]

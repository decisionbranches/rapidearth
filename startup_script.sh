#!/bin/bash

if [ "$(docker ps -a | grep search)" ]; then
    docker rm -f search
fi

docker run --rm -d -p 8891:80 -v searchengine/assets/searchservice:/usr/src/app/assets:ro -v /opt/pgdata/searchengine:/usr/src/app/indexes --name search cluelf/searchservice:1.0

if [ "$(docker ps -a | grep data)" ]; then
    docker rm -f data
fi

docker run --rm -v satellite_data:/opt:ro --name data -d -p 8892:8000 cluelf/data_api:1.0

if [ "$(docker ps -a | grep map)" ]; then
    docker rm -f map
fi
docker run -d --rm -p 8890:8080 -e ENDPOINT_MAPSERVER="10.14.29.135:8891" -e ENDPOINT_SEARCHSERVICE="10.14.29.1352:8891" -e ENDPOINT_DATA="10.14.29.1532:8892" -v searchengine/assets/webapp:/usr/src/app/assets:ro --name map cluelf/webapp:1.0


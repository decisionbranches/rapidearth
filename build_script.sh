#!/bin/bash

docker build  -t cluelf/webapp:1.0 searchengine/webapp/.
docker build   -t cluelf/searchservice:1.0 searchengine/searchservice/.
docker build  -t cluelf/data_api:1.0 searchengine/data_api/.

docker push cluelf/webapp:1.0
docker push cluelf/searchservice:1.0
docker push cluelf/data_api:1.0
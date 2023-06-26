#!/bin/bash

# Replace variables in the config file
sed -i "s/%ENDPOINT_SEARCHSERVICE/$ENDPOINT_SEARCHSERVICE/g" static/js/grid.js
sed -i "s/%ENDPOINT_DATA/$ENDPOINT_DATA/g" static/js/grid.js
sed -i "s/%ENDPOINT_SEARCHSERVICE/$ENDPOINT_SEARCHSERVICE/g" static/js/search.js
sed -i "s/%ENDPOINT_DATA/$ENDPOINT_DATA/g" static/js/search.js
sed -i "s/%ENDPOINT_MAPSERVER/$ENDPOINT_MAPSERVER/g" static/js/mapInit.js

if [[ ${ENDPOINT_PROTOCOL} == "HTTP" ]] || [[ ${ENDPOINT_PROTOCOL} == "http" ]]; then
    sed -i "s/%ENDPOINT_PROTOCOL/http/g" static/js/grid.js
    sed -i "s/%ENDPOINT_PROTOCOL/http/g" static/js/search.js
    sed -i "s/%ENDPOINT_PROTOCOL/http/g" static/js/mapInit.js
elif [[ ${ENDPOINT_PROTOCOL} == "HTTPS" ]] || [[ ${ENDPOINT_PROTOCOL} == "https" ]]; then
    sed -i "s/%ENDPOINT_PROTOCOL/https/g" static/js/grid.js
    sed -i "s/%ENDPOINT_PROTOCOL/https/g" static/js/search.js
    sed -i "s/%ENDPOINT_PROTOCOL/https/g" static/js/mapInit.js
fi


python3 manage.py runserver 0.0.0.0:8080 --noreload
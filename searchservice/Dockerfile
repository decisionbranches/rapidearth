# https://hub.docker.com/_/python
FROM python:3.10

WORKDIR /usr/src/app

# set environment variables for python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

#Install decisionbranches
COPY ./decisionbranches/requirements.txt .
RUN pip3 install --no-cache -r requirements.txt
COPY ./decisionbranches/. ./decisionbranches
RUN pip3 install --no-cache-dir decisionbranches/.


ENV SEARCH_STORAGE_PATH /tmp/search_results

# install requirements
COPY requirements.txt ./requirements.txt
RUN pip3 install --no-cache -r requirements.txt

# copy project
COPY ./app .

EXPOSE 80

# For replication we use the kubernetes way as documented:
# https://fastapi.tiangolo.com/deployment/concepts/#examples-of-replication-tools-and-strategies
CMD ["uvicorn", "main:app", "--host=0.0.0.0" , "--port", "80"]

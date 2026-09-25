#!/usr/bin/bash

tag=twinkpup-prod
repo="lexifuzzpup/twinkpup"

docker build -t $tag -f ./Dockerfile.prod .

docker tag $tag "${repo}:latest"
docker push "${repo}:latest"
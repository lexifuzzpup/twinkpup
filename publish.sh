#!/usr/bin/bash

tag=twinkpup-prod
repo="lexifuzzpup/twinkpup"
version=$1
version="${version:=latest}"

docker build -t $tag -f ./Dockerfile.prod .

docker tag $tag "${repo}:${version}"
docker push "${repo}:${version}"
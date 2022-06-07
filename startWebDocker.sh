#!/bin/sh

docker run --runtime nvidia --privileged --network host -v /tmp/.X11-unix/:/tmp/.X11-unix -v /tmp/argus_socket:/tmp/argus_socket -p 8001:8001 --name web web:1.0.0
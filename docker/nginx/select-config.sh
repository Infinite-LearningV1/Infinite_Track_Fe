#!/bin/sh
set -eu

case "${NGINX_MODE:?NGINX_MODE must be set to dev or staging}" in
  dev)
    cp /opt/nginx/dev.conf /etc/nginx/conf.d/default.conf
    ;;
  staging)
    cp /opt/nginx/staging.conf /etc/nginx/conf.d/default.conf
    ;;
  *)
    echo "Unsupported NGINX_MODE: ${NGINX_MODE}" >&2
    exit 1
    ;;
esac

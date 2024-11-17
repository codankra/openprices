#!/bin/bash

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --subdomain) TUNNEL_SUBDOMAIN="$2"; shift ;;
        --port) PORT="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Use environment variables with defaults
PORT=${PORT:-3000}
TUNNEL_SUBDOMAIN=${TUNNEL_SUBDOMAIN:-"dk-web-default"}

while true; do
    lt --port "$PORT" --local-host 127.0.0.1 --subdomain "$TUNNEL_SUBDOMAIN"
    echo "Tunnel closed. Reopening in 1 second..."
    sleep 1
done

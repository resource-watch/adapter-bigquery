#!/bin/bash
set -e

case "$1" in
    develop)
        echo "Running Development Server"
        echo -e "$GCLOUD_CREDENTIALS" | base64 -d > credentials.json
        exec grunt --gruntfile app/Gruntfile.js | bunyan
        ;;
    startDev)
        echo "Running Start Dev"
        exec node app/index
        ;;
    test)
        echo "Running Test"
        exec npm test
        ;;
    start)
        echo "Running Start"
        echo -e "$GCLOUD_CREDENTIALS" | base64 -d > credentials.json
        exec npm start
        ;;
    *)
        exec "$@"
esac

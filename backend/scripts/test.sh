#!/usr/bin/env bash

set -e
set -x

coverage run --source=app -m pytest -m "not slow"
coverage report --show-missing
coverage html --title "${@-coverage}"

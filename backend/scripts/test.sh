#!/usr/bin/env bash

set -e
set -x

coverage run --source=app -m pytest
coverage report --show-missing
coverage html --title "${@-coverage}"
coverage xml -o coverage-reports/coverage.xml  # for GitLab coverage visualization
sed -i 's/filename="app\//filename="backend\/app\//g' coverage-reports/coverage.xml  # correct paths in report
chmod 777 coverage-reports/coverage.xml  # to allow gitlab runner to remove it

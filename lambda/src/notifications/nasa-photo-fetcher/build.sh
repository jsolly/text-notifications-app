#!/bin/bash

# Create package directory if it doesn't exist
rm -rf package/
mkdir -p package

# Install dependencies
source ../../.venv/bin/activate
pip install --target ./package -r requirements.txt

# Create deployment package
cd package
zip -r ../deployment.zip .
cd ..
zip -g deployment.zip index.py
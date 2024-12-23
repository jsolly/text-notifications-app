#!/bin/bash

# Exit on error
set -e

echo "Creating virtual environment..."
python -m venv .venv
source .venv/bin/activate

# Function to build a Lambda deployment package
build_lambda() {
    local lambda_dir=$1
    echo "Building ${lambda_dir}..."
    
    # Create and clean package directory
    cd $lambda_dir
    rm -rf package/
    mkdir -p package

    # Install dependencies
    pip install --target ./package -r requirements.txt

    # Create deployment package
    cd package
    zip -r ../deployment.zip ./*
    cd ..
    zip -g deployment.zip index.py

    cd ..
}

# Build both Lambda functions
build_lambda "nasa-photo-fetcher"
build_lambda "nasa-photo-sender"

echo "Deactivating virtual environment..."
deactivate

echo "Build complete! Deployment packages created in:"
echo "- nasa-photo-fetcher/deployment.zip"
echo "- nasa-photo-sender/deployment.zip" 
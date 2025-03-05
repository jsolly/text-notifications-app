#!/bin/bash
set -e

# Create shared directory if it doesn't exist
mkdir -p shared

# Copy shared package files
cp ../../shared/package.json shared/
cp ../../shared/tsconfig.json shared/
cp -r ../../shared/src shared/

# Build the Docker image
docker build -t signup-processor . 
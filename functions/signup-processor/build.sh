#!/bin/bash
set -e  # Exit on any error

# Create a temporary build directory
BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy workspace files
cp ../../package.json ../../package-lock.json "$BUILD_DIR/"
cp package.json tsconfig.json "$BUILD_DIR/"
cp -r ../../shared "$BUILD_DIR/"
cp *.ts "$BUILD_DIR/"

# Copy Dockerfile and template.yaml
cp Dockerfile template.yaml "$BUILD_DIR/"

# Generate a new lockfile in the build directory
cd "$BUILD_DIR"
npm install

# Run sam build
sam build

# Clean up
cd ..
rm -rf "$BUILD_DIR" 
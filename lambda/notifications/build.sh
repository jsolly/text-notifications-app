#!/bin/bash

# =================================================================
# Lambda Functions Build Script
# =================================================================
#
# This script builds all Lambda functions in the current directory.
# Each function should have its own directory containing:
#   - requirements.txt
#   - index.py or main.py
#
# Usage:
#   1. Navigate to the notifications directory:
#      cd lambda/notifications
#
#   2. Make the script executable (first time only):
#      chmod +x build.sh
#
#   3. Run the script:
#      ./build.sh
#
# The script will:
#   - Create a Python virtual environment
#   - Install dependencies for each Lambda function
#   - Create deployment packages (zip files)
#   - Show a build summary
#
# Output:
#   Each Lambda function will have a deployment.zip created in its directory
# =================================================================

# Exit on error
set -e

echo "Setting up Python virtual environment..."
python -m venv .venv
source .venv/bin/activate

build_lambda() {
    local lambda_dir=$1
    echo "Building ${lambda_dir}..."
    
    # Skip if not a directory or doesn't contain requirements.txt
    if [ ! -d "$lambda_dir" ] || [ ! -f "$lambda_dir/requirements.txt" ]; then
        return
    fi
    
    echo "📦 Building Lambda package for ${lambda_dir}..."
    
    # Create and clean package directory
    cd "$lambda_dir"
    rm -rf package/
    mkdir -p package

    # Install dependencies
    echo "📥 Installing dependencies for ${lambda_dir}..."
    pip install --target ./package -r requirements.txt

    # Create deployment package
    echo "🗜️  Creating deployment package..."
    cd package
    zip -r ../deployment.zip ./* > /dev/null
    cd ..
    
    # Add the main Python file to the zip
    if [ -f "index.py" ]; then
        zip -g deployment.zip index.py > /dev/null
    elif [ -f "main.py" ]; then
        zip -g deployment.zip main.py > /dev/null
    else
        echo "⚠️  Warning: No index.py or main.py found in $lambda_dir"
        return 1
    fi

    echo "✅ Successfully built ${lambda_dir}/deployment.zip"
    cd ..
}

# Track if any builds fail
BUILD_SUCCESS=true

# Find and build all Lambda functions in the current directory
for dir in */; do
    if [ -f "${dir}requirements.txt" ]; then
        echo "🔍 Found Lambda function in ${dir}"
        if build_lambda "${dir}"; then
            echo "------------------------"
        else
            echo "❌ Failed to build ${dir}"
            BUILD_SUCCESS=false
        fi
    fi
done

echo "Cleaning up: deactivating virtual environment..."
deactivate

# Print summary
echo -e "\n📋 Build Summary:"
for dir in */; do
    if [ -f "${dir}deployment.zip" ]; then
        echo "✅ ${dir}deployment.zip"
    fi
done

# Exit with error if any builds failed
if [ "$BUILD_SUCCESS" = false ]; then
    echo "❌ One or more Lambda builds failed"
    exit 1
fi

echo "✨ Build process complete!" 
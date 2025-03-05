#!/bin/bash
set -e  # Exit on any error

# Change to the functions directory where this script is located
cd "$(dirname "$0")"

# Use the git SHA as the image tag
IMAGE_TAG=$(git rev-parse --short HEAD)

# Debug: Print environment variable content
echo "ECR_REPOSITORY_URLS content:"
echo "$ECR_REPOSITORY_URLS"
echo "Using image tag: $IMAGE_TAG"
echo "-------------------"

# Validate JSON format
if ! echo "$ECR_REPOSITORY_URLS" | jq . >/dev/null 2>&1; then
    echo "Error: ECR_REPOSITORY_URLS is not valid JSON"
    echo "Please ensure it's properly formatted JSON, for example:"
    echo '{"function1": "account.dkr.ecr.region.amazonaws.com/function1"}'
    exit 1
fi

# Check if running in GitHub Actions
if [ -z "$GITHUB_ACTIONS" ]; then
    echo "Running locally - attempting to authenticate with AWS CLI..."
    
    # Login to ECR using AWS CLI
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

    if [ $? -ne 0 ]; then
        echo "Error: Failed to authenticate with ECR. Make sure you have valid AWS credentials configured."
        exit 1
    fi
fi

# Build shared package first
echo "Building shared package..."
cd ../shared
npm install
npm run build
cd ../functions

# Loop through each repository in the map
for function_name in $(echo "$ECR_REPOSITORY_URLS" | jq -r 'keys[]'); do
    echo "Processing $function_name..."
    
    # Get the ECR URL for this function
    repo_url=$(echo "$ECR_REPOSITORY_URLS" | jq -r --arg fn "$function_name" '.[$fn]')
    
    # Check if the function directory exists and has a Dockerfile
    if [ -d "$function_name" ] && [ -f "$function_name/Dockerfile" ]; then
        echo "Building container for $function_name..."
        
        # Create a temporary build directory with proper structure
        BUILD_DIR="build_$function_name"
        rm -rf "$BUILD_DIR"
        mkdir -p "$BUILD_DIR/functions/$function_name"
        
        # Copy workspace files
        cp ../package.json ../package-lock.json "$BUILD_DIR/"
        cp -r ../shared "$BUILD_DIR/"
        cp "$function_name/package.json" "$function_name/tsconfig.json" "$BUILD_DIR/functions/$function_name/"
        cp "$function_name"/*.ts "$BUILD_DIR/functions/$function_name/"
        
        # Build and push the container with both specific tag and latest
        docker build -t "$function_name:$IMAGE_TAG" -f "$function_name/Dockerfile" "$BUILD_DIR"
        docker tag "$function_name:$IMAGE_TAG" "$repo_url:$IMAGE_TAG"
        docker tag "$function_name:$IMAGE_TAG" "$repo_url:latest"
        
        # Push both tags
        docker push "$repo_url:$IMAGE_TAG"
        docker push "$repo_url:latest"
        
        # Clean up build directory
        rm -rf "$BUILD_DIR"
        
        echo "Successfully built and pushed $function_name with tag $IMAGE_TAG"
    else
        echo "Skipping $function_name - no Dockerfile found in $(pwd)/$function_name"
    fi
done 
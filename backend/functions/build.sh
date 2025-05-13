#!/bin/bash
set -e  # Exit on any error

# Change to the functions directory where this script is located
cd "$(dirname "$0")"

# Define a cleanup function to ensure we always clean up build directories
cleanup() {
    echo "Cleaning up build directories..."
    rm -rf build_*
}

# Register the cleanup function to run on script exit (normal or error)
trap cleanup EXIT

# Clean up any leftover build directories from previous runs
cleanup

# Load environment variables from .env file
echo "Loading environment variables..."
if [ -f .env ]; then
    source .env
elif [ -f "../../.env" ]; then
    source "../../.env"
fi

# Check for required environment variables
echo "Checking required environment variables..."

# Check for AWS_REGION
if [ -z "$AWS_REGION" ]; then
    echo "Error: AWS_REGION environment variable is not set"
    echo "Please set it with: export AWS_REGION=your-aws-region (e.g., us-east-1)"
    exit 1
fi

# Check for AWS_ACCOUNT_ID
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID environment variable is not set"
    echo "Please set it with: export AWS_ACCOUNT_ID=your-aws-account-id"
    exit 1
fi

# Check for ECR_REPOSITORY_URLS
if [ -z "$ECR_REPOSITORY_URLS" ]; then
    echo "Error: ECR_REPOSITORY_URLS environment variable is not set"
    echo "Please set it with: export ECR_REPOSITORY_URLS='{\"function1\": \"$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/function1\"}'"
    exit 1
fi

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

# Login to ECR using AWS CLI
echo "Attempting to authenticate with AWS CLI..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

if [ $? -ne 0 ]; then
    echo "Error: Failed to authenticate with ECR. Make sure you have valid AWS credentials configured."
    exit 1
fi

# Build shared package first
echo "Checking for shared package build..."
if [ -d "../../shared/dist" ] && [ "$(ls -A ../../shared/dist)" ]; then
    echo "Shared package build already exists, skipping build step (Happens in CI)"
else
    echo "Building shared package..."
    cd ../../shared
    npm ci
    npm run build
    rm -rf node_modules  # Clean up node_modules directory
    cd ../backend/functions
fi

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
        mkdir -p "$BUILD_DIR"
        
        # Copy workspace files to match the structure expected by the Dockerfile
        cp ../../package.json "$BUILD_DIR/"
        cp -r ../../shared "$BUILD_DIR/"
        mkdir -p "$BUILD_DIR/backend/functions/$function_name"
        mkdir -p "$BUILD_DIR/backend/functions/shared"
        cp -r shared/* "$BUILD_DIR/backend/functions/shared/"
        
        # Copy function-specific files
        # Copy package.json first, as we will modify it in the build directory
        if [ -f "$function_name/package.json" ]; then
            # Copy the original package.json to the build dir for use in the builder stage (installs devDeps)
            cp "$function_name/package.json" "$BUILD_DIR/backend/functions/$function_name/package.json"

            # Create a production-ready package.json (no devDependencies) for the final image
            PROD_PKG_JSON_PATH="$BUILD_DIR/backend/functions/$function_name/package.prod.json"
            cp "$function_name/package.json" "$PROD_PKG_JSON_PATH"
            echo "Creating production-only package.json at $PROD_PKG_JSON_PATH..."
            jq 'del(.devDependencies)' "$PROD_PKG_JSON_PATH" > "$PROD_PKG_JSON_PATH.tmp" && mv "$PROD_PKG_JSON_PATH.tmp" "$PROD_PKG_JSON_PATH"
            if [ $? -ne 0 ]; then
                echo "Warning: Failed to create production package.json for $function_name. Build might be larger or fail."
            fi
        else
            echo "No package.json found for $function_name, skipping stripping."
        fi

        cp "$function_name/tsconfig.json" "$BUILD_DIR/backend/functions/$function_name/" 2>/dev/null || :
        cp "$function_name"/*.ts "$BUILD_DIR/backend/functions/$function_name/" 2>/dev/null || :
        
        
        # Copy additional required files for the build
        cp "$function_name/build.js" "$BUILD_DIR/backend/functions/$function_name/" 2>/dev/null || :
        # lambda-package.json is no longer needed as we modify the main package.json
        # cp "$function_name/lambda-package.json" "$BUILD_DIR/backend/functions/$function_name/" 2>/dev/null || :
        
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
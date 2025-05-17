#!/bin/bash
set -e  # Exit on any error

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd) # Assuming backend/functions, so ../.. is project root

# --- Helper Functions ---

cleanup() {
    echo "Cleaning up build directories in $SCRIPT_DIR..."
    # Find and remove directories starting with build_ directly under SCRIPT_DIR
    find "$SCRIPT_DIR" -maxdepth 1 -type d -name "build_*" -exec rm -rf {} +
    echo "Cleanup complete."
}

load_env_vars() {
    echo "Loading environment variables..."
    # Check if running in GitHub Actions
    if [ -z "$GITHUB_ACTIONS" ] && [ -z "$CI" ]; then # Not in GitHub Actions
        if [ -f "$PROJECT_ROOT/.env" ]; then
            echo "Sourcing .env from project root: $PROJECT_ROOT/.env"
            source "$PROJECT_ROOT/.env"
        else
            echo "Warning: .env file not found in $PROJECT_ROOT. Proceeding with existing environment variables."
        fi
    else
        echo "Skipping .env file loading in GitHub Actions environment. Assuming variables are set."
    fi
}

login_ecr() {
    echo "Attempting to authenticate with ECR for account $AWS_ACCOUNT_ID in region $AWS_REGION..."

    if [ -z "$AWS_ACCOUNT_ID" ]; then
        echo "Error: AWS_ACCOUNT_ID environment variable is not set."
        exit 1
    fi

    if [ -z "$AWS_REGION" ]; then
        echo "Error: AWS_REGION environment variable is not set."
        exit 1
    fi

    if ! aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"; then
        echo "Error: Failed to authenticate with ECR. Ensure AWS CLI is configured and credentials are valid."
        exit 1
    fi
    echo "Successfully authenticated with ECR."
}

build_shared_package() {
    local shared_project_dir="$PROJECT_ROOT/shared"
    local shared_dist_path="$shared_project_dir/dist"

    echo "Checking for shared package build at $shared_dist_path..."
    if [ -d "$shared_dist_path" ] && [ "$(ls -A "$shared_dist_path")" ]; then
        echo "Shared package build already exists at $shared_dist_path, skipping build."
    else
        echo "Building shared package in $shared_project_dir..."
        (
            cd "$shared_project_dir"
            echo "Running npm ci in $(pwd)..."
            if ! npm ci; then echo "Error: npm ci failed in $shared_project_dir"; exit 1; fi
            echo "Running npm run build in $(pwd)..."
            if ! npm run build; then echo "Error: npm run build failed in $shared_project_dir"; exit 1; fi
        )
        if [ $? -ne 0 ]; then
            echo "Error: Shared package build process failed."
            exit 1
        fi
        echo "Shared package built successfully."
    fi
}

build_and_push_function() {
    local function_name="$1"
    local repo_url="$2"
    local image_tag="$3"

    local func_src_dir="$SCRIPT_DIR/$function_name"
    local dockerfile_path="$func_src_dir/Dockerfile"

    echo "--- Processing function: $function_name ---"
    echo "Source: $func_src_dir, Dockerfile: $dockerfile_path, Repo: $repo_url, Tag: $image_tag"

    if [ ! -d "$func_src_dir" ] || [ ! -f "$dockerfile_path" ]; then
        echo "Error: Directory $func_src_dir or Dockerfile $dockerfile_path not found."
        exit 1
    fi

    echo "Building Docker container for $function_name..."

    echo "Context: $PROJECT_ROOT, Dockerfile: $dockerfile_path"
    if ! docker build --progress=plain --build-arg FUNCTION_NAME="$function_name" -t "$function_name:$image_tag" -f "$dockerfile_path" "$PROJECT_ROOT"; then
        echo "Error: Docker build failed for $function_name."
        exit 1
    fi
    echo "Docker build successful for $function_name:$image_tag."

    docker tag "$function_name:$image_tag" "$repo_url:$image_tag"
    docker tag "$function_name:$image_tag" "$repo_url:latest"
    echo "Tagged $function_name:$image_tag as $repo_url:$image_tag and $repo_url:latest."

    echo "Pushing $repo_url:$image_tag..."
    if ! docker push "$repo_url:$image_tag"; then
        echo "Error: Failed to push $repo_url:$image_tag."
        exit 1
    fi
    echo "Successfully pushed $repo_url:$image_tag."

    echo "Pushing $repo_url:latest..."
    if ! docker push "$repo_url:latest"; then
        echo "Error: Failed to push $repo_url:latest."
        exit 1
    fi
    echo "Successfully pushed $repo_url:latest."

    echo "Successfully built and pushed $function_name."
}

main() {
    # Ensure cleanup runs on script exit (normal or error)
    trap cleanup EXIT

    # Perform an initial cleanup in case of leftover directories from a previous failed run
    cleanup 

    # Change to the script's directory to ensure relative paths are correct
    cd "$SCRIPT_DIR"
    echo "Changed working directory to $SCRIPT_DIR"

    load_env_vars

    local image_tag
    image_tag=$(git rev-parse --short HEAD)
    if [ -z "$image_tag" ]; then
        echo "Error: Failed to get git SHA for image tag. Ensure you are in a git repository."
        exit 1
    fi
    echo "Using image tag: $image_tag"

    echo "ECR_REPOSITORY_URLS content for parsing: $ECR_REPOSITORY_URLS"
    echo "-------------------"

    login_ecr
    build_shared_package

    echo "Starting build process for all functions defined in ECR_REPOSITORY_URLS..."
    local func_name repo_url
    
    # Loop through each key (function name) in the ECR_REPOSITORY_URLS JSON
    for func_name in $(echo "$ECR_REPOSITORY_URLS" | jq -r 'keys[]'); do
        repo_url=$(echo "$ECR_REPOSITORY_URLS" | jq -r --arg fn "$func_name" '.[$fn]')
        
        if [ -z "$repo_url" ] || [ "$repo_url" == "null" ]; then
            echo "Error: Invalid repository URL for $func_name. Exiting."
            exit 1
        fi
        
        build_and_push_function "$func_name" "$repo_url" "$image_tag"
    done

    echo "-------------------"
    echo "All functions processed."
}

# Run the script
main 
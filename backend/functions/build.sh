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
            set -a
            source "$PROJECT_ROOT/.env"
            set +a
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
    if ! docker build --pull --progress=plain --build-arg FUNCTION_NAME="$function_name" -t "$function_name:$image_tag" -f "$dockerfile_path" "$PROJECT_ROOT"; then
        echo "Error: Docker build failed for $function_name."
        exit 1
    fi
    echo "Docker build successful for $function_name:$image_tag."

    docker tag "$function_name:$image_tag" "$repo_url:$image_tag"
    docker tag "$function_name:$image_tag" "$repo_url:latest"
    echo "Tagged $function_name:$image_tag as $repo_url:$image_tag and $repo_url:latest."

    echo "Pushing $repo_url:$image_tag..."
    local push_attempts=0
    local max_push_attempts=3
    local push_success=false
    while [ $push_attempts -lt $max_push_attempts ]; do
        if docker push "$repo_url:$image_tag"; then
            push_success=true
            break
        fi
        push_attempts=$((push_attempts + 1))
        echo "Warning: Failed to push $repo_url:$image_tag (attempt $push_attempts/$max_push_attempts). Retrying in 5 seconds..."
        sleep 5
    done

    if [ "$push_success" = false ]; then
        echo "Error: Failed to push $repo_url:$image_tag after $max_push_attempts attempts."
        exit 1
    fi
    echo "Successfully pushed $repo_url:$image_tag."

    echo "Pushing $repo_url:latest..."
    push_attempts=0
    push_success=false
    while [ $push_attempts -lt $max_push_attempts ]; do
        if docker push "$repo_url:latest"; then
            push_success=true
            break
        fi
        push_attempts=$((push_attempts + 1))
        echo "Warning: Failed to push $repo_url:latest (attempt $push_attempts/$max_push_attempts). Retrying in 5 seconds..."
        sleep 5
    done

    if [ "$push_success" = false ]; then
        echo "Error: Failed to push $repo_url:latest after $max_push_attempts attempts."
        exit 1
    fi
    echo "Successfully pushed $repo_url:latest."

    echo "Successfully built and pushed $function_name."
}

main() {
    # Ensure cleanup runs on script exit (normal or error)
    trap cleanup EXIT
    set -o pipefail # Add pipefail option

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

    # Validate ECR_REPOSITORY_URLS
    if [ -z "$ECR_REPOSITORY_URLS" ]; then
        echo "Error: ECR_REPOSITORY_URLS environment variable is not set or empty."
        exit 1
    fi
    if ! echo "$ECR_REPOSITORY_URLS" | jq -e '.' >/dev/null; then
        echo "Error: ECR_REPOSITORY_URLS does not contain valid JSON."
        echo "Content of ECR_REPOSITORY_URLS:"
        echo "$ECR_REPOSITORY_URLS"
        exit 1
    fi
    echo "ECR_REPOSITORY_URLS is valid JSON."

    echo "ECR_REPOSITORY_URLS content for parsing: $ECR_REPOSITORY_URLS"
    echo "-------------------"

    login_ecr
    build_shared_package

    echo "Starting build process for all functions defined in ECR_REPOSITORY_URLS..."
    local func_name repo_url
    local pids=()
    
    # Loop through each key (function name) in the ECR_REPOSITORY_URLS JSON
    for func_name in $(echo "$ECR_REPOSITORY_URLS" | jq -r 'keys[]'); do
        repo_url=$(echo "$ECR_REPOSITORY_URLS" | jq -r --arg fn "$func_name" '.[$fn]')
        
        if [ -z "$repo_url" ] || [ "$repo_url" == "null" ]; then
            echo "Error: Invalid repository URL for $func_name. Exiting."
            exit 1
        fi
        
        # Run build_and_push_function in the background
        build_and_push_function "$func_name" "$repo_url" "$image_tag" & 
        pids+=($!) # Store PID of the background process
    done

    # Wait for all background jobs to complete
    local job_failed=0
    for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
            echo "Error: Background job with PID $pid (for one of the functions) failed."
            job_failed=1
        fi
    done

    if [ "$job_failed" -eq 1 ]; then
        echo "Error: One or more function build/push processes failed."
        exit 1
    fi

    echo "-------------------"
    echo "All functions processed."
}

# Run the script
main 
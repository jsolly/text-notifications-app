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
    if [ -f "$PROJECT_ROOT/.env" ]; then
        echo "Sourcing .env from project root: $PROJECT_ROOT/.env"
        source "$PROJECT_ROOT/.env"
    elif [ -f "$SCRIPT_DIR/.env" ]; then
        echo "Sourcing .env from script directory: $SCRIPT_DIR/.env"
        source "$SCRIPT_DIR/.env"
    else
        echo "Warning: .env file not found in $PROJECT_ROOT or $SCRIPT_DIR. Proceeding with existing environment variables."
    fi
}

login_ecr() {
    echo "Attempting to authenticate with ECR for account $AWS_ACCOUNT_ID in region $AWS_REGION..."
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

prepare_build_context() {
    local function_name="$1"
    local build_dir="$2"
    # script_dir_path and project_root_path are available via SCRIPT_DIR and PROJECT_ROOT

    echo "Preparing build context for $function_name in $build_dir..."
    mkdir -p "$build_dir" # Ensure build_dir exists, rm -rf is handled by caller or trap

    # 1. Copy pre-built shared package distributables TO A LOCATION THE MODIFIED DOCKERFILE EXPECTS
    local project_shared_dist_src="$PROJECT_ROOT/shared/dist"
    local build_context_shared_dist_dest="$build_dir/shared/dist" # New destination within build_dir
    echo "Copying shared package dist from $project_shared_dist_src to $build_context_shared_dist_dest for Docker build"
    if [ -d "$project_shared_dist_src" ] && [ "$(ls -A "$project_shared_dist_src")" ]; then
        mkdir -p "$build_context_shared_dist_dest"
        rsync -a --delete "$project_shared_dist_src/" "$build_context_shared_dist_dest/"
    else
        echo "Error: Shared package dist directory $project_shared_dist_src is empty or does not exist. Ensure it is built by build_shared_package."
        exit 1 
    fi

    # 2. Copy backend config (tsconfig for lambdas)
    local backend_config_dir="$SCRIPT_DIR/../config"
    echo "Copying $backend_config_dir/tsconfig.json to $build_dir/backend/config/"
    mkdir -p "$build_dir/backend/config"
    cp "$backend_config_dir/tsconfig.json" "$build_dir/backend/config/tsconfig.json"

    # 3. Copy backend/functions/shared/* into the build context's backend/functions/shared
    local backend_functions_shared_src="$SCRIPT_DIR/shared"
    local backend_functions_shared_dest="$build_dir/backend/functions/shared"
    echo "Copying contents of $backend_functions_shared_src to $backend_functions_shared_dest"
    if [ -d "$backend_functions_shared_src" ] && [ "$(ls -A "$backend_functions_shared_src")" ]; then
        mkdir -p "$backend_functions_shared_dest"
        rsync -a --delete "$backend_functions_shared_src/" "$backend_functions_shared_dest/"
    else
        echo "Info: No files found in $backend_functions_shared_src to copy to $backend_functions_shared_dest."
    fi

    # 4. Prepare function-specific directory in the build context
    local func_src_dir="$SCRIPT_DIR/$function_name"
    local func_build_target_dir="$build_dir/backend/functions/$function_name"
    mkdir -p "$func_build_target_dir"

    # 5. Copy all application files from the function source directory into its place in the build context.
    # This rsync includes the function's original package.json (with devDependencies) for the builder stage.
    echo "Copying application files from $func_src_dir to $func_build_target_dir..."
    if [ -d "$func_src_dir" ] && [ "$(ls -A "$func_src_dir")" ]; then
        rsync -a --delete --exclude 'Dockerfile' --exclude 'node_modules/' --exclude '_shared_pkg_build/' "$func_src_dir/" "$func_build_target_dir/"
    else
        echo "Warning: Function source directory $func_src_dir is empty or does not exist. No application files copied."
        # Decide if this should be a fatal error
    fi

    echo "Build context prepared for $function_name."
}

build_and_push_function() {
    local function_name="$1"
    local repo_url="$2"
    local image_tag="$3"

    local func_src_dir="$SCRIPT_DIR/$function_name"
    local dockerfile_path="$func_src_dir/Dockerfile"
    local build_dir_path="$SCRIPT_DIR/build_$function_name"

    echo "--- Processing function: $function_name ---"
    echo "Source: $func_src_dir, Dockerfile: $dockerfile_path, Repo: $repo_url, Tag: $image_tag"

    if [ ! -d "$func_src_dir" ] || [ ! -f "$dockerfile_path" ]; then
        echo "Error: Directory $func_src_dir or Dockerfile $dockerfile_path not found."
        exit 1
    fi

    # Clean up previous build directory for this function specifically
    rm -rf "$build_dir_path"
    
    prepare_build_context "$function_name" "$build_dir_path"

    echo "Building Docker container for $function_name..."
    echo "Context: $build_dir_path, Dockerfile: $dockerfile_path"
    if ! docker build --progress=plain --build-arg FUNCTION_NAME="$function_name" -t "$function_name:$image_tag" -f "$dockerfile_path" "$build_dir_path"; then
        echo "Error: Docker build failed for $function_name."
        # build_dir_path will be cleaned by trap or explicit call later
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
    
    # Clean up this function's build directory immediately
    echo "Cleaning up build directory $build_dir_path..."
    rm -rf "$build_dir_path"

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
            echo "Error: Could not determine repository URL for $func_name from ECR_REPOSITORY_URLS."
            echo "Please check the JSON structure and content: $ECR_REPOSITORY_URLS"
            # Consider whether to 'continue' to next function or 'exit 1' for stricter error handling
            # Original script did not have a clear behavior here, implies continuation.
            # For safety, if a URL is missing/null, it's better to flag as an issue that might need to stop.
            # However, the original loop implies it would try to process.
            # If one function config is bad, should it stop all? Let's make it an error.
             echo "Skipping $func_name due to missing or null repository URL."
            continue # Or exit 1 if this should be a fatal error for the whole script
        fi
        
        build_and_push_function "$func_name" "$repo_url" "$image_tag"
    done

    echo "-------------------"
    echo "All functions processed."
    # Final cleanup is handled by the trap registered at the beginning of main.
}

# Execute main function
main 
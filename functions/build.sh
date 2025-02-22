#!/bin/bash
set -e  # Exit on any error

# Check if ECR repository URLs are provided
if [ -z "$ECR_REPOSITORY_URLS" ]; then
    echo "Error: ECR_REPOSITORY_URLS environment variable is not set"
    exit 1
fi

# Loop through each repository in the map
for function_name in $(echo $ECR_REPOSITORY_URLS | jq -r 'keys[]'); do
    echo "Processing $function_name..."
    
    # Get the ECR URL for this function
    repo_url=$(echo $ECR_REPOSITORY_URLS | jq -r ".$function_name")
    
    # Check if the function directory exists and has a Dockerfile
    if [ -d "$function_name" ] && [ -f "$function_name/Dockerfile" ]; then
        echo "Building container for $function_name..."
        
        # Build and push the container
        cd "$function_name"
        docker buildx build --platform linux/arm64 --provenance=false -t $function_name:latest .
        docker tag $function_name:latest $repo_url:latest
        docker push $repo_url:latest
        cd ..
        
        echo "Successfully built and pushed $function_name"
    else
        echo "Skipping $function_name - no Dockerfile found"
    fi
done 
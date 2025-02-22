#!/bin/bash
set -e  # Exit on any error

# Change to the functions directory where this script is located
cd "$(dirname "$0")"

# Debug: Print the raw value
echo "Raw ECR_REPOSITORY_URLS value: '$ECR_REPOSITORY_URLS'"

# Check if running in GitHub Actions
if [ -z "$GITHUB_ACTIONS" ]; then
    echo "Running locally - attempting to authenticate with AWS CLI..."
    
    # Login to ECR using AWS CLI
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
fi

# Loop through each repository in the map
for function_name in $(echo "$ECR_REPOSITORY_URLS" | jq -r 'keys[]'); do
    echo "Processing $function_name..."
    
    # Get the ECR URL for this function
    repo_url=$(echo "$ECR_REPOSITORY_URLS" | jq -r --arg fn "$function_name" '.[$fn]')
    
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
        echo "Skipping $function_name - no Dockerfile found in $(pwd)/$function_name"
    fi
done 
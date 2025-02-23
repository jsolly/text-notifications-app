#!/bin/bash
set -e  # Exit on any error

# Change to the functions directory where this script is located
cd "$(dirname "$0")"

# Generate timestamp tag
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")

# Debug: Print environment variable content
echo "ECR_REPOSITORY_URLS content:"
echo "$ECR_REPOSITORY_URLS"
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

# Loop through each repository in the map
for function_name in $(echo "$ECR_REPOSITORY_URLS" | jq -r 'keys[]'); do
    echo "Processing $function_name..."
    
    # Get the ECR URL for this function
    repo_url=$(echo "$ECR_REPOSITORY_URLS" | jq -r --arg fn "$function_name" '.[$fn]')
    
    # Check if the function directory exists and has a Dockerfile
    if [ -d "$function_name" ] && [ -f "$function_name/Dockerfile" ]; then
        echo "Building container for $function_name..."
        
        # Build and push the container with timestamp tag
        docker build -t "$function_name:$TIMESTAMP" ./"$function_name"
        docker tag "$function_name:$TIMESTAMP" "$repo_url:$TIMESTAMP"
        docker push "$repo_url:$TIMESTAMP"
        
        # Output the full image URI for use in deployment
        echo "::set-output name=${function_name}_image::$repo_url:$TIMESTAMP"
        
        echo "Successfully built and pushed $function_name with tag $TIMESTAMP"
    else
        echo "Skipping $function_name - no Dockerfile found in $(pwd)/$function_name"
    fi
done 
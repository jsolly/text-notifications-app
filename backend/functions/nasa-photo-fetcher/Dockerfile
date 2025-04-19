FROM public.ecr.aws/lambda/python:3.10-arm64 AS builder
WORKDIR /usr/app

# Copy requirements file for dependency installation
COPY backend/functions/nasa-photo-fetcher/requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/functions/nasa-photo-fetcher/index.py ./

# Final image
FROM public.ecr.aws/lambda/python:3.10-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy dependencies from builder stage
COPY --from=builder /var/lang/lib/python3.10/site-packages /var/lang/lib/python3.10/site-packages

# Copy function code
COPY --from=builder /usr/app/index.py ./

# Lambda handler
CMD ["index.handler"] 
FROM public.ecr.aws/lambda/python:3.13-arm64 AS builder
WORKDIR /usr/app

# Copy requirements file for dependency installation
COPY backend/functions/nasa_photo_sender/requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/functions/nasa_photo_sender/index.py ./

# Final image
FROM public.ecr.aws/lambda/python:3.13-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy dependencies from builder stage
COPY --from=builder /usr/local/lib/python3.13/site-packages /var/lang/lib/python3.13/site-packages

# Copy function code
COPY --from=builder /usr/app/index.py ./

# Lambda handler
CMD ["index.handler"] 
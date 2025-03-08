FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy package.json files first for better layer caching
COPY backend/functions/signup-processor/package*.json ./
COPY shared/package.json ./shared/

# Install dependencies
RUN npm install && \
    cd shared && npm install && cd ..

# Copy build scripts
COPY backend/functions/signup-processor/build.js ./
COPY shared/build.js ./shared/

# Copy source code
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/
COPY backend/functions/shared ./functions/shared
COPY backend/functions/signup-processor/*.ts ./
COPY backend/functions/shared/db.ts ../shared/db.ts

# Create necessary directories
RUN mkdir -p dist shared/dist

# Build packages
RUN cd shared && npm run build && cd .. && \
    npm run build:lambda

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only what's needed for the Lambda function
COPY --from=builder /usr/app/dist/index.js ./
COPY --from=builder /usr/app/shared/dist ./shared/dist
COPY --from=builder /usr/app/dist/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Lambda handler
CMD ["index.handler"]
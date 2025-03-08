FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy package.json files and install dependencies
COPY backend/functions/signup-processor/package*.json ./
COPY shared/package.json ./shared/
RUN npm install && \
    cd shared && npm install && cd ..

# Copy build scripts and source code
COPY backend/functions/signup-processor/build.js ./
COPY shared/build.js ./shared/
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/
COPY backend/functions/shared ./functions/shared
COPY backend/functions/signup-processor/*.ts ./
COPY backend/functions/shared/db.ts ../shared/db.ts

# Create directories and build packages
RUN mkdir -p dist shared/dist && \
    cd shared && npm run build && cd .. && \
    npm run build:lambda

# Copy Lambda package.json (must be after build to ensure proper layer caching)
COPY backend/functions/signup-processor/lambda-package.json ./lambda-package.json

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only what's needed for the Lambda function
COPY --from=builder /usr/app/dist/index.js ./
# Copy only the shared index.js file (COPY will create the directory structure)
COPY --from=builder /usr/app/shared/dist/index.js shared/dist/
COPY --from=builder /usr/app/lambda-package.json ./package.json

# Install production dependencies using lambda-package.json
RUN npm install

# Lambda handler
CMD ["index.handler"]
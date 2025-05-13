FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy package files first for better layer caching
# This package.json is the original, with devDependencies, for the builder stage
COPY backend/functions/apod-photo-fetcher/package.json ./
COPY shared/package.json ./shared/

# Install ALL dependencies (including devDependencies) for the build process
RUN npm install && \
    cd shared && npm install && cd ..

# Copy source code and build scripts
COPY shared/build.js shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY backend/functions/shared ../shared
COPY backend/functions/apod-photo-fetcher/*.ts ./
COPY backend/functions/apod-photo-fetcher/tsconfig.json ./

# Build packages
RUN mkdir -p dist shared/dist && \
    cd shared && npm run build && cd .. && \
    npm run build

# After build, replace package.json with the production version (no devDependencies)
COPY backend/functions/apod-photo-fetcher/package.prod.json ./package.json

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only what's needed for production
COPY --from=builder /usr/app/dist/index.js ./
COPY --from=builder /usr/app/shared/dist/index.js ./shared/dist/
# This copies the package.prod.json (renamed to package.json in builder stage)
COPY --from=builder /usr/app/package.json ./package.json

# Install production dependencies (based on package.prod.json)
RUN npm install --omit=dev

# Lambda handler
CMD ["index.handler"] 
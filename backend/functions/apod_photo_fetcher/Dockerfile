FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy package files first for better layer caching
COPY backend/functions/apod_photo_fetcher/package.json ./
COPY backend/functions/apod_photo_fetcher/lambda-package.json ./
COPY shared/package.json ./shared/

# Install dependencies
RUN npm install && \
    cd shared && npm install && cd ..

# Copy source code and build scripts
COPY shared/build.js shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY backend/functions/shared ../shared
COPY backend/functions/apod_photo_fetcher/*.ts ./
COPY backend/functions/apod_photo_fetcher/build.js ./

# Build packages
RUN mkdir -p dist shared/dist && \
    cd shared && npm run build && cd .. && \
    npm run build:lambda

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only what's needed for production
COPY --from=builder /usr/app/dist/index.js ./
COPY --from=builder /usr/app/shared/dist/index.js ./shared/dist/
COPY --from=builder /usr/app/lambda-package.json ./package.json

# Install production dependencies
RUN npm install --omit=dev

# Lambda handler
CMD ["index.handler"] 
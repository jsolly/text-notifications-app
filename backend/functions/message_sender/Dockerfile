FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy package files first for better layer caching
COPY backend/functions/message_sender/package.json ./
COPY backend/functions/message_sender/lambda-package.json ./
COPY shared/package.json ./shared/

# Install dependencies
RUN npm install && \
    cd shared && npm install && cd ..

# Copy source code and build scripts
COPY shared/build.js shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY backend/functions/shared ../shared
COPY backend/functions/message_sender/*.ts ./
COPY backend/functions/message_sender/build.js ./

# Build packages
RUN mkdir -p dist shared/dist && \
    cd shared && npm run build && cd .. && \
    npm run build:lambda

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Set NODE_OPTIONS to enable source maps only
# ENV NODE_OPTIONS="--enable-source-maps"

# Copy only what's needed for production
COPY --from=builder /usr/app/dist/index.js ./
COPY --from=builder /usr/app/shared/dist/index.js ./shared/dist/
COPY --from=builder /usr/app/lambda-package.json ./package.json

# Install production dependencies
RUN npm install --omit=dev

# Lambda handler
CMD ["index.handler"] 
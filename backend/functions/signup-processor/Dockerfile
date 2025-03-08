FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy necessary files
COPY backend/functions/signup-processor/package*.json ./
COPY shared ./shared
COPY backend/functions/shared ./functions/shared
COPY backend/functions/signup-processor/*.ts ./
COPY backend/functions/shared/db.ts ../shared/db.ts

# Create necessary directories
RUN mkdir -p dist shared/dist

# Install dependencies and build
RUN npm pkg delete type && npm install && \
    cd shared && npm install && \
    npm install -g esbuild && \
    npx tsc --emitDeclarationOnly && \
    esbuild src/index.ts --bundle --platform=node --target=es2020 --outfile=dist/index.js --format=esm --sourcemap && \
    cd .. && \
    esbuild index.ts --bundle --platform=node --minify --target=es2020 --outfile=dist/index.js --format=cjs --resolve-extensions=.js,.ts --alias:@text-notifications/shared=./shared/dist/index.js --external:pg

FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only what's needed for the Lambda function
COPY --from=builder /usr/app/dist/index.js ./
COPY --from=builder /usr/app/shared/dist ./shared/dist
COPY --from=builder /usr/app/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

CMD ["index.handler"]
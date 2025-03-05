FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app

# Copy package files and shared package
COPY functions/signup-processor/package.json ./
COPY functions/signup-processor/package-lock.json ./
COPY shared ./shared

# Remove type: module from package.json
RUN npm pkg delete type

# Install dependencies and build shared package
RUN npm install
RUN cd shared && npm install && npm run build

# Build the main function
COPY functions/signup-processor/*.ts ./
RUN npm install -g esbuild
RUN esbuild index.ts --bundle --platform=node --minify --target=es2020 --outfile=dist/index.js --format=cjs --resolve-extensions=.js,.ts --alias:@text-me-when/shared=./shared/dist/index.js

FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy built files and dependencies
COPY --from=builder /usr/app/dist/* ./
COPY --from=builder /usr/app/package.json ./
COPY --from=builder /usr/app/package-lock.json ./
COPY shared ./shared
ENV CI=true
RUN npm install --omit=dev

CMD ["index.handler"]
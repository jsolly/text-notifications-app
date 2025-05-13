FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder

ARG FUNCTION_NAME
ENV FUNCTION_NAME=${FUNCTION_NAME}

WORKDIR /app

# Copy the entire build context prepared by build.sh
COPY . .

# Install NPM shared package dependencies
RUN cd ./shared && npm install

# Install Lambda function dependencies
RUN cd ./backend/functions/${FUNCTION_NAME} && npm install

# Build packages (Shared package first, then Lambda)
RUN cd ./shared && npm run build
RUN /bin/bash -c 'echo "Building in CWD: $(pwd) for FUNCTION_NAME: ${FUNCTION_NAME}" && \
    cd ./backend/functions/${FUNCTION_NAME} && \
    echo "New CWD for build: $(pwd)" && \
    echo "Listing files in rootDir (/app/backend/functions/):" && ls -R /app/backend/functions/ && \
    echo "Listing files in CWD ($(pwd)) for ${FUNCTION_NAME}:" && ls -A && \
    npm run build'

# Prepare for final image: replace package.json with the production version
RUN cp ./backend/functions/${FUNCTION_NAME}/package.prod.json ./backend/functions/${FUNCTION_NAME}/package.json

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
ARG FUNCTION_NAME
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy built Lambda code
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/dist/ ./ 

# Copy built NPM shared package
COPY --from=builder /app/shared/dist/ ./shared/dist/

# Copy production package.json for the Lambda
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/package.json ./package.json

# Install production dependencies for the Lambda
RUN npm install --omit=dev

CMD ["index.handler"] 
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder

ARG FUNCTION_NAME
ENV FUNCTION_NAME=${FUNCTION_NAME}

WORKDIR /app

# Copy only the necessary files for building the Lambda function
# Instead of copying everything and then only using parts
COPY ./backend/functions/${FUNCTION_NAME}/ ./backend/functions/${FUNCTION_NAME}/
COPY ./backend/functions/shared/ ./backend/functions/shared/
COPY ./backend/config/ ./backend/config/
COPY ./shared/dist/ ./backend/functions/${FUNCTION_NAME}/_shared_pkg_build/dist/

# Install Lambda function dependencies
RUN cd ./backend/functions/${FUNCTION_NAME} && npm install

# Build Lambda function
RUN cd ./backend/functions/${FUNCTION_NAME} && npm run build:lambda

# Final image
FROM public.ecr.aws/lambda/nodejs:22-arm64
ARG FUNCTION_NAME
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy built Lambda code
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/dist/ ./ 

# Copy the original package.json for the Lambda
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/package.json ./package.json

# Install production dependencies for the Lambda
RUN npm install --omit=dev

CMD ["index.handler"]
# ##############################################################################
# # Builder stage
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder

ARG FUNCTION_NAME
ENV FUNCTION_NAME=${FUNCTION_NAME}

WORKDIR /app/backend/functions/${FUNCTION_NAME}

# Copy manifest first for cached installs
COPY ./backend/functions/${FUNCTION_NAME}/package.json ./package.json
COPY ./backend/functions/${FUNCTION_NAME}/package-lock.json ./package-lock.json
RUN npm ci

# Copy all source files from the specific function directory
COPY ./backend/functions/${FUNCTION_NAME}/ ./

# Copy shared packages and config using paths relative to the new WORKDIR,
# ensuring they land in the correct locations as originally intended.
COPY ./backend/functions/shared/ ../shared/
COPY ./backend/config/ ../../config/
COPY ./shared/dist/ ./_shared_pkg_build/dist/

# Build Lambda function
RUN npm run build:lambda

# ##############################################################################
# # Final image
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:22-arm64
ARG FUNCTION_NAME
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy built Lambda code
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/dist/ ./ 

# Copy the original package.json for the Lambda
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/package.json ./package.json
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/package-lock.json ./package-lock.json

# Install production dependencies for the Lambda
RUN npm ci --omit=dev

CMD ["index.handler"]
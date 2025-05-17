# ##############################################################################
# # Builder stage
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder

ARG FUNCTION_NAME
ENV FUNCTION_NAME=${FUNCTION_NAME}

WORKDIR /app

# Copy all the files needed for the Lambda function
COPY ./backend/functions/${FUNCTION_NAME}/ /app/backend/functions/${FUNCTION_NAME}/
COPY ./backend/functions/shared/ /app/backend/functions/shared/
COPY ./backend/config/ /app/backend/config/
COPY ./shared/dist/ /app/backend/functions/${FUNCTION_NAME}/_shared_pkg_build/dist/

# Install Lambda function dependencies using absolute paths from WORKDIR
RUN cd /app/backend/functions/${FUNCTION_NAME} && npm install

# Build Lambda function using absolute paths from WORKDIR
RUN cd /app/backend/functions/${FUNCTION_NAME} && npm run build:lambda

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

# Install production dependencies for the Lambda
RUN npm install --omit=dev

CMD ["index.handler"]
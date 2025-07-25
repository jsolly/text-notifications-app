# ##############################################################################
# # Shared artifacts stage
# ##############################################################################
FROM scratch AS shared_artifacts
COPY shared/dist /opt/shared_dist

# ##############################################################################
# # Builder stage
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:20-arm64 AS builder

ARG FUNCTION_NAME
ENV FUNCTION_NAME=${FUNCTION_NAME}

WORKDIR /app

# Copy root package manager files first for better caching.
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

# Copy the package.json for the specific function.
COPY backend/functions/${FUNCTION_NAME}/package.json ./backend/functions/${FUNCTION_NAME}/package.json

# Copy local workspace dependencies and other shared resources needed for npm ci.
COPY shared/ ./shared/
COPY backend/functions/shared/ ./backend/functions/shared/

# Install dependencies. This layer is cached if package files & shared source don't change.
RUN npm ci --workspace backend/functions/${FUNCTION_NAME}

# Copy the pre-built shared library artifacts from the dedicated stage.
COPY --from=shared_artifacts /opt/shared_dist ./backend/functions/${FUNCTION_NAME}/shared_dist_from_stage/

# Copy the rest of the function's source code *after* npm ci to leverage caching.
COPY backend/functions/${FUNCTION_NAME}/ ./backend/functions/${FUNCTION_NAME}/

# Build the lambda function.
WORKDIR /app/backend/functions/${FUNCTION_NAME}
RUN npm run build:lambda:docker
WORKDIR /app

# ##############################################################################
# # Final stage
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:20-arm64 AS final

ARG FUNCTION_NAME

WORKDIR /var/task

# Copy build artifacts and necessary package files from builder.
COPY --from=builder \
  /app/backend/functions/${FUNCTION_NAME}/dist/ \
  /app/backend/functions/${FUNCTION_NAME}/package.json \
  /app/package-lock.json \
  ./

# Install production dependencies.
RUN npm install --omit=dev

CMD ["index.handler"]
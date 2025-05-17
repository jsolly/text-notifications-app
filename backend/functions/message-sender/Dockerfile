# ##############################################################################
# # Builder stage
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder

ARG FUNCTION_NAME
ENV FUNCTION_NAME=${FUNCTION_NAME}

WORKDIR /app

# Copy necessary package manager files and workspace sources
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json

COPY backend/functions/${FUNCTION_NAME}/ ./backend/functions/${FUNCTION_NAME}/
COPY shared/ ./shared/
COPY backend/config/ ./backend/config/ 
COPY backend/functions/shared/ ./backend/functions/shared/

RUN npm ci --workspace backend/functions/${FUNCTION_NAME}

# Prepare shared package for the build alias
RUN mkdir -p backend/functions/${FUNCTION_NAME}/_shared_pkg_build/
RUN cp -R shared/dist/ backend/functions/${FUNCTION_NAME}/_shared_pkg_build/dist/

RUN cd backend/functions/${FUNCTION_NAME} && npm run build:lambda

# ##############################################################################
# # Final stage: Copy only the necessary files from the builder stage
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS final

ARG FUNCTION_NAME

# # Set the working directory
WORKDIR /var/task

# Copy the function code, package.json, and package-lock.json from the builder stage
COPY --from=builder \
  /app/backend/functions/${FUNCTION_NAME}/dist/ \
  /app/backend/functions/${FUNCTION_NAME}/package.json \
  /app/package-lock.json \
  ./

# # Install production dependencies
RUN npm install --omit=dev

CMD ["index.handler"]
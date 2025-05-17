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
# # Final image
# ##############################################################################
FROM public.ecr.aws/lambda/nodejs:22-arm64
ARG FUNCTION_NAME
WORKDIR ${LAMBDA_TASK_ROOT}

# Source paths in builder are now relative to /app
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/dist/ ./
COPY --from=builder /app/backend/functions/${FUNCTION_NAME}/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Remove devDependencies from the copied package.json before running npm ci
RUN node -e "const fs = require('fs'); const pkgPath = './package.json'; const pkg = JSON.parse(fs.readFileSync(pkgPath)); delete pkg.devDependencies; fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2)); console.log('Removed devDependencies from package.json in final stage.');"

RUN npm ci --omit=dev

CMD ["index.handler"]
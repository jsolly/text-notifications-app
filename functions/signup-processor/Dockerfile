FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app
COPY package.json package-lock.json tsconfig.json ./

# Install dependencies including dev dependencies for build
RUN npm ci
COPY *.ts ./
RUN npm run build
RUN cat dist/meta.json

FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
COPY package.json package-lock.json ./

# Install production dependencies and verify pg installation
RUN npm ci --omit=dev && \
    node -e "const pg = require('pg'); console.log('PG Module check:', { version: pg.version, hasClient: typeof pg.Client === 'function' });"

CMD ["index.handler"]
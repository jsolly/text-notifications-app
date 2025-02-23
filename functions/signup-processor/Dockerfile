FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app
COPY package.json package-lock.json tsconfig.json ./

# Install dependencies and build
RUN npm ci
COPY *.ts ./
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

CMD ["index.handler"]
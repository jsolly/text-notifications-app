FROM public.ecr.aws/lambda/nodejs:22-arm64 AS builder
WORKDIR /usr/app
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY *.ts ./
RUN npm install -g pnpm && \
    pnpm install && \
    pnpm run build

FROM public.ecr.aws/lambda/nodejs:22-arm64
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --prod
CMD ["index.handler"]
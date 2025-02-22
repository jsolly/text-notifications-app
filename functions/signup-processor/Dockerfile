FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR /usr/app
COPY package.json pnpm-lock.yaml tsconfig.json index.ts db.ts ./
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm run build

FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
CMD ["index.handler"]
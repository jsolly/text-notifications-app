# Text Notifications App

A web application that allows users to sign up for customized text message notifications for various events like astronomical events, Bitcoin price milestones, and daily historical facts.

## Features

- **Instant Notifications**
  - Notifications that are triggered when a specific event occurs

- **Daily Notifications**
  - Notifications that are sent daily at a specific time

## Tech Stack

### Frontend

- [Astro](https://astro.build/) - Web framework for content-focused websites
- [Vue.js](https://vuejs.org/) - Interactive form components
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript for checkboxes
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### Backend & Database

- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless functions in TypeScript and Python
- [Neon](https://neon.tech/) - Serverless Postgres database

### Infrastructure & DevOps

- [AWS](https://aws.amazon.com/) - Cloud hosting and services
- [Terraform](https://www.terraform.io/) - Infrastructure as Code
- [GitHub Actions](https://github.com/features/actions) - CI/CD pipelines
- [AWS SAM](https://aws.amazon.com/serverless/sam/) - Local debugging

## Development

### Getting Started

```shell
git clone git@github.com:jsolly/text-notifications-app.git
cd text-notifications-app
npm install
npm dev
```

### Local Debugging with AWS SAM

If you want to test all the functions where they all sit and listen on port 3000. This will build the functions and start the API. NOTE: This can take a while to start up.

```shell
sam build && sam local start-api --env-vars env.json
```

Similarly, you can test a single function by sarting the API with just the function you want to test.

```shell
sam build && sam local start-api --env-vars env.json --single <function-name>
```

Once one or all functions are running, you can test one or all of them with a default event by curling the appropriate endpoint like so:

```shell
# Test with a default event
curl -XPOST "http://localhost:3000/<function-name>" \
  -d @backend/events/<function-name>-event.json
```

You can also execute a single function invocation. This will build the function, invoke it, and then exit.

```shell
sam build && sam local invoke <function-name> -e backend/events/<event-name>.json --env-vars env.json
```

### Local Testing

Tests are only written for the serverless functions. You can find them in the `functions/<function-name>/test` directory for each function.

```shell
npm test
```

## Project Structure

```sh
/
├── src/                      # Frontend Astro application
│   ├── components/          # Vue and Astro components
│   ├── layouts/            # Astro layouts
│   ├── pages/              # Astro pages
│   ├── assets/            # Static assets and styles
│   └── public/            # Public static files
├── functions/               # Serverless Functions
│   ├── signup-processor/   # User signup processing function
│   └── build.sh           # Function build script
├── deploy/                  # Infrastructure as Code
│   └── prod/              # Production environment
├── shared/                  # Shared utilities and types
├── db/                      # Database migrations and schemas
│   ├── schema.sql         # Database schema definition
│   ├── apply-schema.sh    # Script to apply schema changes
│   └── etl/               # Data extraction, transformation, loading
├── scripts/                 # Utility scripts
├── events/                  # Test events for Lambda functions
├── public/                  # Static assets
├── dist/                    # Build output directory
├── .aws-sam/                # AWS SAM build artifacts
└── .github/                 # GitHub Actions workflows
    └── workflows/          # CI/CD pipeline configurations
        ├── deploy.yml      # Deployment workflow
        └── noDeploy.yml    # Non-deployment workflow

Key Configuration Files:
- config/astro.config.mjs         # Astro configuration
- template.yaml           # AWS SAM template
- config/tailwind.config.mjs      # Tailwind CSS configuration
- config/tsconfig.json           # TypeScript configuration
- config/biome.json             # Biome linter configuration
- config/vitest.config.ts       # Vitest test configuration
- package.json           # Project dependencies and scripts
- .env                   # Environment variables (gitignored)
- sample.env            # Environment variables template
- sample.env.json       # Environment variables for AWS SAM
- env.json              # Environment variables for AWS SAM (gitignored)
```

## Troubleshooting

### Refresh infra_as_code remote code

```shell
cd infra/prod
aws sso login
terraform init -upgrade
```

## Adding a New Lambda Function

### 1. Creating the Infrastructure

1. Add the function to the lambda_functions map in infra/prod/backend/functions/main.tf
2. Set only_create_ecr_repository to true to bootstrap the lambda function
3. Perform a terraform apply
4. Change only_create_ecr_repository to false and perform another terraform apply to deploy the lambda function
5. Add the erc_repository_url to the Github Actions environment variable ECR_REPOSITORY_URLS. The equals signs will need to be replaced with colons and a comma added between the urls.

### 2. Creating the Function Code

1. Create a new directory in backend/functions/<function-name>
2. Add a test for the function in test/functions/<function-name>.test.ts
3. Add the function code to the new directory
4. Add the function to the template.yaml file
5. See [Local Debugging with AWS SAM](#local-debugging-with-aws-sam) to see how to test the lambda function locally

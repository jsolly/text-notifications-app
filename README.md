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

```shell
sam build && sam local start-api --env-vars env.json
```

```shell
# Test with a default event
curl -XPOST "http://localhost:3000/signup" \
  -d @backend/events/notification-preferences-event.json
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

### Troubleshooting

#### Refresh infra_as_code remote code

```shell
cd infra/prod
aws sso login
terraform init -upgrade
```

#### Add a new lambda function

```shell
Add the function to the lambda_functions map in infra/prod/backend/functions/main.tf
Set only_create_ecr_repository to true to bootstrap the lambda function
Perform a terraform apply
Change only_create_ecr_repository to false and perform another terraform apply to deploy the lambda function
Copy the the erc_repository_url from the terraform output into the .env file
If using Github Actions, add the erc_repository_url to the Github Actions environment variable ECR_REPOSITORY_URLS (remove outer quotes when adding as a repo secret in GitHub to make it valid JSON)
```

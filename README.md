# Text Notifications App

A web application that allows users to sign up for customized text message notifications for weather alerts.

## Features

- **Instant Notifications**
  - Notifications that are triggered when a specific event occurs

- **Daily Notifications**
  - Notifications that are sent daily at a specific time

## Tech Stack

### Frontend

- [Astro](https://astro.build/) - Web framework for content-focused websites
- [Vue.js](https://vuejs.org/) - Interactive form components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### Backend & Database

- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless functions in TypeScript
- [Neon](https://neon.tech/) - Serverless Postgres database

### Infrastructure & DevOps

- [AWS](https://aws.amazon.com/) - Cloud hosting and services
- [Terraform](https://www.terraform.io/) - Infrastructure as Code
- [GitHub Actions](https://github.com/features/actions) - CI/CD pipelines
- [AWS SAM](https://aws.amazon.com/serverless/sam/) - Local debugging

### Development Tools

- [Biome](https://biomejs.dev/) - Fast linter and formatter
- [TypeScript](https://www.typescriptlang.org/) - Type checking

## Development

### Getting Started

```shell
git clone git@github.com:jsolly/text-notifications-app.git
cd text-notifications-app
npm install
npm run build # Needed for /shared package
npm run dev
```

### Local Debugging with AWS SAM

If you want to test all the functions where they all sit and listen on port 3000. This will build the functions and start the API. NOTE: This can take a while to start up.

```shell
sam build && sam local start-api --env-vars .env.json
```

Once one or all functions are running, you can test one or all of them with a default event by curling the appropriate endpoint like so:

```shell
curl -XPOST "http://localhost:3000/`<function-name>`" \
  -d @backend/events/`<function-name>`.json
```

Example:

```shell
curl -XPOST "http://localhost:3000/signup" \
  -d @backend/events/signup.json
```

You can also execute a single function invocation. This will build the function, invoke it, and then exit (No need to start the API).

```shell
sam build && sam local invoke `<function-name>` -e backend/events/`<event-name>`.json --env-vars .env.json
```

Example:

```shell
sam build && sam local invoke SignupProcessorFunction -e backend/events/signup.json --env-vars .env.json
sam build && sam local invoke MessageSenderFunction -e backend/events/message-sender.json --env-vars .env.json
```

### Local Testing

Tests are only written for the serverless functions. You can find them in the `tests/functions/<function-name>` directory.

To bootstrap the database for integration tests, run the following commands:

```shell
# Create the databases
createdb text-notifications-db-local-test
createdb text-notifications-db-local

# Bootstrap the databases
./scripts/bootstrap_everything.sh "$DATABASE_URL" "$DATABASE_URL_TEST" ./scripts/cities_etl/output/US_with_timezone.sql
```

```shell
npm test # Run all tests
npm run test:unit # Run unit tests
npm run test:integration # Run integration tests
npm run test:watch # Run tests in watch mode
```

## Project Structure

```sh
/
├── frontend/              # Frontend Astro application
│   ├── src/               # Source code
│   │   ├── components/    # Vue and Astro components
│   │   ├── layouts/       # Astro layouts
│   │   ├── pages/         # Astro pages
│   │   └── assets/        # Static assets and styles
│   ├── public/            # Public static files
│   ├── astro.config.ts    # Frontend configuration
│   └── scripts/           # Frontend utility scripts
├── backend/               # Backend services
│   ├── functions/         # Serverless Lambda Functions
│   ├── events/            # Test events for Lambda functions
│   └── db/                # Database migrations and schemas
├── tests/                 # Test files
│   └── functions/         # Function tests
├── shared/                # Shared utilities and types
├── scripts/               # Utility scripts
├── infra/                 # Infrastructure as Code
│   └── prod/              # Production environment
├── .github/               # GitHub Actions workflows
│   └── workflows/         # CI/CD pipeline configurations
└── node_modules/          # Node.js dependencies

Key Configuration Files:
- template.yaml            # AWS SAM template
- package.json             # Project dependencies and scripts
- .env                     # Environment variables (gitignored)
- .env.sample              # Environment variables template
- .env.sample.json         # Environment variables for AWS SAM
- .env.json                # Environment variables for AWS SAM (gitignored)
```

## Re-create Cities Database ETL (Only needed if the cities database is out of date)

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/cities_etl/requirements.txt

# Create the US SQL file
python3 scripts/cities_etl/create_us_sql.py

# Add timezone to the cities
python3 scripts/cities_etl/add_timezone_to_cities.py
```


## Troubleshooting

### Refresh infra_as_code remote code

```shell
cd infra/prod
aws sso login
AWS_PROFILE=general-admin terraform init -upgrade
```

## Adding a New Lambda Function

### 1. Creating the Infrastructure

1. Add the function to the lambda_functions map in infra/prod/backend/functions/main.tf
2. Set only_create_ecr_repository to true to bootstrap the lambda function
3. Perform a terraform apply
4. Change only_create_ecr_repository to false and perform another terraform apply to deploy the lambda function
5. Add the erc_repository_url to the Github Actions environment variable ECR_REPOSITORY_URLS. The equals signs will need to be replaced with colons and a comma added between the urls.

### 2. Creating the Function Code

1. Create a new directory in backend/functions/`<function-name>`
2. Add a test for the function in tests/functions/`<function-name>`.test.ts
3. Add the function code to the new directory
4. Add the function to the template.yaml file
5. See [Local Debugging with AWS SAM](#local-debugging-with-aws-sam) to see how to test the lambda function locally

## Available Scripts

```bash
# Development
npm run dev               # Run development server for shared and frontend
npm run dev:shared        # Run development server for shared package
npm run dev:frontend      # Run development server for frontend

# Building
npm run build             # Build all packages
npm run build:shared      # Build shared package
npm run build:frontend    # Build frontend
npm run build:backend     # Build backend Lambda functions

# Testing
npm test                  # Run all tests
npm run test:unit         # Run unit tests
npm run test:integration  # Run integration tests
npm run test:watch        # Run tests in watch mode

# Code Quality
npm run fix               # Run all code quality checks with formatting
npm run format            # Format code with Biome
npm run lint              # Run linting with Biome
npm run check:ts          # Run TypeScript type checking
npm run check:iac         # Run IaC validation with Terraform
npm run astro:check       # Run Astro type checking
```

# Text Notifications App

A web application that allows users to sign up for customized text message notifications for various events like astronomical events, Bitcoin price milestones, and daily historical facts.

## Features

- **Instant Alerts**
  - Bitcoin price notifications

- **Daily Notifications**
  - Astrological events (meteor showers, full moons, eclipses)
  - Historical facts (science, space, technology, culture)
  - Customizable notification timing preferences

- **Developer Experience**
  - Type-safe development with TypeScript
  - Automated testing and linting
  - Infrastructure as Code for reproducible deployments

## Tech Stack

### Frontend

- [Astro](https://astro.build/) - Web framework for content-focused websites
- [Vue.js](https://vuejs.org/) - Interactive form components
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript for checkboxes
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### Backend & Database

- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless functions
- [Neon](https://neon.tech/) - Serverless Postgres database
- [TypeScript](https://www.typescriptlang.org/) - Type-safe Lambda functions

### Infrastructure & DevOps

- [AWS](https://aws.amazon.com/) - Cloud hosting and services
- [Terraform](https://www.terraform.io/) - Infrastructure as Code
- [GitHub Actions](https://github.com/features/actions) - CI/CD pipelines

## Development

### Getting Started

```shell
git clone git@github.com:jsolly/text-notifications-app.git
cd text-notifications-app
pnpm install
pnpm dev
```

### Local Debugging with Containers

For testing Lambda functions locally using containers:

1. Build and run the signup processor container:

```shell
# Build the container
docker build -t signup-processor functions/signup-processor/

# Run the container (replace DATABASE_URL with your development credentials)
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:password@your-dev-db-host/dbname?sslmode=require" \
  signup-processor
```

1. Test the function using curl:

```shell
# Test with an empty name event
curl -XPOST "http://localhost:8080/2015-03-31/functions/function/invocations" \
  -d @events/empty-name-event.json
```

Note: Make sure to replace the database credentials with your development environment values.

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
├── test/                    # Test files
├── scripts/                 # Utility scripts
├── events/                  # Test events for Lambda functions
├── public/                  # Static assets
└── .github/                 # GitHub Actions workflows
    └── workflows/          # CI/CD pipeline configurations

Key Configuration Files:
- astro.config.mjs         # Astro configuration
- tailwind.config.mjs      # Tailwind CSS configuration
- tsconfig.json           # TypeScript configuration
- biome.json             # Biome linter configuration
- vitest.config.ts       # Vitest test configuration
- package.json           # Project dependencies and scripts
- .env                   # Environment variables (gitignored)
- sample.env            # Environment variables template
```

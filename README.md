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
- [AWS SAM](https://aws.amazon.com/serverless/sam/) - Local debugging

## Development

### Getting Started

```shell
git clone git@github.com:jsolly/text-notifications-app.git
cd text-notifications-app
pnpm install
pnpm dev
```

### Local Debugging with AWS SAM

```shell
sam build && sam local start-api --env-vars env.json
```

```shell
# Test with an empty name event
curl -XPOST "http://localhost:3000/signup" \
  -d @events/empty-name-event.json
```

### Local Testing

```shell
pnpm test
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

## Images and Branding Assets

This project includes SVG-based images for avatars and social sharing. These images are programmatically created and can be converted to PNG format using the included script.

### Available Images

- `public/images/notification-avatar.svg` - A notification bell icon for use as an avatar or favicon
- `public/images/social-share.svg` - A larger social share image with text and visual elements
- `public/images/social-share-compact.svg` - A more compact social share image that closely matches the site design
- `public/images/social-share-realistic.svg` - A social share image with a realistic smartphone mockup including detailed UI elements
- `public/images/social-share-iphone.svg` - A social share image with an iPhone-style mockup that closely matches the screenshot
- `public/images/social-share-exact.svg` - A social share image that exactly matches the layout and style of the screenshot

### Converting SVG to PNG

The project includes a script to convert SVG files to PNG format in various sizes:

```bash
# Install dependencies first
npm install

# Generate all PNG images
npm run generate-images

# Generate a specific PNG image
node scripts/svg-to-png.mjs notification-avatar.svg
```

This will generate the following PNG files:

- `notification-avatar.png` (512x512)
- `favicon.png` (32x32)
- `apple-touch-icon.png` (180x180)
- `social-share.png` (1200x630)
- `social-share-compact.png` (1200x630)
- `social-share-realistic.png` (1200x630)
- `social-share-iphone.png` (1200x630)
- `social-share-exact.png` (1200x630)

### Using the Images

#### For Favicon

Add the following to your HTML head:

```html
<link rel="icon" href="/images/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
```

#### For Social Sharing

Add the following meta tags to your HTML head:

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:title" content="Text Notifications App">
<meta property="og:description" content="Get timely updates about the events that matter to you, delivered straight to your phone via text message.">
<meta property="og:image" content="https://yourdomain.com/images/social-share.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:title" content="Text Notifications App">
<meta property="twitter:description" content="Get timely updates about the events that matter to you, delivered straight to your phone via text message.">
<meta property="twitter:image" content="https://yourdomain.com/images/social-share.png">
```

### Customizing the Images

The SVG files can be edited directly to customize colors, text, or other elements. After editing, regenerate the PNG files using the script.

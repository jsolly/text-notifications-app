# Text Notifications App

A web application that allows users to sign up for customized text message notifications for various events like astronomical events, Bitcoin price milestones, and daily historical facts.

## Development

### Getting Started
```shell
git clone git@github.com:jsolly/text-notifications-app.git
cd text-notifications-app
pnpm install
pnpm dev
```

## Features

- **Instant Alerts**
  - Bitcoin price notifications

- **Daily Notifications**
  - Astrological events (meteor showers, full moons, eclipses)
  - Historical facts (science, space, technology, culture)
  - Customizable notification timing preferences

## Tech Stack

### Frontend
- [Astro](https://astro.build/) - Web framework for content-focused websites
- [Vue.js](https://vuejs.org/) - Interactive form components
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript for checkboxes
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### Backend & Database
- [Neon](https://neon.tech/) - Serverless Postgres database
- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless functions

### Infrastructure
- [AWS](https://aws.amazon.com/) - Cloud hosting and services
- [Terraform](https://www.terraform.io/) - Infrastructure as Code

## Layout
src/
├── components/
│   ├── contact-info/           # Contact information related components
│   │   ├── CityInput.vue
│   │   ├── ContactInformation.astro
│   │   ├── PhoneInput.vue
│   │   └── ValidationIcon.vue
│   ├── notifications/          # Notification preference components
│   │   ├── daily/
│   │   │   ├── DailyNotifications.astro
│   │   │   └── categories/
│   │   └── instant/
│   │       └── InstantAlerts.astro
│   └── SignUpForm.astro        # Main form component
├── layouts/
│   └── Layout.astro
└── pages/
    └── index.astro
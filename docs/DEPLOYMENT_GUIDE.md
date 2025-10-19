# Deployment Guide

This document provides instructions for deploying the ChoreChamp application.

## Local Setup

To set up a local development environment, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chore-champion.git
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up the database:**
    - Create a PostgreSQL database.
    - Copy the `.env.example` file to `.env` and update the `DATABASE_URL` with your database connection string.
    - Run the database migrations:
      ```bash
      npx prisma migrate dev
      ```
4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Environment Variables

The following environment variables are required to run the application:

*   `DATABASE_URL`: The connection string for the PostgreSQL database.
*   `JWT_SECRET`: A secret key for signing JWTs.
*   `NEXT_PUBLIC_API_URL`: The URL of the backend API.

## CI/CD Overview

We use [GitHub Actions](https://github.com/features/actions) for continuous integration and continuous deployment. The CI/CD pipeline is configured to automatically build, test, and deploy the application to [Vercel](https://vercel.com/) when changes are pushed to the `main` branch.

## Cloud Deployment

To deploy the application to the cloud, you can use a platform like [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).

### Vercel

1.  Create a new project in Vercel.
2.  Connect your GitHub repository.
3.  Configure the environment variables.
4.  Deploy the application.

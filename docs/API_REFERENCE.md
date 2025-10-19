# API Reference

This document provides a reference for the ChoreChamp API.

## Endpoints

The following table lists the available API endpoints:

| Endpoint                  | Method | Description                  |
| ------------------------- | ------ | ---------------------------- |
| `/api/auth/login`         | POST   | Logs in a user.              |
| `/api/auth/logout`        | POST   | Logs out a user.             |
| `/api/auth/register`      | POST   | Registers a new user.        |
| `/api/tasks`              | GET    | Gets all tasks.              |
| `/api/tasks`              | POST   | Creates a new task.          |
| `/api/tasks/:id`          | PUT    | Updates a task.              |
| `/api/tasks/:id`          | DELETE | Deletes a task.              |
| `/api/leaderboard`        | GET    | Gets the leaderboard.        |
| `/api/score`              | GET    | Gets the user's score.       |

## Schemas

The following sections describe the request and response schemas for each endpoint.

### `/api/auth/login`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**

```json
{
  "token": "your-jwt-token"
}
```

...

## Automation

It is recommended to use a tool like [Swagger](https://swagger.io/) or [Postman](https://www.postman.com/) to automatically generate and maintain the API documentation.

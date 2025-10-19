# Data Model

This document provides a detailed explanation of the ChoreChamp data model.

## Entity-Relationship Diagram

```
+----------+       +----------+
|   User   |-------|  Session |
+----------+       +----------+
     |
     |
     |
+----------+
|   Post   |
+----------+
```

## Schemas

### User

| Field              | Type      | Description                               |
| ------------------ | --------- | ----------------------------------------- |
| `id`               | `String`  | The unique identifier for the user.       |
| `name`             | `String`  | The user's name.                          |
| `email`            | `String`  | The user's email address.                 |
| `password`         | `String`  | The user's hashed password.               |
| `emailVerified`    | `DateTime`| The date and time the user's email was verified. |
| `image`            | `String`  | The URL of the user's profile image.       |
| `role`             | `Role`    | The user's role (either `ADMIN` or `USER`).|
| `createdAt`        | `DateTime`| The date and time the user was created.   |
| `updatedAt`        | `DateTime`| The date and time the user was last updated. |
| `isTwoFactorEnabled`| `Boolean` | Whether the user has two-factor authentication enabled. |
| `lastLoginAt`      | `DateTime`| The date and time the user last logged in. |
| `loginAttempts`    | `Int`     | The number of failed login attempts.      |
| `isBanned`         | `Boolean` | Whether the user is banned.               |

### Post

| Field       | Type       | Description                                  |
| ----------- | ---------- | -------------------------------------------- |
| `id`        | `String`   | The unique identifier for the post.          |
| `title`     | `String`   | The title of the post.                       |
| `content`   | `String`   | The content of the post.                     |
| `authorId`  | `String`   | The ID of the user who created the post.     |
| `createdAt` | `DateTime` | The date and time the post was created.      |
| `updatedAt` | `DateTime` | The date and time the post was last updated. |

### Session

| Field       | Type       | Description                                     |
| ----------- | ---------- | ----------------------------------------------- |
| `id`        | `String`   | The unique identifier for the session.          |
| `userId`    | `String`   | The ID of the user who owns the session.        |
| `createdAt` | `DateTime` | The date and time the session was created.      |
| `expiresAt` | `DateTime` | The date and time the session expires.          |

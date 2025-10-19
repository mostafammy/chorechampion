# Security Policy

This document outlines the security measures in place for the ChoreChamp application.

## Authentication

We use [JSON Web Tokens (JWTs)](https://jwt.io/) for authentication. When a user logs in, they are issued a JWT that is valid for a limited time. The JWT is then sent with each subsequent request to authenticate the user.

## Data Validation

We use [Zod](https://zod.dev/) for data validation. All data that is sent to the backend is validated to ensure that it is in the correct format and meets the required constraints.

## Risk Mitigation

We have implemented the following measures to mitigate security risks:

*   **Password Hashing:** We use [bcrypt](https://www.npmjs.com/package/bcrypt) to hash passwords before storing them in the database.
*   **Cross-Site Scripting (XSS) Prevention:** We use [React's built-in XSS protection](https://reactjs.org/docs/dom-elements.html#style) to prevent XSS attacks.
*   **Cross-Site Request Forgery (CSRF) Prevention:** We use [Next.js's built-in CSRF protection](https://nextjs.org/docs/api-routes/introduction#csrf-protection) to prevent CSRF attacks.
*   **Rate Limiting:** We have implemented rate limiting to prevent brute-force attacks.

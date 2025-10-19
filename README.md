# ChoreChamp

**ChoreChamp** is a gamified task management application designed to make chores more engaging and rewarding. It allows users to create tasks, track their progress, and earn points for completing them. The application also features a leaderboard to foster friendly competition and motivation.

## ✨ Features

*   **Task Management:** Create, update, and delete tasks with ease.
*   **Gamification:** Earn points for completing tasks and climb the leaderboard.
*   **User Authentication:** Secure user authentication and authorization.
*   **Internationalization:** Support for multiple languages.

## 🚀 Quick Start

To get started with ChoreChamp, follow these steps:

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

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📚 Documentation

For more detailed information about the project, please refer to the following documents in the `/docs` directory:

*   **[ARCHITECTURE.md](./docs/ARCHITECTURE.md):** An overview of the system architecture.
*   **[API_REFERENCE.md](./docs/API_REFERENCE.md):** The complete API reference.
*   **[DATA_MODEL.md](./docs/DATA_MODEL.md):** A detailed explanation of the data model.
*   **[CONTRIBUTING.md](./docs/CONTRIBUTING.md):** Guidelines for contributing to the project.
*   **[DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md):** Instructions for deploying the application.

### Fixora Campus
### Campus Issue Reporting and Management System

Fixora Campus is a web-based campus issue reporting and management system developed to make reporting, tracking, and managing university-related complaints easier and more organized.

The platform allows students to submit complaints with relevant location details, while administrators can manage reports and update their status.

---

## Features

- **Complaint Reporting:** Students can submit campus-related complaints.
- **Complaint Tracking:** View submitted complaints and their current status.
- **Location Details:** Specify hostel, floor, room number, and exact issue location.
- **Admin Management:** Administrators can view and manage submitted complaints.
- **Status Updates:** Update complaint progress and keep reports organized.
- **Priority and Categories:** Organize complaints based on their category and priority.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| Backend | Node.js |
| Backend Framework | Express.js |
| Database | MySQL |
| Database Tool | MySQL Workbench |
| Programming Language | JavaScript |

## Project Structure

```text
Fixora-Campus/
├── public/
├── server/
│   ├── db.js
│   ├── server.js
│   ├── seedAdmin.js
│   └── package.json
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

## Installation and Setup

### Prerequisites

- Node.js and npm
- MySQL Server
- MySQL Workbench
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/dhruv-verma-sys/Fixora-Campus.git
```

### 2. Open the Project

```bash
cd Fixora-Campus
```

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Install Backend Dependencies

```bash
cd server
npm install
```

### 5. Configure the Database

- Start MySQL Server.
- Open MySQL Workbench and create the database required by the application.
- Inside the `server` folder, create a `.env` file.
- Add the following configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
```

Replace the placeholder values with your own MySQL configuration.

**Note:** Never upload your `.env` file or database credentials to GitHub.

### 6. Start the Backend

Open a terminal inside the `server` directory and run:

```bash
npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

### 7. Start the Frontend

Open a separate terminal in the project root directory and run:

```bash
npm run dev
```

Vite will display a local URL. Open that URL in your browser to access Fixora Campus.

### 8. Build for Production

To create an optimized production build, run:

```bash
npm run build
```

## Project Objective

The main objective of Fixora Campus is to provide a centralized platform where campus issues can be reported, monitored, and managed efficiently.

## Future Scope

- Email and notification integration.
- Advanced complaint analytics and reports.
- Improved complaint tracking and management.
- Additional campus facilities and location support.

## Developer

**Project Name:** Fixora Campus

**GitHub:** [dhruv-verma-sys](https://github.com/dhruv-verma-sys)

**Repository:** [Fixora Campus](https://github.com/dhruv-verma-sys/Fixora-Campus)

---

*Developed as a Full Stack Development Project.*
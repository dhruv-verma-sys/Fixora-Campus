
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const ALLOWED_STATUSES = ["Reported", "In Progress", "Resolved"];
const ALLOWED_PRIORITIES = ["Low", "Medium", "High"];
const ALLOWED_ISSUE_LOCATIONS = [
  "Inside room",
  "Washroom",
  "Corridor",
  "Common area",
  "Other"
];

function formatReport(row) {
  return {
    id: String(row.id),
    code: row.code,
    title: row.title,
    category: row.category,
    location: row.location,
    floor: row.floor || "",
    room_number: row.room_number || "",
    issue_location: row.issue_location || "",
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt
  };
}

const REPORT_SELECT = `
  SELECT
    id,
    report_code AS code,
    title,
    category,
    location,
    floor,
    room_number,
    issue_location,
    description,
    status,
    priority,
    created_at AS createdAt
  FROM reports
`;

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required."
    });
  }

  next();
}

function requireStudent(req, res, next) {
  if (req.user.role !== "student") {
    return res.status(403).json({
      message: "Student access required."
    });
  }

  next();
}

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Fixora Campus API is running!"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await db.execute("SELECT 1");

    res.json({
      status: "OK",
      database: "Connected"
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed."
    });
  }
});

// Student registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        message: "Name must contain 2 to 100 characters."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Enter a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain 8 to 72 characters."
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, 'student')`,
      [cleanName, cleanEmail, hashedPassword]
    );

    res.status(201).json({
      message: "Student account created successfully.",
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role: "student"
      }
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Registration failed."
    });
  }
});

// Login for students and admins
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await db.execute(
      `SELECT id, name, email, password, role
       FROM users
       WHERE email = ?`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Login failed."
    });
  }
});

// Get currently logged-in user
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json({
      user: users[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not retrieve user."
    });
  }
});

// Get reports: students see their own, admins see all
app.get("/api/reports", authenticateToken, async (req, res) => {
  try {
    let sql = REPORT_SELECT;
    const params = [];

    if (req.user.role === "student") {
      sql += " WHERE created_by = ?";
      params.push(req.user.id);
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied."
      });
    }

    sql += " ORDER BY id DESC";

    const [rows] = await db.execute(sql, params);

    res.json(rows.map(formatReport));
  } catch (error) {
    console.error("Fetch reports error:", error.message);

    res.status(500).json({
      message: "Could not fetch reports."
    });
  }
});

// Submit complaint: students only
app.post(
  "/api/reports",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    try {
      const {
        title,
        category,
        location,
        floor,
        room_number,
        issue_location,
        description,
        priority
      } = req.body;

      if (
        !title?.trim() ||
        !category ||
        !location ||
        !description?.trim()
      ) {
        return res.status(400).json({
          message: "Please provide all required complaint details."
        });
      }

      const exactLocation = issue_location || "Other";

      if (!ALLOWED_ISSUE_LOCATIONS.includes(exactLocation)) {
        return res.status(400).json({
          message: "Invalid exact issue location."
        });
      }

      const roomRequired = [
        "Inside room",
        "Washroom"
      ].includes(exactLocation);

      if (
        roomRequired &&
        (!floor?.trim() || !room_number?.trim())
      ) {
        return res.status(400).json({
          message: "Floor and room number are required for this location."
        });
      }

      if (!ALLOWED_PRIORITIES.includes(priority || "Medium")) {
        return res.status(400).json({
          message: "Invalid priority."
        });
      }

      const [result] = await db.execute(
        `INSERT INTO reports
        (
          report_code,
          title,
          category,
          location,
          floor,
          room_number,
          issue_location,
          description,
          status,
          priority,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Reported', ?, ?)`,
        [
          "PENDING",
          title.trim(),
          category,
          location,
          floor?.trim() || null,
          room_number?.trim() || null,
          exactLocation,
          description.trim(),
          priority || "Medium",
          req.user.id
        ]
      );

      const reportCode = `CU-${result.insertId + 5039}`;

      await db.execute(
        "UPDATE reports SET report_code = ? WHERE id = ?",
        [reportCode, result.insertId]
      );

      const [rows] = await db.execute(
        `${REPORT_SELECT} WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json(formatReport(rows[0]));
    } catch (error) {
      console.error("Submit report error:", error.message);

      res.status(500).json({
        message: "Could not submit complaint."
      });
    }
  }
);

// Update complaint status: admins only
app.patch(
  "/api/reports/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;
      const reportId = req.params.id;

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid complaint status."
        });
      }

      const [result] = await db.execute(
        `UPDATE reports
         SET status = ?
         WHERE id = ? OR report_code = ?`,
        [status, reportId, reportId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Complaint not found."
        });
      }

      const [rows] = await db.execute(
        `${REPORT_SELECT} WHERE id = ? OR report_code = ?`,
        [reportId, reportId]
      );

      res.json({
        message: "Complaint status updated successfully.",
        report: formatReport(rows[0])
      });
    } catch (error) {
      console.error("Status update error:", error.message);

      res.status(500).json({
        message: "Could not update complaint status."
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Fixora Campus backend running on port ${PORT}`);
});

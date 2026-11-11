
const bcrypt = require("bcryptjs");
const db = require("./db");
require("dotenv").config();

async function seedAdmin() {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error("Admin environment variables are missing.");
    }

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters.");
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log("Admin account already exists. No changes made.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      [name, email, hashedPassword]
    );

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

seedAdmin();

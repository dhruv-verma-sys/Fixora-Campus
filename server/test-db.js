const db = require("./db");

async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log("MySQL connected successfully!");

    const [rows] = await connection.query("SELECT VERSION() AS version");
    console.log("MySQL Version:", rows[0].version);

    connection.release();
    await db.end();
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
    await db.end();
    process.exitCode = 1;
  }
}

testConnection();
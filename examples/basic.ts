import { TrackedPool } from "postgres-tracked-pool";

/**
 * Basic usage example for postgres-tracked-pool
 */

async function basicExample() {
  const pool = new TrackedPool({
    connectionString: process.env.DATABASE_URL || "postgresql://localhost/test"
  });

  try {
    // Simple query - tracking comment will be added automatically
    const result = await pool.query("SELECT NOW() as current_time");
    console.log("Current time:", result.rows[0].current_time);
    
    // Parameterized query
    const users = await pool.query(
      "SELECT * FROM users WHERE age > $1",
      [18]
    );
    console.log(`Found ${users.rowCount} users`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

async function transactionExample() {
  const pool = new TrackedPool({
    host: "localhost",
    port: 5432,
    database: "mydb",
    max: 20
  });

  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    const result = await client.query(
      "INSERT INTO logs (message) VALUES ($1) RETURNING id",
      ["Transaction started"]
    );
    
    console.log("Inserted log:", result.rows[0].id);
    
    await client.query("COMMIT");
    console.log("Transaction committed");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Example of what the SQL looks like when sent to PostgreSQL:
// /*func_name=basicExample,file=examples/basic.ts,line=14*/ SELECT NOW() as current_time
// /*func_name=basicExample,file=examples/basic.ts,line=18*/ SELECT * FROM users WHERE age > $1
// /*func_name=transactionExample,file=examples/basic.ts,line=40*/ BEGIN

if (require.main === module) {
  console.log("Running postgres-tracked-pool examples...\n");
  
  basicExample()
    .then(() => console.log("✓ Basic example completed"))
    .catch(err => console.error("✗ Basic example failed:", err));
}

export { basicExample, transactionExample };

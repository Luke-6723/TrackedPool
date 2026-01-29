import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TrackedPool } from '../TrackedPool';
import pg from 'pg';

/**
 * Integration tests for TrackedPool with real PostgreSQL database
 * 
 * These tests require:
 * 1. A running PostgreSQL instance
 * 2. pg_stat_statements extension enabled
 * 
 * To run these tests:
 * 1. Start a PostgreSQL instance (e.g., via Docker):
 *    docker run -d --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:latest
 * 
 * 2. Enable pg_stat_statements:
 *    docker exec -it postgres-test psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
 * 
 * 3. Set environment variables:
 *    export PG_TEST_HOST=localhost
 *    export PG_TEST_PORT=5432
 *    export PG_TEST_DATABASE=postgres
 *    export PG_TEST_USER=postgres
 *    export PG_TEST_PASSWORD=test
 * 
 * 4. Run the integration tests:
 *    npm run test:integration
 */

const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!shouldRunIntegrationTests)('TrackedPool Integration Tests', () => {
  let pool: TrackedPool;
  let adminPool: pg.Pool;

  beforeAll(async () => {
    // Create admin pool for setup
    adminPool = new pg.Pool({
      host: process.env.PG_TEST_HOST || 'localhost',
      port: parseInt(process.env.PG_TEST_PORT || '5432'),
      database: process.env.PG_TEST_DATABASE || 'postgres',
      user: process.env.PG_TEST_USER || 'postgres',
      password: process.env.PG_TEST_PASSWORD || 'test',
    });

    // Enable pg_stat_statements if not already enabled
    try {
      await adminPool.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
    } catch (err) {
      console.warn('Failed to create pg_stat_statements extension:', err);
    }

    // Reset pg_stat_statements
    await adminPool.query('SELECT pg_stat_statements_reset()');

    // Create tracked pool
    pool = new TrackedPool({
      host: process.env.PG_TEST_HOST || 'localhost',
      port: parseInt(process.env.PG_TEST_PORT || '5432'),
      database: process.env.PG_TEST_DATABASE || 'postgres',
      user: process.env.PG_TEST_USER || 'postgres',
      password: process.env.PG_TEST_PASSWORD || 'test',
    });

    // Create a test table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  });

  afterAll(async () => {
    // Clean up test table
    await pool.query('DROP TABLE IF EXISTS test_users');
    
    await pool.end();
    await adminPool.end();
  });

  it('should include tracking comments in pg_stat_statements', async () => {
    // Execute a query with tracking
    async function testQueryFunction() {
      await pool.query('SELECT COUNT(*) FROM test_users');
    }

    await testQueryFunction();

    // Give pg_stat_statements time to record the query
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check pg_stat_statements for our query with tracking comment
    const result = await adminPool.query(`
      SELECT query
      FROM pg_stat_statements
      WHERE query LIKE '%test_users%/*func_name=%'
        AND query NOT LIKE '%pg_stat_statements%'
    `);

    expect(result.rows.length).toBeGreaterThan(0);
    
    const query = result.rows[0].query;
    expect(query).toContain('SELECT COUNT(*) FROM test_users');
    expect(query).toContain("/*func_name='testQueryFunction'");
    expect(query).toContain(",file='.%2F");
    expect(query).toContain("'*/");
  });

  it('should include different tracking comments for different functions', async () => {
    // Reset pg_stat_statements
    await adminPool.query('SELECT pg_stat_statements_reset()');

    // Execute queries from different functions
    async function insertUser() {
      await pool.query("INSERT INTO test_users (name) VALUES ('John')");
    }

    async function selectUsers() {
      await pool.query('SELECT * FROM test_users');
    }

    await insertUser();
    await selectUsers();

    // Give pg_stat_statements time to record the queries
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check pg_stat_statements for both queries
    const result = await adminPool.query(`
      SELECT query
      FROM pg_stat_statements
      WHERE query LIKE '%test_users%/*func_name=%'
        AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY query
    `);

    expect(result.rows.length).toBeGreaterThanOrEqual(2);

    // Find the INSERT query
    const insertQuery = result.rows.find(row => row.query.includes('INSERT INTO test_users'));
    expect(insertQuery).toBeDefined();
    expect(insertQuery?.query).toContain('/*func_name=insertUser');

    // Find the SELECT query
    const selectQuery = result.rows.find(row => row.query.includes('SELECT * FROM test_users'));
    expect(selectQuery).toBeDefined();
    expect(selectQuery?.query).toContain('/*func_name=selectUsers');
  });

  it('should track queries from client connections', async () => {
    // Reset pg_stat_statements
    await adminPool.query('SELECT pg_stat_statements_reset()');

    const client = await pool.connect();
    
    try {
      async function clientQuery() {
        await client.query('SELECT 1 as client_test');
      }

      await clientQuery();
    } finally {
      client.release();
    }

    // Give pg_stat_statements time to record the query
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check pg_stat_statements
    const result = await adminPool.query(`
      SELECT query
      FROM pg_stat_statements
      WHERE query LIKE '%client_test%/*func_name=%'
        AND query NOT LIKE '%pg_stat_statements%'
    `);

    expect(result.rows.length).toBeGreaterThan(0);
    
    const query = result.rows[0].query;
    expect(query).toContain('SELECT 1 as client_test');
    expect(query).toContain('/*func_name=clientQuery');
  });
});

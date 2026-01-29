import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackedPool } from '../TrackedPool';
import pg from 'pg';

describe('TrackedPool', () => {
  let pool: TrackedPool;
  let capturedQueries: Array<{ text: string; values?: any[] }> = [];
  let originalQuery: any;

  beforeEach(() => {
    // Reset captured queries
    capturedQueries = [];

    // Create TrackedPool instance
    pool = new TrackedPool({
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test',
    });

    // Store the original query method
    originalQuery = pg.Pool.prototype.query;

    // Mock the parent class's query method to capture queries
    pg.Pool.prototype.query = vi.fn(function(this: any, ...args: any[]) {
      // Capture the query
      if (typeof args[0] === 'string') {
        capturedQueries.push({ text: args[0], values: args[1] });
      } else if (args[0]?.text) {
        capturedQueries.push({ text: args[0].text, values: args[0].values });
      }
      
      // Return a mock promise
      let callback: Function | undefined;
      
      // Find the callback if it exists
      for (let i = args.length - 1; i >= 0; i--) {
        if (typeof args[i] === 'function') {
          callback = args[i];
          break;
        }
      }
      
      const mockResult = { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
      
      if (callback) {
        // Callback-based
        setImmediate(() => callback!(null, mockResult));
        return;
      } else {
        // Promise-based
        return Promise.resolve(mockResult);
      }
    });
  });

  afterEach(async () => {
    // Restore the original query method
    pg.Pool.prototype.query = originalQuery;
    await pool.end();
  });

  describe('query method with string SQL', () => {
    it('should add tracking comment to simple SELECT query', async () => {
      const sql = 'SELECT * FROM users';
      
      await pool.query(sql);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      // Verify the tracking comment is included
      expect(executedQuery).toContain("/*func_name='");
      expect(executedQuery).toContain(",file='.%2F");
      expect(executedQuery).toContain("'*/");
      
      // Verify original query is preserved
      expect(executedQuery).toContain('SELECT * FROM users');
    });

    it('should include function name in tracking comment', async () => {
      async function testFunction() {
        await pool.query('SELECT 1');
      }
      
      await testFunction();
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toMatch(/\/\*func_name='testFunction',/);
    });

    it('should include file path in tracking comment', async () => {
      await pool.query('SELECT * FROM products');
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      // Should contain file reference (TrackedPool.spec.ts or similar), URL-encoded with quotes
      expect(executedQuery).toMatch(/,file='\.%2F[^']+'\*\//);
      expect(executedQuery).toContain('TrackedPool.spec');
    });

    it('should include line and column in file path', async () => {
      await pool.query('SELECT * FROM orders');

      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;

      // File path should include line:column URL-encoded with quotes (e.g., '.%2Ffile.ts%3A42%3A10')
      expect(executedQuery).toMatch(/file='\.%2F[^%]+%3A\d+%3A\d+'/);
    });

    it('should work with parameterized queries', async () => {
      await pool.query('SELECT * FROM users WHERE id = $1', [123]);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toContain('/*func_name=');
      expect(executedQuery).toContain('SELECT * FROM users WHERE id = $1');
      expect(capturedQueries[0].values).toEqual([123]);
    });

    it('should not duplicate tracking comments', async () => {
      const sql = "SELECT * FROM users /*func_name='test',file='.%2Ftest.ts%3A1%3A0'*/";
      
      await pool.query(sql);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      // Should not add another comment
      const commentCount = (executedQuery.match(/\/\*func_name=/g) || []).length;
      expect(commentCount).toBe(1);
    });
  });

  describe('query method with config object', () => {
    it('should add tracking comment to query config object', async () => {
      await pool.query({
        text: 'SELECT * FROM users WHERE email = $1',
        values: ['test@example.com']
      });
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toContain('/*func_name=');
      expect(executedQuery).toContain('SELECT * FROM users WHERE email = $1');
      expect(capturedQueries[0].values).toEqual(['test@example.com']);
    });

    it('should preserve query config properties', async () => {
      const config = {
        text: 'INSERT INTO users (name) VALUES ($1)',
        values: ['John Doe'],
        name: 'insert-user'
      };
      
      await pool.query(config);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toContain('/*func_name=');
      expect(executedQuery).toContain('INSERT INTO users (name) VALUES ($1)');
    });
  });

  describe('connect method and client queries', () => {
    it('should add tracking comment to client queries', async () => {
      // Mock the parent connect to return a mock client
      const mockClientQuery = vi.fn((...args: any[]) => {
        if (typeof args[0] === 'string') {
          capturedQueries.push({ text: args[0], values: args[1] });
        } else if (args[0]?.text) {
          capturedQueries.push({ text: args[0].text, values: args[0].values });
        }
        const callback = args[args.length - 1];
        const mockResult = { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };
        if (typeof callback === 'function') {
          setImmediate(() => callback(null, mockResult));
        } else {
          return Promise.resolve(mockResult);
        }
      });

      const mockClient = {
        query: mockClientQuery,
        release: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
        end: vi.fn(),
        connect: vi.fn(),
      } as any;

      pg.Pool.prototype.connect = vi.fn(() => Promise.resolve(mockClient));

      const client = await pool.connect();
      
      // Clear queries from connection
      capturedQueries = [];
      
      await client.query('SELECT * FROM users');
      client.release();
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toContain('/*func_name=');
      expect(executedQuery).toContain('SELECT * FROM users');
    });
  });

  describe('tracking comment format', () => {
    it('should append tracking comment at the end of query', async () => {
      await pool.query('SELECT * FROM users');
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      // Comment should be at the end
      expect(executedQuery).toMatch(/SELECT \* FROM users\s+\/\*func_name=.*\*\/$/);
    });

    it('should handle multi-line queries', async () => {
      const multiLineQuery = `
        SELECT 
          id,
          name,
          email
        FROM users
        WHERE status = 'active'
      `.trim();
      
      await pool.query(multiLineQuery);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toContain('/*func_name=');
      expect(executedQuery).toContain('FROM users');
      expect(executedQuery).toContain("WHERE status = 'active'");
    });

    it('should handle queries with existing comments', async () => {
      const queryWithComment = '/* This is a regular comment */ SELECT * FROM users';
      
      await pool.query(queryWithComment);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      // Should have both the original comment and tracking comment
      expect(executedQuery).toContain('/* This is a regular comment */');
      expect(executedQuery).toContain('/*func_name=');
    });
  });

  describe('edge cases', () => {
    it('should handle empty query gracefully', async () => {
      await pool.query('');
      
      expect(capturedQueries.length).toBe(1);
      // Should still add tracking even for empty query
      expect(capturedQueries[0].text).toContain('/*func_name=');
    });

    it('should handle queries with special characters', async () => {
      const query = "SELECT * FROM users WHERE name = 'O''Brien'";
      
      await pool.query(query);
      
      expect(capturedQueries.length).toBe(1);
      const executedQuery = capturedQueries[0].text;
      
      expect(executedQuery).toContain("'O''Brien'");
      expect(executedQuery).toContain('/*func_name=');
    });

    it('should track queries from different call sites', async () => {
      async function queryUsers() {
        return await pool.query('SELECT * FROM users');
      }

      async function queryProducts() {
        return await pool.query('SELECT * FROM products');
      }

      await queryUsers();
      await queryProducts();
      
      expect(capturedQueries.length).toBe(2);
      
      // First query should be from queryUsers function
      expect(capturedQueries[0].text).toContain("/*func_name='queryUsers',");
      expect(capturedQueries[0].text).toContain('SELECT * FROM users');

      // Second query should be from queryProducts function
      expect(capturedQueries[1].text).toContain("/*func_name='queryProducts',");
      expect(capturedQueries[1].text).toContain('SELECT * FROM products');
    });
  });

  describe('callback-based queries', () => {
    it('should add tracking comment to callback-based queries', async () => {
      return new Promise<void>((resolve) => {
        pool.query('SELECT * FROM users', (err, result) => {
          expect(capturedQueries.length).toBe(1);
          const executedQuery = capturedQueries[0].text;
          
          expect(executedQuery).toContain('/*func_name=');
          expect(executedQuery).toContain('SELECT * FROM users');
          resolve();
        });
      });
    });

    it('should add tracking comment to parameterized callback queries', async () => {
      return new Promise<void>((resolve) => {
        pool.query('SELECT * FROM users WHERE id = $1', [42], (err, result) => {
          expect(capturedQueries.length).toBe(1);
          const executedQuery = capturedQueries[0].text;
          
          expect(executedQuery).toContain('/*func_name=');
          expect(executedQuery).toContain('SELECT * FROM users WHERE id = $1');
          expect(capturedQueries[0].values).toEqual([42]);
          resolve();
        });
      });
    });
  });
});

# postgres-tracked-pool

A PostgreSQL connection pool wrapper that automatically adds tracking comments to SQL queries with function name, file path, and line number. Perfect for debugging, performance monitoring, and query attribution.

## Features

- 🔍 **Automatic Query Attribution** - Know exactly which function/method issued a query
- 🐛 **Easy Debugging** - Quickly locate the source of problematic queries
- 📊 **Performance Analysis** - Correlate slow queries with specific code paths
- 🔒 **Audit Logging** - Track query origins for security and compliance
- ⚡ **Zero Configuration** - Drop-in replacement for `pg.Pool`
- 🚀 **Minimal Overhead** - Negligible performance impact

## Installation

```bash
npm install postgres-tracked-pool pg
```

## Quick Start

```typescript
import { TrackedPool } from "postgres-tracked-pool";

const pool = new TrackedPool({
  connectionString: process.env.DATABASE_URL
});

// Use it exactly like pg.Pool
const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
```

## How It Works

When you execute a query:

```typescript
// Your code at line 42 in src/user/service.ts
async function getUserById(userId: string) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0];
}
```

PostgreSQL receives:

```sql
/*func_name=getUserById,file=./src/user/service.ts:43:10*/ SELECT * FROM users WHERE id = $1
```

## API

`TrackedPool` extends `pg.Pool` and is fully compatible with all PostgreSQL node driver features:

### Constructor

```typescript
const pool = new TrackedPool(config);
```

Accepts the same configuration as `pg.Pool`:
- `connectionString` - PostgreSQL connection string
- `host`, `port`, `database`, `user`, `password` - Connection parameters
- `max` - Maximum number of clients in the pool
- `idleTimeoutMillis` - How long a client can remain idle before being closed
- And all other [pg.Pool configuration options](https://node-postgres.com/apis/pool)

### Methods

All methods from `pg.Pool` are available:

```typescript
// Direct queries
await pool.query(sql, values);

// Get a client for transactions
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO ...");
  await client.query("COMMIT");
} finally {
  client.release();
}

// End the pool
await pool.end();
```

## Use Cases

### PostgreSQL Logs

Enable statement logging in PostgreSQL to see query origins:

```sql
-- postgresql.conf
log_statement = 'all'
```

Log output:
```
LOG:  statement: /*func_name=getRecentData,file=./src/analytics.ts:123:5*/ SELECT time, value FROM metrics WHERE id = $1
```

### pg_stat_statements

Track query performance by source function:

```sql
SELECT 
  substring(query from 'func_name=([^,]+)') as function_name,
  substring(query from 'file=([^,]+)') as file,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '/*func_name=%'
ORDER BY mean_exec_time DESC;
```

### Monitoring & Alerting

Set up alerts for slow queries from specific functions:

```sql
SELECT 
  substring(query from 'func_name=([^,]+)') as function_name,
  max(max_exec_time) as worst_case_ms
FROM pg_stat_statements
WHERE query LIKE '/*func_name=%'
GROUP BY function_name
HAVING max(max_exec_time) > 1000;  -- Alert if > 1 second
```

### Custom Analytics

Parse logs with tools like pgBadger, PgHero, or custom scripts to:
- Identify hot paths in your application
- Track database usage patterns by module/feature
- Generate reports on query performance by code location

## Configuration

### Custom Path Extraction

By default, the tracker intelligently handles:
- **Workspace folders**: Shows as `src/user/service.ts`
- **node_modules**: Shows as `[package-name]` to avoid clutter
- **Unknown paths**: Shows just the filename

You can extend the `TrackedPool` class to customize path extraction:

```typescript
import { TrackedPool } from "postgres-tracked-pool";

class CustomTrackedPool extends TrackedPool {
  // Override methods as needed
}
```

## Performance Impact

- **Stack trace capture**: ~100μs per query (negligible)
- **Storage overhead**: Zero (SQL comments are stripped by PostgreSQL)
- **Query plan impact**: None (comments don't affect execution plans)
- **Result overhead**: Zero (query results unchanged)

## TypeScript Support

Full TypeScript support with complete type definitions included.

```typescript
import { TrackedPool } from "postgres-tracked-pool";
import { PoolConfig, QueryResult } from "pg";

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL
};

const pool = new TrackedPool(config);

const result: QueryResult = await pool.query("SELECT NOW()");
```

## Migration from pg.Pool

Simply replace `new Pool()` with `new TrackedPool()`:

**Before:**
```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

**After:**
```typescript
import { TrackedPool } from "postgres-tracked-pool";

const pool = new TrackedPool({
  connectionString: process.env.DATABASE_URL
});
```

All existing code continues to work without modifications!

## Examples

### Basic Query

```typescript
import { TrackedPool } from "postgres-tracked-pool";

const pool = new TrackedPool({
  connectionString: "postgresql://localhost/mydb"
});

async function getUser(id: number) {
  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0];
}
```

### Transaction

```typescript
async function transferFunds(fromId: number, toId: number, amount: number) {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
      [amount, fromId]
    );
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
      [amount, toId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

### Connection Pool Management

```typescript
const pool = new TrackedPool({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "myuser",
  password: "mypass",
  max: 20, // maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
```

## Troubleshooting

### Anonymous Functions

Queries from anonymous functions are labeled as:
```sql
/*func_name=anonymous,file=./src/index.ts:123:0*/ SELECT ...
```

### Unknown File Paths

If stack traces can't be captured (rare):
```sql
/*func_name=unknown,file=./unknown:0:0*/ SELECT ...
```

### Disabling Tracking

For testing or specific scenarios, use standard `pg.Pool`:

```typescript
import { Pool } from "pg";

const pool = process.env.NODE_ENV === "test" 
  ? new Pool({ connectionString })
  : new TrackedPool({ connectionString });
```

## Requirements

- Node.js >= 14.0.0
- PostgreSQL client library (`pg`) >= 8.0.0

## Testing

This package includes comprehensive test suites to ensure tracking comments work correctly:

### Unit Tests

The unit tests verify that tracking comments are properly added to all query types:
```bash
npm test
```

### Integration Tests

Integration tests verify that tracking comments appear in `pg_stat_statements` with a real PostgreSQL instance:

```bash
# Start PostgreSQL with pg_stat_statements enabled
docker run -d --name postgres-test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:latest

# Enable the extension
docker exec -it postgres-test psql -U postgres \
  -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Run integration tests
npm run test:integration
```

For detailed testing documentation, see [TESTING.md](./TESTING.md).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [node-postgres](https://github.com/brianc/node-postgres) - PostgreSQL client for Node.js
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - PostgreSQL query performance tracking

## Support

- 📖 [Documentation](https://github.com/top-stats/postgres-tracked-pool#readme)
- 🐛 [Issue Tracker](https://github.com/top-stats/postgres-tracked-pool/issues)
- 💬 [Discussions](https://github.com/top-stats/postgres-tracked-pool/discussions)

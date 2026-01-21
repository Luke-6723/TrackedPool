# Testing

This project includes comprehensive tests to verify that tracking comments are properly added to SQL queries.

## Test Suites

### Unit Tests (`TrackedPool.spec.ts`)

The unit tests use mocking to verify that:
- Tracking comments are added to all query types (string queries, config objects, callbacks)
- Comments include function name, file path, and line number
- Comments are not duplicated
- Both pool-level and client-level queries are tracked
- Edge cases are handled properly

**Run unit tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

### Integration Tests (`TrackedPool.integration.spec.ts`)

The integration tests connect to a real PostgreSQL database and verify that:
- Tracking comments appear in `pg_stat_statements`
- Different functions have different tracking comments
- Both pool and client queries are tracked in `pg_stat_statements`

**Prerequisites for integration tests:**

1. Start a PostgreSQL instance:
   ```bash
   docker run -d --name postgres-test \
     -e POSTGRES_PASSWORD=test \
     -p 5432:5432 \
     postgres:latest
   ```

2. Enable `pg_stat_statements` extension:
   ```bash
   docker exec -it postgres-test psql -U postgres \
     -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
   ```

3. Set environment variables (optional if using defaults):
   ```bash
   export PG_TEST_HOST=localhost
   export PG_TEST_PORT=5432
   export PG_TEST_DATABASE=postgres
   export PG_TEST_USER=postgres
   export PG_TEST_PASSWORD=test
   ```

4. Run integration tests:
   ```bash
   npm run test:integration
   ```

**Clean up:**
```bash
docker stop postgres-test
docker rm postgres-test
```

## Test Structure

```
src/
  ├── TrackedPool.spec.ts              # Unit tests with mocking
  └── TrackedPool.integration.spec.ts  # Integration tests with real PostgreSQL
```

## What Gets Tested

### Query Tracking
- ✅ Simple SELECT queries
- ✅ Parameterized queries with values
- ✅ Query config objects
- ✅ Multi-line queries
- ✅ Queries with existing comments
- ✅ Empty queries
- ✅ Queries with special characters

### Function Tracking
- ✅ Named functions
- ✅ Anonymous functions
- ✅ Different call sites
- ✅ Nested function calls

### Client Tracking
- ✅ Pool-level queries
- ✅ Client-level queries via `connect()`

### Comment Format
- ✅ Includes function name
- ✅ Includes file path
- ✅ Includes line number
- ✅ Appended at end of query
- ✅ Not duplicated if already present

### PostgreSQL Integration
- ✅ Comments visible in `pg_stat_statements`
- ✅ Different functions have unique tracking
- ✅ Both pool and client queries are tracked

import pg from "pg";

/**
 * A wrapper around pg.Pool that automatically adds tracking comments to SQL queries
 * Comments include: function name, file path, and line number
 * Example format in SQL: slash-star func_name=functionName,file=filePath,line=lineNumber star-slash
 */
export class TrackedPool extends pg.Pool {
  /**
   * Adds tracking comment to SQL query
   * @param sql The SQL query string
   * @param callSite Stack trace entry containing caller information
   * @returns SQL query with tracking comment prepended
   */
  private addTrackingComment(sql: string, callSite?: NodeJS.CallSite): string {
    if (!callSite) {
      return sql;
    }

    // Check if SQL already has a tracking comment (to prevent duplicates)
    if (sql.trim().endsWith("*/") && sql.includes("/*func_name=")) {
      return sql;
    }

    const functionName = callSite.getFunctionName() || callSite.getMethodName() || "anonymous";
    const fileName = callSite.getFileName() || "unknown";
    const lineNumber = callSite.getLineNumber() || 0;

    // Extract relative path from file name (remove workspace path prefix and node_modules)
    let relativePath = fileName;
    
    // First, try to match workspace folders
    const workspaceMatch = fileName.match(/\/(sdk|bot|api|web|interactions|moderation|servers)\/(.+)$/);
    if (workspaceMatch) {
      relativePath = `${workspaceMatch[1]}/${workspaceMatch[2]}`;
    } else if (fileName.includes("node_modules")) {
      // If it's from node_modules, just show the package name
      const nodeModulesMatch = fileName.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
      if (nodeModulesMatch) {
        relativePath = `[${nodeModulesMatch[1]}]`;
      } else {
        relativePath = "[node_modules]";
      }
    } else {
      // Fallback: just use the filename without full path
      relativePath = fileName.split("/").pop() || fileName;
    }

    const comment = `/*func_name=${functionName},file=${relativePath},line=${lineNumber}*/`;

    return sql.trim() + " " + comment;
  }

  /**
   * Gets the caller's stack frame (skipping internal wrapper calls)
   * @returns The stack frame of the actual caller
   */
  private getCallerSite(): NodeJS.CallSite | undefined {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    
    try {
      Error.prepareStackTrace = (_, stack) => stack;
      const stack = new Error().stack as unknown as NodeJS.CallSite[];
      
      // Find the first stack frame that's not from this file or pg-pool internals
      const callerFrame = stack.find(frame => {
        const fileName = frame.getFileName();
        if (!fileName) return false;
        
        // Skip our wrapper files
        if (fileName.includes("TrackedPool.ts") || fileName.includes("TrackedPool.js")) {
          return false;
        }
        
        // Skip pg-pool internal files
        if (fileName.includes("pg-pool") || fileName.includes("node_modules/pg/")) {
          return false;
        }
        
        return true;
      });
      
      return callerFrame;
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
  }

  /**
   * Overrides the query method to add tracking comments
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(queryTextOrConfig: any, values?: any, callback?: any): any {
    const callSite = this.getCallerSite();

    // Handle different query signatures
    if (typeof queryTextOrConfig === "string") {
      // Simple query: query(text, values?, callback?)
      const trackedQuery = this.addTrackingComment(queryTextOrConfig, callSite);
      return super.query(trackedQuery, values, callback);
    } else if (queryTextOrConfig && typeof queryTextOrConfig === "object") {
      // Query config object: query({ text, values, ... })
      const trackedConfig = {
        ...queryTextOrConfig,
        text: this.addTrackingComment(queryTextOrConfig.text, callSite)
      };
      return super.query(trackedConfig, values, callback);
    }

    // Fallback to original behavior
    return super.query(queryTextOrConfig, values, callback);
  }

  /**
   * Overrides the connect method to return a tracked client
   */
  connect(): Promise<pg.PoolClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect(callback: (err: Error | undefined, client: pg.PoolClient | undefined, done: (release?: any) => void) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect(callback?: (err: Error | undefined, client: pg.PoolClient | undefined, done: (release?: any) => void) => void): Promise<pg.PoolClient> | void {
    if (callback) {
      // Callback-based signature
      return super.connect((err, client, done) => {
        if (err || !client) {
          return callback(err, client, done);
        }
        const trackedClient = this.wrapClient(client);
        callback(undefined, trackedClient, done);
      });
    } else {
      // Promise-based signature
      return super.connect().then(client => {
        return this.wrapClient(client);
      });
    }
  }

  /**
   * Wraps a PoolClient with tracking functionality
   */
  private wrapClient(client: pg.PoolClient): pg.PoolClient {
    const originalQuery = client.query.bind(client);
    const addTrackingComment = this.addTrackingComment.bind(this);
    const getCallerSite = this.getCallerSite.bind(this);

    // Override the query method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).query = function(queryTextOrConfig: any, values?: any, callback?: any): any {
      const callSite = getCallerSite();

      // Handle different query signatures
      if (typeof queryTextOrConfig === "string") {
        const trackedQuery = addTrackingComment(queryTextOrConfig, callSite);
        return originalQuery(trackedQuery, values, callback);
      } else if (queryTextOrConfig && typeof queryTextOrConfig === "object") {
        const trackedConfig = {
          ...queryTextOrConfig,
          text: addTrackingComment(queryTextOrConfig.text, callSite)
        };
        return originalQuery(trackedConfig, values, callback);
      }

      return originalQuery(queryTextOrConfig, values, callback);
    };

    return client;
  }
}

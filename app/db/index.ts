import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const customLogger = {
  logQuery: (query: string, params: any[]) => {
    console.log("Executing query:", query);
    console.log("With params:", params);
  },
};

const client = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { logger: customLogger });

export const logDbError = (operation: string, error: any) => {
  console.error(`Database error during ${operation}:`, error);
};

// Use this wrapper for database operations
export const safeDbOperation = async <T>(
  operation: string,
  dbCall: () => Promise<T>
): Promise<T> => {
  try {
    return await dbCall();
  } catch (error) {
    logDbError(operation, error);
    throw error;
  }
};

import { Pool } from "pg";

const globalForPg = globalThis;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diatur. Isi file .env.local sebelum menjalankan aplikasi.");
  }

  if (!globalForPg.leaveManagementPool) {
    globalForPg.leaveManagementPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return globalForPg.leaveManagementPool;
}

export const db = {
  query(text, values) {
    return getPool().query(text, values);
  },
  async transaction(callback) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
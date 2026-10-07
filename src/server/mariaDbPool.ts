import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

let mariaDbPool: Pool | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

export function getMariaDbPool(): Pool {
  if (mariaDbPool) {
    return mariaDbPool;
  }

  const portValue = Number(process.env.MARIADB_PORT ?? "3306");
  const connectionLimitValue = Number(process.env.MARIADB_CONNECTION_LIMIT ?? "10");

  if (!Number.isInteger(portValue) || portValue <= 0) {
    throw new Error("MARIADB_PORT must be a positive integer");
  }

  if (!Number.isInteger(connectionLimitValue) || connectionLimitValue <= 0) {
    throw new Error("MARIADB_CONNECTION_LIMIT must be a positive integer");
  }

  mariaDbPool = mysql.createPool({
    host: getRequiredEnv("MARIADB_HOST"),
    port: portValue,
    user: getRequiredEnv("MARIADB_USER"),
    password: getRequiredEnv("MARIADB_PASSWORD"),
    database: getRequiredEnv("MARIADB_DATABASE"),
    connectionLimit: connectionLimitValue,
    waitForConnections: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
  });

  return mariaDbPool;
}

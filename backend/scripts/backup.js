import { exec } from "node:child_process";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = `./backups/backup-${timestamp}`;
const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/itcommerce";

exec(`mongodump --uri="${uri}" --out="${output}"`, (error, stdout, stderr) => {
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error en backup:", error.message);
    process.exit(1);
  }
  if (stderr) {
    // eslint-disable-next-line no-console
    console.warn(stderr);
  }
  // eslint-disable-next-line no-console
  console.log("Backup creado en", output);
});

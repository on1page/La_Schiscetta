// postbuild.mjs - Copia static e public dentro .next/standalone
// (sostituisce i comandi Unix "cp -r" per essere compatibile Windows)
import { cpSync } from "fs";

try {
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  cpSync("public", ".next/standalone/public", { recursive: true });
  console.log("postbuild: static e public copiati in .next/standalone");
} catch (err) {
  console.error("postbuild fallito:", err.message);
  process.exit(1);
}

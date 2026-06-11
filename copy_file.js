import fs from "fs";
import path from "path";

try {
  fs.copyFileSync("keys_db.json", "api/keys_db.json");
  console.log("Successfully copied keys_db.json to api/keys_db.json");
} catch (err) {
  console.error("Failed to copy keys_db.json:", err);
}

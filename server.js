import { config } from "dotenv-safe";
config();
import app from "./app.js";
import { agenda } from "./agenda.js";

(async () => {
  console.log("system", `Starting the server apps...`);
  const server = app.listen(process.env.NODE_PORT, () => {
    console.log("system", "App is running at " + process.env.NODE_PORT);
    console.log("system", `Starting the Agenda...`);
    agenda.init();
  });
})();

import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import os from "os";
//aqui poderia importar o types se estiver usando typeScript para mappers

dotenv.config();
process.env.TZ = "America/Sao_Paulo";
const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN }));

//Minhas rotas igual eu faço com o horse
//app.get('/stock', stockController.doSyncStock);

app.get("/health", (req, res) =>
  res.send(
    `OK [${new Date()}] - App listening on port ${process.env.NODE_PORT}`
  )
);

export default app;

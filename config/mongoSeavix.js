//-------------------------------------------------------------
//Conexao com mongo_db Seavix — base dedicada, independente do
//config/db.js (env próprias: MONGO_SEAVIX_CONNECTION /
//MONGO_SEAVIX_DATABASE).
//Lê as env no momento do connect (igual ao db.js) para não
//depender da ordem de carregamento do dotenv.
//Singleton: a promise da conexão é cacheada. O driver mantém
//pool, heartbeat e reconexão automática.
//-------------------------------------------------------------
import { createMongo } from "./mongoFactory.js";

let seavixInstance = null;

function seavix() {
  if (!seavixInstance) {
    seavixInstance = createMongo(
      process.env.MONGO_SEAVIX_CONNECTION,
      process.env.MONGO_SEAVIX_DATABASE
    );
  }
  return seavixInstance;
}

export const TMongoSeavix = {
  connect: () => seavix().connect(),
  disconnect: () => seavix().disconnect(),
};

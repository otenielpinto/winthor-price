//-------------------------------------------------------------
//Conexao com mongo_db
//-------------------------------------------------------------
import { MongoClient } from "mongodb";
let client = null;

async function mongoConnect() {
  if (!client) client = new MongoClient(process.env.RAILWAY_MONGO_URL);
  await client.connect();
  return client.db(process.env.RAILWAY_MONGO_DATABASE);
}

async function mongoDisconnect() {
  if (!client) return true;
  try {
    await client.close();
    client = null;
  } catch (error) {
    client = null;
    return true;
  }
  return true;
}

//-------------------------------------------------------------
//Fim conexao com mongo_db
//-------------------------------------------------------------
export const TMongoRailway = {
  mongoConnect,
  mongoDisconnect,
};

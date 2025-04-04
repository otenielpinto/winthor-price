//-------------------------------------------------------------
//Conexao com mongo_db
//-------------------------------------------------------------
import { MongoClient } from "mongodb";
let client = null;
var dateStarted = null;

async function mongoConnect() {
  if (!client) client = new MongoClient(process.env.MONGO_CONNECTION);
  await client.connect();
  return client.db(process.env.MONGO_DATABASE);
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

//sim as configurações ficam dentro do mongo_db ? Porque ? Porque são varias lojas plugadas ao aplicativo .
async function getConfigById(id_tenant) {
  const api = await mongoConnect();
  const tenant = await api.collection("tenant").findOne({ id: id_tenant });

  if (!tenant || tenant == null || tenant === undefined) {
    console.log(`A consulta não retornou dados: ${id_tenant}`);
  }
  return tenant;
}

async function validateTimeConnection() {
  let date = new Date();
  if (dateStarted == null) {
    dateStarted = date.getDate();
    return true;
  } else {
    if (date.getDate() != dateStarted) {
      console.log("Efetuando desconexão mongoDB");
      dateStarted = null;
      //await mongoDisconnect()
      return true;
    }
  }
}
//-------------------------------------------------------------
//Fim conexao com mongo_db
//-------------------------------------------------------------

export const TMongo = {
  mongoConnect,
  mongoDisconnect,
  validateTimeConnection,
  getConfigById,
};

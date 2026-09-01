//-------------------------------------------------------------
//Conexao com mongo_db
//Singleton: a promise da conexão é cacheada. O driver mantém pool,
//heartbeat e reconexão automática — não há necessidade de reciclar
//conexão manualmente por data.
//-------------------------------------------------------------
import { MongoClient } from "mongodb";

let dbPromise = null;

function mongoConnect() {
  if (!dbPromise) {
    dbPromise = new MongoClient(process.env.MONGO_CONNECTION)
      .connect()
      .then((client) => client.db(process.env.MONGO_DATABASE))
      .catch((err) => {
        dbPromise = null; // falha na 1ª conexão não envenena o singleton
        throw err;
      });
  }
  return dbPromise;
}

async function mongoDisconnect() {
  if (!dbPromise) return true;
  const promise = dbPromise;
  dbPromise = null;
  try {
    const db = await promise;
    await db.client.close();
  } catch (error) {
    // conexão já morta — nada a fazer
  }
  return true;
}

//sim as configurações ficam dentro do mongo_db ? Porque ? Porque são varias lojas plugadas ao aplicativo .
async function getConfigById(id_tenant) {
  const api = await mongoConnect();
  const tenant = await api.collection("tenant").findOne({ id: id_tenant });

  if (!tenant) {
    console.log(`A consulta não retornou dados: ${id_tenant}`);
  }
  return tenant;
}

export const TMongo = {
  mongoConnect,
  mongoDisconnect,
  connect: mongoConnect, // alias — _modeloRepository chama TMongo.connect()
  getConfigById,
};

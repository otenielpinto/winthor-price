//-------------------------------------------------------------
//Factory de conexões MongoDB — mesmo padrão do config/db.js
//(singleton de promise: o driver mantém pool, heartbeat e
//reconexão automática; não há necessidade de reciclar conexão).
//Cada createMongo() devolve uma instância independente, com
//pool próprio.
//O db.js mantém sua cópia própria até ser migrado para cá.
//-------------------------------------------------------------
import { MongoClient } from "mongodb";

export function createMongo(connectionUri, database) {
  let dbPromise = null;

  function connect() {
    if (!dbPromise) {
      dbPromise = new MongoClient(connectionUri)
        .connect()
        .then((client) => client.db(database))
        .catch((err) => {
          dbPromise = null; // falha na 1ª conexão não envenena o singleton
          throw err;
        });
    }
    return dbPromise;
  }

  async function disconnect() {
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

  return { connect, disconnect };
}

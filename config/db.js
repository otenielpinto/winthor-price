//-------------------------------------------------------------
//Conexao com mongo_db
//-------------------------------------------------------------
const MongoClient = require("mongodb").MongoClient;
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
async function getConfigById(idTenant) {
  const api = await mongoConnect();
  const tenant = await api.collection("tenant").findOne({ id: idTenant });

  if (!tenant || tenant == null || tenant === undefined) {
    console.log(`A consulta não retornou dados: ${idTenant}`);
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

// https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#windowsinstallation
//https://blog.biri.me/category/nodejs/

//-------------------------------------------------------------
//Conexao com oracle_db
//-------------------------------------------------------------
let pathLibServer = null;
const oracledb = require("oracledb");
if ((process.env.ORACLE_LIB_DIR = 1)) {
  pathLibServer = "C:\\oracle\\instantclient_21_7";
}

try {
  oracledb.initOracleClient({ libDir: pathLibServer });
} catch (err) {
  console.error("Whoops!");
  console.error(err);
  process.exit(1);
}

async function oracleByTenantId(idTenant) {
  let config = await getConfigById(idTenant);
  if (!config) console.log(`A consulta não retornou dados: ${idTenant}`);

  const knex = require("knex")({
    client: "oracledb",
    connection: {
      host: `${config.oracle_host}`,
      user: `${config.oracle_user}`,
      password: `${config.oracle_password}`,
      requestTimeout: 10000,
      connectString: `${config.oracle_connectString}`,
    },
    fetchAsString: ["number", "clob"],
  });

  if (knex == undefined) {
    console.log(
      `TenantId[${idTenant}] A consulta retornou erros ao conectar Server Oracle ${new Date()}`
    );
  }
  return knex;
}

module.exports = {
  oracledb,
  oracleByTenantId,
  mongoConnect,
  mongoDisconnect,
  validateTimeConnection,
  getConfigById,
};

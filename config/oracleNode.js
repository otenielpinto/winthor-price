// https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#windowsinstallation
//https://blog.biri.me/category/nodejs/

//-------------------------------------------------------------
//Conexao com oracle_db
//-------------------------------------------------------------
let pathLibServer = null;
import oracledb from "oracledb";
import knexPkg from "knex";
import { TMongo } from "./db.js";

// Function that needs to be implemented
async function getConfigById(id_tenant) {
  return await TMongo.getConfigById(id_tenant);
}

if (process.env.ORACLE_LIB_WIN32 == 1) {
  pathLibServer = "C:\\oracle\\instantclient_21_7";
}

if (process.env.ORACLE_LIB_LINUX == 1) {
  pathLibServer = process.env.ORACLE_CLIENT_PATH;
}

try {
  oracledb.initOracleClient({ libDir: pathLibServer });
} catch (err) {
  console.error("Whoops!");
  console.error(err);
  process.exit(1);
}

// 1 knex (e 1 pool de conexões) por tenant, reutilizado entre chamadas;
// recriar por chamada acumulava pools órfãos com conexões Oracle abertas
const knexCache = new Map();

async function oracleByTenantId(id_tenant) {
  if (knexCache.has(id_tenant)) {
    return knexCache.get(id_tenant);
  }

  let config = await getConfigById(id_tenant);
  if (!config) console.log(`A consulta não retornou dados: ${id_tenant}`);

  const knex = knexPkg({
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
      `TenantId[${id_tenant}] A consulta retornou erros ao conectar Server Oracle ${new Date()}`
    );
  }
  knexCache.set(id_tenant, knex);
  return knex;
}

export const TOracle = {
  oracledb,
  oracleByTenantId,
  getConfigById,
};

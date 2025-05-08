import knexPkg from "knex";

export function sql3Client() {
  const knex = require("knex")({
    client: "sqlite3", // or 'better-sqlite3'
    connection: {
      filename: "./dados_erp.sqlite",
    },
  });

  if (knex == undefined) {
    console.log(
      `TenantId[${id_tenant}] A consulta retornou erros ao conectar SQLLit ${new Date()}`
    );
  }
  return knex;
}

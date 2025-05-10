import knexPkg from "knex";

export function sql3Client() {
  const knex = knexPkg({
    client: "sqlite3",
    connection: {
      filename: "./dados_erp.db",
    },
  });

  if (knex == undefined) {
    console.log(
      `TenantId[${id_tenant}] A consulta retornou erros ao conectar SQLLit ${new Date()}`
    );
  }
  return knex;
}

/**
 * Migration script to create the produto_preco_new table in SQLite
 * This structure matches the MongoDB collection structure
 */
import { sql3Client } from "../config/sql3Client.js";
import { fileURLToPath } from "url";

/**
 * Creates the produto_preco_new table
 */
export async function up() {
  const knex = sql3Client();

  // Check if table already exists
  const tableExists = await knex.schema.hasTable("  node migrations/create_produto_preco_old_table.js_new");

  if (!tableExists) {
    console.log("Creating produto_preco_new table...");

    await knex.schema.createTable("produto_preco_new", (table) => {
      // Primary key - composite
      table.string("codprod").notNullable();
      table.integer("idtenant").notNullable();
      table.string("codfilial").notNullable();

      // Price fields - using decimal to store numeric values
      table.string("numregiao");
      table.decimal("pvenda", 15, 6);
      table.decimal("ptabela", 15, 6);
      table.decimal("ultcustotabpreco", 15, 6);
      table.decimal("vlultentmes", 15, 6);
      table.decimal("custocont", 15, 6);

      // Inventory field
      table.integer("qtest");

      // Date fields
      table.datetime("dtultaltpvenda");
      table.datetime("dtultent");

      // Other fields
      table.integer("rnum");
      table.integer("status").defaultTo(0);
      table.datetime("updatedat").defaultTo(knex.fn.now());

      // Set primary key
      table.primary(["codprod", "idtenant", "codfilial"]);
    });

    console.log("produto_preco_new table created successfully");
  } else {
    console.log("produto_preco_new table already exists");
  }
}

/**
 * Drops the produto_preco_new table
 */
export async function down() {
  const knex = sql3Client();
  return knex.schema.dropTableIfExists("produto_preco_new");
}

// Run the migration if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const knex = sql3Client();

  up()
    .then(() => {
      console.log("Migration completed successfully");
      knex.destroy();
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      knex.destroy();
      process.exit(1);
    });
}

// Repository class for produto_preco_old table using SQLite
import { lib } from "../utils/lib.js";
import { sql3Client } from "../config/sql3Client.js";

class ProductPrecoOldRepository {
  constructor() {
    this.db = null;
    this.tableName = "produto_preco_old";
  }

  async config() {
    try {
      this.db = sql3Client();
      if (!this.db) {
        throw new Error("Database connection is not established");
      }
    } catch (error) {
      console.error("Error configuring SQLite connection:", error);
      throw error;
    }
  }

  async create(payload) {
    try {
      // Returns [id] in MySQL, SQLite, Oracle; different behavior in PostgreSQL
      const result = await this.db(this.tableName).insert(payload);
      return result; // Returns array with IDs of inserted rows
    } catch (error) {
      console.error("Error creating record:", error);
      throw error;
    }
  }

  async update(id, payload) {
    try {
      const result = await this.db(this.tableName)
        .where({ id: id })
        .update(payload);
      return result > 0;
    } catch (error) {
      console.error("Error updating record:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.db(this.tableName).where({ id: id }).del();
      return result > 0;
    } catch (error) {
      console.error("Error deleting record:", error);
      throw error;
    }
  }

  async findAll(criterio = {}) {
    try {
      return await this.db(this.tableName).where(criterio).select("*");
    } catch (error) {
      console.error("Error finding records:", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return await this.db(this.tableName).where({ id: id }).first();
    } catch (error) {
      console.error("Error finding record by id:", error);
      throw error;
    }
  }

  async insertMany(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    for (let item of items) {
      let payload = {
        codprod: item.codprod,
        idtenant: item.idtenant,
        codfilial: item.codfilial,
        custocont: item.custocont ? item.custocont : 0,
        dtultaltpvenda: item.dtultaltpvenda,
        numregiao: item.numregiao,
        pvenda: item.pvenda ? item.pvenda : 0,
        qtest: item.qtest ? item.qtest : 0,
        status: item.status ? item.status : 0,
        updatedat: item.updatedat ? item.updatedat : null,
        vlultentmes: item.vlultentmes ? item.vlultentmes : 0,
        ptabela: item.ptabela ? item.ptabela : 0,
        dtultent: item.dtultent ? item.dtultent : null,
        rnum: item.rnum ? item.rnum : 0,
        ultcustotabpreco: item.ultcustotabpreco ? item.ultcustotabpreco : 0,
      };

      try {
        await this.db(this.tableName).insert(payload);
      } catch (error) {
        console.error("Error inserting item:", error);
      }
    }

    // try {
    //   // For bulk inserts, specify returning columns if needed
    //   // Example: return await this.db(this.tableName).insert(items, ['id', 'codprod']);
    //   return await this.db(this.tableName).insert(items);
    // } catch (error) {
    //   console.error("Error inserting multiple records:", error);
    //   throw error;
    // }
  }

  async deleteMany(criterio = {}) {
    try {
      return await this.db(this.tableName).where(criterio).del();
    } catch (error) {
      console.error("Error deleting multiple records:", error);
      throw error;
    }
  }

  // Add transaction support
  async beginTransaction() {
    return await this.db.transaction();
  }

  // Close the database connection when done
  async close() {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
  }
}

export { ProductPrecoOldRepository };

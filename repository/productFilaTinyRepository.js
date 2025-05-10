//Classe tem letras maiuculoas
import { lib } from "../utils/lib.js";
import { TMongo } from "../config/db.js";
const collection = "tmp_product_price_fila_tiny";

class ProductPriceFilaTinyRepository {
  constructor() {
    this.db = null;
  }

  async config(payload = {}) {
    let db;
    if (!payload?.db) {
      db = await TMongo.mongoConnect();
    } else {
      db = payload.db;
    }
    if (!db) {
      throw new Error("Database connection is not established");
    }
    this.db = db;
  }

  async create(payload) {
    const result = await this.db.collection(collection).insertOne(payload);
    return result.insertedId;
  }

  async update(id, payload) {
    const result = await this.db
      .collection(collection)
      .updateOne({ id: id }, { $set: payload }, { upsert: true });
    return result.modifiedCount > 0;
  }

  async delete(id) {
    const result = await this.db.collection(collection).deleteOne({ id: id });
    return result.deletedCount > 0;
  }

  async findAll(criterio = {}) {
    return await this.db.collection(collection).find(criterio).toArray();
  }

  async findById(id) {
    return await this.db.collection(collection).findOne({ id: id });
  }

  async insertMany(items) {
    if (!Array.isArray(items) || items.length == 0) return null;
    try {
      return await this.db.collection(collection).insertMany(items);
    } catch (e) {
      console.log(e);
    }
  }

  async insertIntoQueue(items) {
    if (!Array.isArray(items) || items.length == 0) return null;

    try {
      // Processar cada item para alterar o status para 1 e remover coluna reason
      const preparedItems = items.map((item) => {
        // Criar uma cópia do objeto para não modificar o original
        const newItem = { ...item };

        // Alterar o status para 1
        newItem.status = 1;

        // Remover a coluna reason se existir
        if ("reason" in newItem) {
          delete newItem.reason;
        }

        return newItem;
      });

      // Inserir os itens processados na coleção
      return await this.db.collection(collection).insertMany(preparedItems);
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async deleteMany(criterio = {}) {
    try {
      return await this.db.collection(collection).deleteMany(criterio);
    } catch (e) {
      console.log(e);
    }
  }
}

export { ProductPriceFilaTinyRepository };

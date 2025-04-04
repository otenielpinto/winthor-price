//Classe tem letras maiuculoas
import { lib } from "../utils/lib.js";
import { TMongoRailway } from "../config/railwayMongo.js";
const collection = "tmp_product_price_fila";

class ProductPriceFilaRepository {
  constructor() {
    this.db = null;
  }

  async config(payload = {}) {
    let db;
    if (!payload?.db) {
      db = await TMongoRailway.mongoConnect();
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
    if (!Array.isArray(items) | (items.length == 0)) return null;
    try {
      return await this.db.collection(collection).insertMany(items);
    } catch (e) {
      console.log(e);
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

export { ProductPriceFilaRepository };

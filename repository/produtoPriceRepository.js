//Classe tem letras maiuculoas
import { TMongo } from "../config/db.js";
const collection = "product_price";

class ProdutoPriceRepository {
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

  async findAll(criterio = {}, options = {}) {
    const { page = 1, limit = 5000 } = options;
    const skip = (page - 1) * limit;

    // Obter o total de documentos para informações de paginação
    const total = await this.db.collection(collection).countDocuments(criterio);

    // Buscar os documentos com paginação
    const data = await this.db
      .collection(collection)
      .find(criterio)
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id) {
    return await this.db.collection(collection).findOne({ id: id });
  }

  async insertMany(items) {
    if (!Array.isArray(items)) return null;
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

export { ProdutoPriceRepository };

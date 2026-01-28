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
    await this.config();
    const result = await this.db.collection(collection).insertOne(payload);
    return result.insertedId;
  }

  async update(id, payload) {
    await this.config();
    const result = await this.db
      .collection(collection)
      .updateOne({ id: id }, { $set: payload }, { upsert: true });
    return result.modifiedCount > 0;
  }

  async delete(id) {
    await this.config();
    const result = await this.db.collection(collection).deleteOne({ id: id });
    return result.deletedCount > 0;
  }

  async findAll(criterio = {}, options = {}) {
    await this.config();
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
    await this.config();
    return await this.db.collection(collection).findOne({ id: id });
  }

  async insertMany(items) {
    if (!Array.isArray(items)) return null;
    await this.config();
    try {
      return await this.db.collection(collection).insertMany(items);
    } catch (e) {
      console.log(e);
    }
  }

  async updateMany(items) {
    if (!Array.isArray(items)) return null;
    await this.config();
    try {
      const bulkOps = [];
      const errors = [];

      // Prepara todas as operações em lote
      for (const item of items) {
        const { codprod, idtenant, codfilial } = item;
        if (!codprod || !idtenant || !codfilial) {
          errors.push({
            item,
            error:
              "Missing required criteria fields (codprod, idtenant, or codfilial)",
          });
          continue;
        }

        const criteria = { codprod, idtenant, codfilial };
        bulkOps.push({
          updateOne: {
            filter: criteria,
            update: { $set: item },
            upsert: true,
          },
        });
      }

      // Se não houver operações válidas, retorna apenas os erros
      if (bulkOps.length === 0) {
        return {
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
          errors,
        };
      }

      // Executa todas as operações em uma única chamada - PERFORMANCE MONSTRUOSA!
      const result = await this.db.collection(collection).bulkWrite(bulkOps, {
        ordered: false, // Continua mesmo se houver erros em alguns documentos
      });

      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        errors,
      };
    } catch (e) {
      console.log(e);
      return { error: e.message };
    }
  }

  async deleteMany(criterio = {}) {
    await this.config();
    try {
      return await this.db.collection(collection).deleteMany(criterio);
    } catch (e) {
      console.log(e);
    }
  }
}

export { ProdutoPriceRepository };

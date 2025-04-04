import { MongoClient } from "mongodb";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import os from "os";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Get current file path for Worker (ES modules don't have __filename)
const __filename = fileURLToPath(import.meta.url);

// Configurações
const BATCH_SIZE = 2000; // Tamanho do lote para paginação
const MAX_WORKERS = os.cpus().length - 1 || 2; // Número de workers baseado em CPUs disponíveis

// Configurações de conexão (deveriam vir de variáveis de ambiente)
const db1Config = {
  url: process.env.RAILWAY_MONGO_URL,
  dbName: process.env.RAILWAY_MONGO_DATABASE,
  collectionName: "tmp_product_price_fila",
};

const db2Config = {
  url: process.env.MONGO_CONNECTION,
  dbName: process.env.MONGO_DATABASE,
  collectionName: "product_price",
};

// Campos a serem comparados (todos os campos do documento)
const FIELDS_TO_COMPARE = [
  "codprod",
  "idtenant",
  "numregiao",
  "pvenda",
  "ptabela",
  "vlultentmes",
  "ultcustotabpreco",
  "dtultaltpvenda",
  "qtest",
  "custocont",
];

// Função principal
async function synchronizeCollections() {
  console.log("Iniciando sincronização de collections...");
  const timeLabel = `Tempo total de execução_${Date.now()}`;
  console.time(timeLabel);

  const client1 = new MongoClient(db1Config.url);
  const client2 = new MongoClient(db2Config.url);

  try {
    await client1.connect();
    await client2.connect();

    const db1 = client1.db(db1Config.dbName);
    const db2 = client2.db(db2Config.dbName);

    const collection1 = db1.collection(db1Config.collectionName);
    const collection2 = db2.collection(db2Config.collectionName);

    // 1. Obter contagem de documentos para progresso
    const totalDocuments = await collection1.countDocuments();
    const totalBatches = Math.ceil(totalDocuments / BATCH_SIZE);
    console.log(
      `Processando ${totalDocuments} documentos em ${totalBatches} lotes...`
    );

    // 2. Processar sincronização em paralelo com paginação
    const syncResults = await processSyncInBatches(
      collection1,
      collection2,
      totalBatches
    );

    // 3. Resumo da sincronização
    console.log("\nResumo da sincronização:");
    console.log(`- Documentos processados: ${totalDocuments}`);
    console.log(`- Documentos criados no DB2: ${syncResults.created}`);
    console.log(`- Documentos atualizados no DB2: ${syncResults.updated}`);
    console.log(`- Documentos idênticos: ${syncResults.unchanged}`);
    console.timeEnd(timeLabel);

    // 4. Gerar relatório detalhado
    const collectionPrice = db1.collection("tmp_report_price");
    await collectionPrice.insertOne(syncResults.details);
    console.log("Relatório detalhado salvo em tmp_report_price");
  } finally {
    await client1.close();
    await client2.close();
  }
}

// Processar sincronização em lotes com workers paralelos
async function processSyncInBatches(collection1, collection2, totalBatches) {
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    details: [],
  };

  const workers = [];
  let currentBatch = 0;

  // Processar lotes em paralelo
  while (currentBatch < totalBatches) {
    const batchesToProcess = Math.min(MAX_WORKERS, totalBatches - currentBatch);
    const batchPromises = [];

    for (let i = 0; i < batchesToProcess; i++) {
      const batchNumber = currentBatch + i;
      batchPromises.push(
        processSyncBatch(collection1, collection2, batchNumber)
      );
    }

    const batchResults = await Promise.all(batchPromises);

    // Consolidar resultados
    batchResults.forEach((result) => {
      results.created += result.created;
      results.updated += result.updated;
      results.unchanged += result.unchanged;
      results.details.push(...result.details);
    });

    currentBatch += batchesToProcess;
    console.log(`Processados ${currentBatch} de ${totalBatches} lotes...`);
  }

  return results;
}

// Processar um lote específico de sincronização
async function processSyncBatch(collection1, collection2, batchNumber) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: {
        batchNumber,
        batchSize: BATCH_SIZE,
        db1Config,
        db2Config,
        fieldsToCompare: FIELDS_TO_COMPARE,
      },
    });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

// Código do Worker para sincronização
if (!isMainThread) {
  (async () => {
    try {
      const { batchNumber, batchSize, db1Config, db2Config, fieldsToCompare } =
        workerData;

      const client1 = new MongoClient(db1Config.url);
      const client2 = new MongoClient(db2Config.url);

      await client1.connect();
      await client2.connect();

      const db1 = client1.db(db1Config.dbName);
      const db2 = client2.db(db2Config.dbName);

      const collection1 = db1.collection(db1Config.collectionName);
      const collection2 = db2.collection(db2Config.collectionName);

      const cursor = collection1
        .find()
        .skip(batchNumber * batchSize)
        .limit(batchSize);

      const batchResults = {
        created: 0,
        updated: 0,
        unchanged: 0,
        details: [],
      };

      while (await cursor.hasNext()) {
        const doc1 = await cursor.next();
        const filter = {
          codprod: doc1.codprod,
          idtenant: doc1.idtenant,
          codfilial: doc1.codfilial,
        };

        const doc2 = await collection2.findOne(filter);
        const doc1Copy = { ...doc1 };
        delete doc1Copy._id; // Remover o _id para evitar conflitos

        if (!doc2) {
          // Documento não existe no DB2 - criar

          await collection2.insertOne(doc1Copy);
          batchResults.created++;
          batchResults.details.push({
            action: "CREATED",
            key: `${doc1.codprod}-${doc1.idtenant}-${doc1.codfilial}`,
            document: doc1Copy,
          });
        } else {
          // Verificar se há diferenças
          let needsUpdate = false;
          const differences = {};

          for (const field of fieldsToCompare) {
            const val1 = doc1[field];
            const val2 = doc2[field];

            // Comparação especial para números
            if (typeof val1 === "number" && typeof val2 === "number") {
              if (Math.abs(val1 - val2) > 0.0001) {
                differences[field] = { oldValue: val2, newValue: val1 };
                needsUpdate = true;
              }
            }
            // Comparação de datas
            else if (val1 instanceof Date && val2 instanceof Date) {
              if (val1.getTime() !== val2.getTime()) {
                differences[field] = {
                  oldValue: val2.toISOString(),
                  newValue: val1.toISOString(),
                };
                needsUpdate = true;
              }
            }
            // Comparação padrão
            else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
              differences[field] = { oldValue: val2, newValue: val1 };
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            // Atualizar documento no DB2

            await collection2.updateOne(filter, { $set: doc1Copy });
            batchResults.updated++;
            batchResults.details.push({
              action: "UPDATED",
              key: `${doc1.codprod}-${doc1.idtenant}-${doc1.codfilial}`,
              differences: differences,
              document: doc1Copy,
            });
          } else {
            batchResults.unchanged++;
          }
        }
      }

      await client1.close();
      await client2.close();

      parentPort.postMessage(batchResults);
    } catch (error) {
      parentPort.postMessage({
        error: error.message,
        created: 0,
        updated: 0,
        unchanged: 0,
        details: [],
      });
    }
  })();
}

// Executar apenas se for o main thread
if (isMainThread) {
  synchronizeCollections().catch((error) => {
    console.error("Erro durante a sincronização:", error);
    process.exit(1);
  });
}

export const scriptCompararPrecos = { synchronizeCollections };

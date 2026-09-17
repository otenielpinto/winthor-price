//-------------------------------------------------------------
//Atualizacao de precos Seavix:
//origem: MongoDB Seavix (collection product_detail, id_tenant=2)
//destino: MongoDB local (collection product_price)
//Paginacao de 1000 registros, projection apenas dos campos usados no mapper.
//-------------------------------------------------------------
import { TMongoSeavix } from "../config/mongoSeavix.js";
import { ProdutoPriceRepository } from "./produtoPriceRepository.js";

const SOURCE_COLLECTION = "product_detail";
const PAGE_SIZE = 1000;

//mapeamento fixo origem Seavix -> destino product_price
//origem id_tenant=2 corresponde ao idtenant=11003 na base de destino
const SOURCE_TENANT = 2;
const DEST_TENANT = 11003;
const CODFILIAL = "3";
const NUMREGIAO = "209";

//envia todos os codigos, sem filtrar situacao
const CRITERIA = { id_tenant: SOURCE_TENANT };

//projection: somente os campos que o mapper consome (performance)
const PROJECTION = {
  _id: 0,
  codigo: 1,
  preco: 1,
  preco_custo: 1,
  preco_custo_medio: 1,
  origem: 1,
  updated_at: 1,
};

function mapToProductPrice(p) {
  return {
    codprod: String(p.codigo ?? ""),
    codfilial: CODFILIAL,
    idtenant: DEST_TENANT,
    custocont: Number(p.preco_custo ?? 0),
    //updated_at (BSON Date) do Seavix = ultima alteracao no registro de origem
    dtultaltpvenda: p.updated_at ?? null,
    dtultent: null,
    numregiao: NUMREGIAO,
    ptabela: Number(p.preco ?? 0),
    pvenda: Number(p.preco ?? 0),
    qtest: 0,
    status: 0,
    ultcustotabpreco: Number(p.preco_custo ?? 0),
    vlultentmes: Number(p.preco_custo ?? 0),
    custo: Number(p.preco_custo_medio ?? 0),
    origmerctrib: String(p.origem ?? "0"),
  };
}

async function atualizarPrecosSeavix() {
  const db = await TMongoSeavix.connect();
  const col = db.collection(SOURCE_COLLECTION);

  const total = await col.countDocuments(CRITERIA);
  if (!total) {
    console.log("Seavix: nenhum registro encontrado para o criterio");
    return { total: 0 };
  }
  const pages = Math.ceil(total / PAGE_SIZE);
  console.log(
    `Seavix: ${total} registros em ${pages} paginas de ${PAGE_SIZE} as ${new Date().toLocaleString()}`,
  );

  const repPrice = new ProdutoPriceRepository();
  const stats = {
    matchedCount: 0,
    modifiedCount: 0,
    upsertedCount: 0,
    errors: 0,
  };

  for (let page = 1; page <= pages; page++) {
    const rows = await col
      .find(CRITERIA, { projection: PROJECTION })
      .sort({ _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray();

    console.log(
      `Seavix: pagina ${page}/${pages} - ${rows.length} registros as ${new Date().toLocaleString()}`,
    );

    const mapped = rows.map(mapToProductPrice).filter((r) => r.codprod);
    if (!mapped.length) continue;

    try {
      //reusa o bulkWrite upsert (codprod+idtenant+codfilial) do repositorio local
      const res = await repPrice.updateMany(mapped);
      console.log(
        `Seavix: matched=${res.matchedCount} modified=${res.modifiedCount} upserted=${res.upsertedCount} invalidos=${res.errors?.length ?? 0}`,
      );
      stats.matchedCount += res.matchedCount ?? 0;
      stats.modifiedCount += res.modifiedCount ?? 0;
      stats.upsertedCount += res.upsertedCount ?? 0;
      stats.errors += res.errors?.length ?? 0;
    } catch (e) {
      console.log("Seavix: falha ao gravar pagina " + page + " - " + e.message);
    }
  }

  console.log("Seavix: fim do processamento " + JSON.stringify(stats));
  return stats;
}

export const seavixPriceRepository = { init: atualizarPrecosSeavix };

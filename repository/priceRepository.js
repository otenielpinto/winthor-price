import { TMongo } from "../config/db.js";
import { lib } from "../utils/lib.js";
import { TOracle } from "../config/oracleNode.js";
import { tenantRepository } from "./tenantRepository.js";
import { serviceRepository } from "./serviceRepository.js";
import { ProductPriceFilaTinyRepository } from "./productFilaTinyRepository.js";
import { ProductPrecoNewRepository } from "./productPrecoNewRepository.js";
import { ProductPrecoOldRepository } from "./productPrecoOldRepository.js";
import { ProdutoPriceRepository } from "./produtoPriceRepository.js";

var cache = [];

async function init() {
  await compararPricesByTenant();

  return;

  await recebePrecosOld();
  return;
  await recebePrecosNew();
}

/**
 * Compara registros entre as tabelas produto_price_new e produto_price_old
 * verificando diferenças nos campos: pvenda, qtest, custocont, vlultentmes
 *
 * @param {Object} options - Opções para filtrar a comparação
 * @param {Number} options.idtenant - ID do tenant para filtrar registros
 * @param {String} options.codfilial - Código da filial para filtrar registros
 * @returns {Object} - Retorna objeto com registros alterados e registros novos
 */
async function comparePriceChanges(options = {}) {
  try {
    // Instanciar os repositórios
    const newRepository = new ProductPrecoNewRepository();
    const oldRepository = new ProductPrecoOldRepository();

    await newRepository.config();
    await oldRepository.config();

    // Construir o filtro baseado nas opções recebidas
    const filter = {};
    if (options.idtenant) filter.idtenant = options.idtenant;
    if (options.codfilial) filter.codfilial = options.codfilial;

    // Buscar registros de ambas as tabelas
    const newRecords = await newRepository.findAll(filter);
    const oldRecords = await oldRepository.findAll(filter);

    // Mapear registros antigos por chave composta para facilitar a comparação
    const oldRecordsMap = new Map();
    oldRecords.forEach((record) => {
      const key = `${record.codprod}_${record.idtenant}_${record.codfilial}`;
      oldRecordsMap.set(key, record);
    });

    // Arrays para armazenar registros alterados e novos
    const changedRecords = [];
    const newOnlyRecords = []; // Registros que existem apenas em produto_price_new

    for (const newRecord of newRecords) {
      const key = `${newRecord.codprod}_${newRecord.idtenant}_${newRecord.codfilial}`;
      const oldRecord = oldRecordsMap.get(key);

      // Se não existe registro correspondente na tabela antiga, adicionar aos registros novos
      if (!oldRecord) {
        newOnlyRecords.push({
          ...newRecord,
          reason: "Novo registro encontrado apenas na tabela produto_price_new",
        });
        continue;
      }

      // Verificar diferenças nos campos especificados
      const differences = {};
      let hasDifferences = false;

      // Comparar pvenda (pode ser decimal, então usar uma pequena tolerância)
      if (
        Math.abs(Number(newRecord.pvenda) - Number(oldRecord.pvenda)) > 0.001
      ) {
        differences.pvenda = {
          old: Number(oldRecord.pvenda),
          new: Number(newRecord.pvenda),
        };
        hasDifferences = true;
      }

      // Comparar qtest (quantidade em estoque)
      if (Number(newRecord.qtest) !== Number(oldRecord.qtest)) {
        differences.qtest = {
          old: Number(oldRecord.qtest),
          new: Number(newRecord.qtest),
        };
        hasDifferences = true;
      }

      // Comparar custocont (custo contábil)
      if (
        Math.abs(Number(newRecord.custocont) - Number(oldRecord.custocont)) >
        0.001
      ) {
        differences.custocont = {
          old: Number(oldRecord.custocont),
          new: Number(newRecord.custocont),
        };
        hasDifferences = true;
      }

      // Comparar vlultentmes (valor última entrada mês)
      if (
        Math.abs(
          Number(newRecord.vlultentmes) - Number(oldRecord.vlultentmes)
        ) > 0.001
      ) {
        differences.vlultentmes = {
          old: Number(oldRecord.vlultentmes),
          new: Number(newRecord.vlultentmes),
        };
        hasDifferences = true;
      }

      // Se encontrou diferenças, adicionar ao array de resultados
      if (hasDifferences) {
        changedRecords.push({
          codprod: newRecord.codprod,
          idtenant: newRecord.idtenant,
          codfilial: newRecord.codfilial,
          differences,
        });
      }
    }

    // Fechar conexões dos repositórios
    await newRepository.close();
    await oldRepository.close();

    return {
      changedRecords, // Registros com diferenças nos campos especificados
      newOnlyRecords, // Registros encontrados apenas na tabela new
    };
  } catch (error) {
    console.error("Erro ao comparar preços:", error);
    return {
      changedRecords: [],
      newOnlyRecords: [],
    };
  }
}

async function getPageCount(id_tenant) {
  for (let c of cache) {
    if (c.idtenant == id_tenant) return c.record_count;
  }

  let tenant = await TMongo.getConfigById(id_tenant);
  let codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
  let codregiao = tenant.price_codregiao;

  if (codregiao == null) {
    console.log("Região de preço não definida");
    return 0;
  }

  //contagem de produtos tabela preço e região ...
  const query = await TOracle.oracleByTenantId(id_tenant);
  try {
    const res = await query.raw(`
      select count(*)  as qtd 
        from
      pctabpr t     
        left join pcest e on (e.codprod=t.codprod )
     where                 
        t.numregiao= ${codregiao} and 
        e.codfilial = ${codfilial}        
            `);
    if (res.length == 0) {
      res.push({ QTD: 0 });
    }
    const { QTD: qtd } = res[0];
    if (!qtd) qtd = 0;
    if (qtd > 0) cache.push({ idtenant: id_tenant, record_count: qtd });
    return qtd;
  } catch (error) {
    console.log("A rotina retornou erro " + error);
    return 0;
  }
}

async function recebePrecosNew() {
  let tenants = await tenantRepository.getAllTenantSystem();
  let updatedat = new Date();

  for (let item of tenants) {
    let id_tenant = Number(item?.id ? item?.id : 0);

    if (id_tenant != 1) {
      continue;
    }

    // if (item?.price_service_on == 0 || id_tenant == 0) {
    //   console.log("Empresa sem permissão para atualizar preço de custo");
    //   continue;
    // }

    // if (
    //   await serviceRepository.wasExecutedToday(
    //     id_tenant,
    //     "Coleta de Preços Winthor"
    //   )
    // ) {
    //   continue;
    // }

    let repository = new ProductPrecoNewRepository();
    await repository.config();
    // sim  vou excluir tudo porque é muito mais rapido fazer isso , doque comparar os registros
    await repository.deleteMany({ idtenant: id_tenant });

    let record_count = await getPageCount(id_tenant);
    let per_page = parseInt(Math.trunc(record_count * 0.1) + 1);
    let page_count = parseInt(10 + 1);
    if (per_page <= 1) per_page = 1000;

    for (let page = 1; page <= page_count; page++) {
      console.log(
        `TenantId[${id_tenant}] - Buscando dados Server Oracle ${page}/${page_count}  Tamanho da pagina: ${per_page} Total de Registros: ${record_count}  as ${new Date()}`
      );

      let response;
      let rows = [];
      try {
        response = await getPriceByTenantId(id_tenant, page, per_page);
        //se tiver uma maneira de fazer isso mais rapido , por favor me avise
        for (let r of response) {
          r.qtest = Number(r.qtest ? r.qtest : 0);
          r.rnum = Number(r.rnum ? r.rnum : 0);
          let row = { ...r, idtenant: id_tenant, status: 0, updatedat };
          rows.push(row);
        }
      } catch (error) {
        console.log("A rotina retornou erro " + error);
      }

      try {
        await repository.insertMany(rows);
      } catch (error) {
        console.log("A rotina retornou erro " + error);
      }
    }

    await repository.close();
    return true;
  }
}

async function recebePrecosOld() {
  let produtoPrice = new ProdutoPriceRepository();
  await produtoPrice.config();
  let repository = new ProductPrecoOldRepository();
  await repository.config();
  await repository.deleteMany({});
  let limit = 5000;

  let data = await produtoPrice.findAll({}, { page: 1, limit: limit });
  let pages = data.pagination.pages;

  for (let page = 1; page <= pages; page++) {
    console.log(`Buscando dados MongoDB ${page}/${pages}  as ${new Date()}`);
    data = await produtoPrice.findAll({}, { page: page, limit: limit });

    try {
      await repository.insertMany(data.data);
    } catch (error) {
      console.log("A rotina retornou erro " + error);
    }
    console.log("" + data.data.length + " registros inseridos");
    await lib.sleep(1000 * 10);
  }
  await repository.close();
}

//todo : Fazer uma classe para concentrar tudo qe for de DB Oracle
async function getPriceByTenantId(id_tenant, page, per_page) {
  let tenant = await TMongo.getConfigById(id_tenant);
  let codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
  let codregiao = tenant.price_codregiao;

  /*
  SQL
  let codprod = '39601';
  t.codprod= ${codprod} and
  */

  //pego os dados do estoque conforme o idTenant ...
  const query = await TOracle.oracleByTenantId(id_tenant);
  //e.valorultent  campo correto

  //https://savepoint.blog.br/2013/04/09/limit-e-offset-no-oracle/
  try {
    const res = await query.raw(`
    select *
     from 
     ( 
         select x.*, rownum rnum
         from
         (
          select
            t.codprod,t.numregiao,t.pvenda,t.ptabela,
            t.vlultentmes as ultcustotabpreco, 
            e.valorultent as vlultentmes ,            
            t.dtultaltpvenda,e.qtest,e.custocont, e.codfilial,e.dtultent 
          from
          pctabpr t 
          left join pcest e  on (e.codprod=t.codprod)
          where                 
            t.numregiao = ${codregiao} and 
            e.codfilial = ${codfilial}  
          ) x where rownum  < (${page}*${per_page})   
      )
      where 
        rnum >= ((${page}*${per_page}) - ${per_page})
       
          `);
    //console.log(res)
    //console.log( lib.objectToLowerCase (res) )
    return lib.objectToLowerCase(res);
  } catch (error) {
    console.log("A rotina retornou erro " + error);
    return null;
  }
}

async function compararPricesByTenant() {
  const tenants = await tenantRepository.getAllTenantSystem();

  for (let tenant of tenants) {
    const resultado = await priceRepository.comparePriceChanges({
      idtenant: tenant.id,
      codfilial: tenant.price_codfilial,
    });

    try {
      await updatePriceData(resultado?.changedRecords);
    } catch (error) {
      console.log("A rotina retornou erro " + error);
    }

    return;

    try {
      const repository = new ProductPriceFilaTinyRepository();
      await repository.config();
      await repository.insertIntoQueue(resultado?.newOnlyRecords);
    } catch (error) {
      console.log("A rotina retornou erro " + error);
    }
  }
}

async function updatePriceData(dataChanged) {
  if (!dataChanged || dataChanged.length == 0) {
    console.log("Nenhum registro encontrado para atualizar");
    return;
  }
  const repository = new ProductPrecoNewRepository();
  await repository.config();
  let items = [];

  for (let item of dataChanged) {
    let id_tenant = Number(item?.idtenant ? item?.idtenant : 0);
    let codprod = item.codprod;
    let codfilial = item.codfilial;

    let filter = {
      idtenant: id_tenant,
      codprod: codprod,
      codfilial: codfilial,
    };
    let rows = [];

    try {
      rows = await repository.findAll(filter);
      if (!rows || rows.length == 0) {
        console.log("Nenhum registro encontrado para atualizar");
        continue;
      }

      for (let row of rows) {
        // Convert timestamp fields to Date objects
        if (row?.dtultaltpvenda && typeof row.dtultaltpvenda === "number") {
          row.dtultaltpvenda = new Date(row.dtultaltpvenda);
        }
        if (row?.dtultent && typeof row.dtultent === "number") {
          row.dtultent = new Date(row.dtultent);
        }

        row.status = 1;
        row.updatedat = new Date();
        items.push(row);
      }
    } catch (error) {
      console.log("A rotina retornou erro " + error);
    }

    await lib.sleep(1000 * 10);
  }
  await repository.close();

  // Update the records in MongoDB
  // if (items.length > 0) {
  //   try {
  //     const updateRepo = new ProductPrecoNewRepository();
  //     await updateRepo.config();

  //     console.log(`Atualizando ${items.length} registros no MongoDB`);
  //     for (const item of items) {
  //       await updateRepo.update(
  //         {
  //           idtenant: item.idtenant,
  //           codprod: item.codprod,
  //           codfilial: item.codfilial,
  //         },
  //         item
  //       );
  //     }

  //     await updateRepo.close();
  //     console.log("Registros atualizados com sucesso");
  //   } catch (error) {
  //     console.log("Erro ao atualizar registros no MongoDB: " + error);
  //   }
  // }
}

export const priceRepository = {
  init,
  getPageCount,
  getPriceByTenantId,
  comparePriceChanges,
};

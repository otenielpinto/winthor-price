import { TMongo } from "../config/db.js";
import { lib } from "../utils/lib.js";
import { TOracle } from "../config/oracleNode.js";

import { tenantRepository } from "./tenantRepository.js";
import { ProductPriceFilaRepository } from "./productFilaRepository.js";
import { serviceRepository } from "./serviceRepository.js";
import { ProductPriceFilaTinyRepository } from "./productFilaTinyRepository.js";
import { scriptCompararPrecos } from "./scriptCompararPrecos.js";

var cache = [];
const processed = 1;
const pending = 0;

async function init() {
  await sendPricesToQueue();
  await scriptCompararPrecos.startSyncProcess();
  await sendPricesToQueueTiny();

  //a fila é processada pelo arquivo principal , porque lá ficaria mais rapido
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

async function sendPricesToQueue() {
  let tenants = await tenantRepository.getAllTenantSystem();
  let updatedat = new Date();

  for (let item of tenants) {
    let id_tenant = Number(item?.id ? item?.id : 0);

    if (item?.price_service_on == 0 || id_tenant == 0) {
      console.log("Empresa sem permissão para atualizar preço de custo");
      continue;
    }

    if (
      await serviceRepository.wasExecutedToday(
        id_tenant,
        "Coleta de Preços Winthor"
      )
    ) {
      continue;
    }

    let productPriceFilaRepository = new ProductPriceFilaRepository();
    await productPriceFilaRepository.config();
    // sim  vou excluir tudo porque é muito mais rapido fazer isso , doque comparar os registros
    await productPriceFilaRepository.deleteMany({ idtenant: id_tenant });

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
        await productPriceFilaRepository.insertMany(rows);
      } catch (error) {
        console.log("A rotina retornou erro " + error);
      }

      console.log("Subindo dados para o mongoDB");
    }

    console.log(
      `TenantId[${id_tenant}]  Fim do processamento Server Oracle ${new Date()} `
    );
    return true;
  }
}

async function getPriceByTenantId(id_tenant, page, per_page) {
  let tenant = await TMongo.getConfigById(id_tenant);
  let codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
  let codregiao = tenant.price_codregiao;

  //SQL
  //let codprod = '39601';
  //t.codprod= ${codprod} and

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

async function getAllPricePending(id_tenant) {
  let filter = { status: pending, idtenant: id_tenant };
  const client = await TMongo.mongoConnect();
  return await client.collection("product_price").find(filter).toArray();
}

async function sendPricesToQueueTiny() {
  let tenants = await tenantRepository.getAllTenantSystem();

  for (let tenant of tenants) {
    if (
      await serviceRepository.wasExecutedToday(tenant.id, "Fila de Preços Tiny")
    ) {
      console.log("Fila de preços já executou hoje");
      continue;
    }

    if (tenant?.price_service_on == 0) {
      console.log("Empresa sem permissão para atualizar preço de custo");
      continue;
    }
    let id_tenant = tenant.id;
    let rows = [];
    let prices = await getAllPricePending(id_tenant);
    let productPriceTinyFila = new ProductPriceFilaTinyRepository();
    await productPriceTinyFila.config();

    for (let price of prices) {
      let preco = Number(price?.pvenda ? price?.pvenda : 0);
      if (preco == null || preco == 0) {
        preco = price.ptabela ? price.ptabela : 0;
      }

      if (preco == null || preco == 0) {
        console.log(`[Price is null ${price?.codprod}  - R$ ${preco} ]`);
        continue;
      }
      rows.push(price);
    }
    await productPriceTinyFila.insertMany(rows);
  }
}

export const priceRepository = {
  init,
  getPageCount,
  sendPricesToQueue,
  getPriceByTenantId,
  getAllPricePending,
};

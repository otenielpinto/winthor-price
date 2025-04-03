const db = require("../config/db");
const lib = require("../utils/lib");
const tenantRepository = require("./tenantRepository");
const tinyRepository = require("./tinyRepository");
var cache = [];
const processed = 1;
const pending = 0;

async function getPageCount(id_tenant) {
  for (let c of cache) {
    if (c.idtenant == id_tenant) return c.record_count;
  }

  let tenant = await db.getConfigById(id_tenant);
  let codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
  let codregiao = tenant.price_codregiao;

  if (codregiao == null) {
    console.log("Região de preço não definida");
    return 0;
  }

  //contagem de produtos tabela preço e região ...
  const query = await db.oracleByTenantId(id_tenant);
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

async function SyncPricesAllTenants() {
  let tenants = await tenantRepository.getAllTenantSystem();

  for (let item of tenants) {
    let id_tenant = item.id;
    if (item.price_service_on == 0) {
      console.log("Empresa sem permissão para atualizar preço de custo");
      continue;
    }

    let record_count = await getPageCount(id_tenant);
    let per_page = parseInt(Math.trunc(record_count * 0.1) + 1);
    let page_count = parseInt(10 + 1);
    if (per_page <= 1) per_page = 1000;

    for (let page = 1; page <= page_count; page++) {
      console.log(
        `TenantId[${id_tenant}] - Buscando dados Server Oracle ${page}/${page_count}  Tamanho da pagina: ${per_page} Total de Registros: ${record_count}  as ${new Date()}`
      );
      const response = await getPriceByTenantId(id_tenant, page, per_page);
      if (response) await savePriceMongo(id_tenant, response);
    }
    console.log(
      `TenantId[${id_tenant}]  Fim do processamento Server Oracle ${new Date()} `
    );
    return true;
  }
}

async function getPriceByTenantId(id_tenant, page, per_page) {
  let tenant = await db.getConfigById(id_tenant);
  let codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
  let codregiao = tenant.price_codregiao;

  //SQL
  //let codprod = '39601';
  //t.codprod= ${codprod} and

  //pego os dados do estoque conforme o idTenant ...
  const query = await db.oracleByTenantId(id_tenant);
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

async function savePriceMongo(id_tenant, items) {
  if (!items) return false;
  const client = await db.mongoConnect();
  let updatedat = new Date();

  for (let item of items) {
    let codprod = item.codprod;
    if (!codprod) codprod = "0";
    let product = await client
      .collection("product_price")
      .findOne({ codprod: codprod, idtenant: id_tenant });
    let update = false;

    if (
      product == null ||
      product == undefined ||
      product.pvenda != item.pvenda ||
      product.ptabela != item.ptabela ||
      product.vlultentmes != item.vlultentmes ||
      product.custocont != item.custocont
    )
      update = true;

    //console.log('comparando PROD mongo ' + JSON.stringify( product));
    //console.log('comparando PROD sql ' + JSON.stringify(item));
    //console.log('compare product : ' + codprod);

    if (update == true) {
      client
        .collection("product_price")
        .updateOne(
          { codprod: { $eq: codprod }, idtenant: { $eq: id_tenant } },
          {
            $set: {
              codprod: codprod,
              idtenant: id_tenant,
              numregiao: item.numregiao,
              pvenda: item.pvenda,
              ptabela: item.ptabela,
              vlultentmes: item.vlultentmes,
              ultcustotabpreco: item.ultcustotabpreco,
              dtultaltpvenda: item.dtultaltpvenda,
              qtest: Number(item.qtest),
              custocont: item.custocont,
              codfilial: item.codfilial,
              status: pending,
              updatedat: updatedat,
              id_tiny: product?.id_tiny ? product?.id_tiny : null,
            },
          },
          { upsert: true }
        );
    }
  } //end for

  return true;
}

async function setStatusByIdTiny(id_tenant, id_tiny) {
  const client = await db.mongoConnect();
  await client
    .collection("product_price")
    .updateOne(
      { id_tiny: { $eq: id_tiny.toString() }, idtenant: { $eq: id_tenant } },
      { $set: { status: processed } },
      { upesert: true }
    );
  return;
}
async function getAllPricePending(id_tenant) {
  let filter = { status: pending, idtenant: id_tenant };
  const client = await db.mongoConnect();
  return await client.collection("product_price").find(filter).toArray();
}

async function getProductBySku(id_tenant, sku) {
  const client = await db.mongoConnect();
  const response = await client
    .collection("product")
    .findOne({ sku: sku.toString(), idtenant: id_tenant });
  return response;
}

async function setCodigoTiny(payload) {
  let codprod = payload.codprod;
  let id_tenant = payload.id_tenant;
  let id_tiny = String(payload.id_tiny);

  const client = await db.mongoConnect();
  await client
    .collection("product_price")
    .updateOne(
      { codprod: { $eq: codprod }, idtenant: { $eq: id_tenant } },
      { $set: { id_tiny } },
      { upesert: true }
    );
  return;
}

async function updatePricesTiny() {
  let tenants = await tenantRepository.getAllTenantSystem();

  for (let tenant of tenants) {
    if (tenant.price_service_on == 0) {
      console.log("Empresa sem permissão para atualizar preço de custo");
      continue;
    }

    let id_tenant = tenant.id;
    let listOfItems = [];
    let prices = await getAllPricePending(id_tenant);
    for (let price of prices) {
      console.log(`[Updating ${price.codprod}  - R$ ${price.pvenda} ]`);
      let id_tiny = price.id_tiny ? price.id_tiny : "";
      let preco = price.pvenda ? price.pvenda : 0;
      if (preco == null || preco == 0) {
        preco = price.ptabela ? price.ptabela : 0;
      }

      if (preco == null || preco == 0) {
        console.log(`[Price is null ${price.codprod}  - R$ ${preco} ]`);
        continue;
      }

      if (!id_tiny || id_tiny == null || id_tiny == undefined || id_tiny == 0) {
        let prod = await getProductBySku(id_tenant, price.codprod);
        if (!prod || prod == null || prod == undefined) continue;
        if (prod.id) {
          id_tiny = prod.id;
          const payload = {
            id_tenant: id_tenant,
            codprod: price.codprod,
            id_tiny: prod.id.toString(),
          };
          await setCodigoTiny(payload);
        }
      }
      if (!id_tiny || id_tiny == null || id_tiny == undefined) continue;
      if (listOfItems.length < 20) {
        listOfItems.push({ id: id_tiny, preco });
        continue;
      }

      try {
        await updateResultUpdatePrices(
          id_tenant,
          await tinyRepository.produtoAtualizarPrecos({
            id_tenant,
            items: listOfItems,
          })
        );
      } catch (error) {
        console.log("O processamento retornou erro :" + error.message);
      }

      listOfItems = [];
      await lib.sleep(1000 * 13);
    } // for (let price of prices )

    if (listOfItems.length > 0) {
      await updateResultUpdatePrices(
        id_tenant,
        await tinyRepository.produtoAtualizarPrecos({
          id_tenant,
          items: listOfItems,
        })
      );
      listOfItems = [];
    }
  }
}

async function updateResultUpdatePrices(id_tenant, res) {
  if (!res || res == null || res == undefined) return;
  let data = res.data;
  let status = 0;

  if (data.retorno.registros) {
    let items = data.retorno.registros;
    for (let item of items) {
      if (item.registro.status != "OK") continue;
      let id_tiny = item.registro.id;
      console.log("Price updated :" + id_tiny);
      //nao posso atualizar o status porque quem faz isso é a rotina do mercado turbo
      //await setStatusByIdTiny(id_tenant,id_tiny)
      status = 1;
    }
  }

  if (status == 0)
    console.log(`Resultado processamento :` + JSON.stringify(data));
}

module.exports = {
  SyncPricesAllTenants,
  getPriceByTenantId,
  getAllPricePending,
  getProductBySku,
  setStatusByIdTiny,
  setCodigoTiny,
  updatePricesTiny,
  updateResultUpdatePrices,

  savePriceMongo,
  getPageCount,
};

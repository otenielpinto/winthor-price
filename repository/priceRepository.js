import { TMongo } from "../config/db.js";
import { lib } from "../utils/lib.js";
import { TOracle } from "../config/oracleNode.js";
import { tenantRepository } from "./tenantRepository.js";
import { serviceRepository } from "./serviceRepository.js";
import { ProdutoPriceRepository } from "./produtoPriceRepository.js";

var cache = [];

async function init() {
  await atualizarPrecosEmMassa();
}

async function getPageCount(id_tenant, codfilial) {
  for (let c of cache) {
    if (c.idtenant == id_tenant) return c.record_count;
  }
  let tenant = await TMongo.getConfigById(id_tenant);
  let codregiao = tenant.price_codregiao;
  if (!codfilial) {
    codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
  }

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

async function atualizarPrecosEmMassaByTenant(id_tenant) {
  let filiais = await tenantRepository.getFiliais(id_tenant);
  let repPrice = new ProdutoPriceRepository();

  for (let filial of filiais) {
    let codfilial = filial.id;
    let nameService = "Atualizar Preços em Massa Filial:" + codfilial;

    // if (await serviceRepository.wasExecutedToday(id_tenant, nameService)) {
    //   console.log("Serviço já executado hoje para o filial: " + codfilial);
    //   continue;
    // }

    let prods = [];
    try {
      //[ { codprod: '6203', origmerctrib: '5' }]
      prods = await getOrigemProdutoByTenant({
        id_tenant,
        codfilial: codfilial,
      });
    } catch (error) {}

    if (!Array.isArray(prods)) {
      prods = [];
    }

    // Converter array para Map: codprod -> origmerctrib
    const prodsMap = new Map(prods.map((p) => [p.codprod, p.origmerctrib]));

    let record_count = await getPageCount(id_tenant, codfilial);
    let per_page = parseInt(Math.trunc(record_count * 0.1) + 1);
    let page_count = parseInt(10 + 1);
    if (per_page <= 1) per_page = 1000;

    for (let page = 1; page <= page_count; page++) {
      console.log(
        `TenantId[${id_tenant}] - Buscando dados Server Oracle ${page}/${page_count}  Tamanho da pagina: ${per_page} Total de Registros: ${record_count}  as ${new Date().toLocaleString()} Filial: ${codfilial}`,
      );

      let response;
      let rows = [];
      try {
        response = await getPriceByTenantId({
          id_tenant,
          page,
          per_page,
          codfilial,
        });
        //Formar os dados para atualizar
        for (let r of response) {
          r.qtest = Number(r.qtest ? r.qtest : 0);
          r.rnum = Number(r.rnum ? r.rnum : 0);
          r.pvenda = Number(r.pvenda ? r.pvenda : 0);
          r.ptabela = Number(r.ptabela ? r.ptabela : 0);
          r.ultcustotabpreco = Number(
            r.ultcustotabpreco ? r.ultcustotabpreco : 0,
          );
          r.vlultentmes = Number(r.vlultentmes ? r.vlultentmes : 0);
          r.custocont = Number(r.custocont ? r.custocont : 0);
          //este é o custo real (conforme  o estoque winthor)
          r.custo = Number(r.custo ? r.custo : 0);
          if (r?.rnum) delete r.rnum;
          r.origmerctrib = prodsMap.get(r.codprod) || "0";
          let row = { ...r, idtenant: id_tenant, status: 0 };
          rows.push(row);
        }
      } catch (error) {
        console.log("A rotina retornou erro " + error);
      }

      try {
        let response = await repPrice.updateMany(rows);
        console.log(response); // Exibe estatísticas da atualização
      } catch (error) {
        console.log("A rotina retornou erro " + error);
      }
    }
  }
}

async function atualizarPrecosEmMassa() {
  let tenants = await tenantRepository.getAllTenantSystem();

  for (let tenant of tenants) {
    let id_tenant = Number(tenant?.id ? tenant?.id : 0);
    if (tenant?.price_service_on == 0 || id_tenant == 0) {
      console.log("Empresa sem permissão para atualizar preço de custo");
      continue;
    }
    await atualizarPrecosEmMassaByTenant(id_tenant);
  }
  return true;
}

//todo : Fazer uma classe para concentrar tudo qe for de DB Oracle
async function getPriceByTenantId({ id_tenant, page, per_page, codfilial }) {
  let tenant = await TMongo.getConfigById(id_tenant);
  let codregiao = tenant.price_codregiao;

  if (!codfilial) {
    codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
    console.log("Usando codfilial do tenant:", codfilial);
  }

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
            t.codprod,
            t.numregiao,
            t.pvenda,
            t.ptabela,
            t.vlultentmes as ultcustotabpreco, 
            e.valorultent as vlultentmes ,            
            t.dtultaltpvenda,
            e.qtest,
            e.custocont,
            e.codfilial,
            e.valorultent as custo,
            e.dtultent 
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

async function getOrigemProdutoByTenant({ id_tenant, codfilial }) {
  let tenant = await TMongo.getConfigById(id_tenant);
  let codregiao = tenant.price_codregiao;

  if (!codfilial) {
    codfilial = tenant.price_codfilial ? tenant.price_codfilial : "1";
    console.log("Usando codfilial do tenant:", codfilial);
  }

  const query = await TOracle.oracleByTenantId(id_tenant);
  let codOrigem = "0"; // 0 - Indefinida, 1 - Nacional, 2 - Importado, 3 - Serviços, 4 - Outros

  try {
    const res = await query.raw(`
      SELECT DISTINCT 
        CODPROD,
        ORIGMERCTRIB
      from 
        pcprodfilial 
      WHERE 
        CODFILIAL  = ${codfilial} AND 
        ORIGMERCTRIB <> ${codOrigem}
          `);
    //console.log(res)
    return lib.objectToLowerCase(res);
  } catch (error) {
    console.log("A rotina retornou erro " + error);
    return null;
  }
}

export const priceRepository = {
  init,
  getPageCount,
  getPriceByTenantId,
  getOrigemProdutoByTenant,
};

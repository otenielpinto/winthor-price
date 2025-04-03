const db = require("../config/db");
const apiTiny = require("../api/tiny");
const lib = require("../utils/lib");
const tenantRepository = require("./tenantRepository");
const { log } = require("winston");

async function obterNumeroPaginaPedido(idTenant, params) {
  const res = await pedidosPesquisa(idTenant, 1, params);
  let {
    retorno: { numero_paginas: page_count },
  } = res.data;
  return page_count;
}

async function getPedidoParams() {
  let dataInicial = lib.formatDateBr(lib.addDays(new Date(), -14));
  let params = [{ key: "dataInicial", value: String(dataInicial) }];
  return params;
}

async function pedidosPesquisa(idTenant, page, params = []) {
  //necessito buscar o idTenant passado no parametro  para atualizar o token
  const token = await tenantRepository.getTokenByTenantId(idTenant);
  const data = [
    { key: "token", value: token },
    { key: "pagina", value: page },
    { key: "formato", value: "json" },
  ];
  for (const item of params) {
    data.push({ key: item.key, value: item.value });
  }

  const response = await apiTiny("pedidos.pesquisa.php", data, "POST");
  return response;
}

async function pedidoObter(idTenant, id) {
  const token = await tenantRepository.getTokenByTenantId(idTenant);
  const data = [
    { key: "token", value: token },
    { key: "id", value: id },
    { key: "formato", value: "json" },
  ];
  const response = await apiTiny("pedido.obter.php", data, "POST");
  return response;
}

async function obterNumeroPaginaProduto(idTenant) {
  const res = await produtoPesquisa(idTenant, 1);
  let {
    retorno: { numero_paginas: page_count },
  } = res.data;
  return page_count;
}

async function produtoPesquisa(idTenant, page) {
  const token = await tenantRepository.getTokenByTenantId(idTenant);

  const data = [
    { key: "token", value: token },
    { key: "pesquisa", value: "" },
    { key: "pagina", value: page },
    { key: "formato", value: "json" },
  ];
  const response = await apiTiny("produtos.pesquisa.php", data, "POST");
  return response;
}

async function produtoObter(idTenant, id) {
  const token = await tenantRepository.getTokenByTenantId(idTenant);
  const data = [
    { key: "token", value: token },
    { key: "id", value: id },
    { key: "formato", value: "json" },
  ];
  const response = await apiTiny("produto.obter.php", data, "POST");
  return response;
}

//idProduto = id Tiny do Produto
async function produtoAtualizarEstoque(idTenant, idProduto, quantity) {
  let date = new Date();
  let hora = date.getHours(); // 0-23
  let min = date.getMinutes(); // 0-59
  let seg = date.getSeconds(); // 0-59
  let minFmt = min;
  if (min < 10) minFmt = `0${min}`;

  let obs =
    `Estoque Movimentado : ${quantity} as ` +
    lib.formatDateBr(date) +
    ` ${hora}:${minFmt}:${seg} by T7Ti `;

  const estoque = {
    idProduto: idProduto,
    tipo: "B",
    observacoes: obs,
    quantidade: quantity,
  };

  const token = await tenantRepository.getTokenByTenantId(idTenant);
  const data = [
    { key: "token", value: token },
    { key: "estoque", value: { estoque } },
    { key: "formato", value: "json" },
  ];

  const response = await apiTiny("produto.atualizar.estoque.php", data, "POST");
  return response;
}
async function notaFiscalIncluir(payload) {
  let id_tenant = payload.id_tenant;
  let numeroPedidoTiny = payload.numeroPedidoTiny;
  let xml = payload.xml;

  const token = await tenantRepository.getTokenByTenantId(id_tenant);
  const data = [
    { key: "token", value: token },
    { key: "numeroPedidoTiny", value: numeroPedidoTiny },
    { key: "xml", value: "xml" },
    { key: "data_xml", value: xml },
    { key: "formato", value: "json" },
  ];

  const response = await apiTiny("incluir.nota.xml.php", data, "POST");
  return response;
}

async function obterListofItems(items) {
  let listOfItems = [];
  for (let item of items) {
    let id = item.id;
    let preco = item.preco;
    listOfItems.push({ id, preco });
  }
  return listOfItems;
}

async function produtoAtualizarPrecos(payload) {
  console.log("Enviando 20 produtos atualizar precos [api Tiny]");
  let id_tenant = payload.id_tenant;
  let items = payload.items;
  if (!items || items.length == 0) return;
  //verificar o limite de produtos a serem atualizados por requisição
  let listOfItems = await obterListofItems(items);
  let precos = { precos: listOfItems };
  const token = await tenantRepository.getTokenByTenantId(id_tenant);
  const data = [
    { key: "token", value: token },
    { key: "formato", value: "json" },
    { key: "data", value: precos },
  ];
  console.log(JSON.stringify(data));
  const response = await apiTiny("produto.atualizar.precos.php", data, "POST");
  return response;
}

async function produtoIncluir(payload) {
  let id_tenant = payload.idtenant;
  let produto = payload.produto;
  let lista = [];

  lista.push(produto);

  const token = await tenantRepository.getTokenByTenantId(id_tenant);
  const data = [
    { key: "token", value: token },
    { key: "produto", value: { produtos: lista } },
    { key: "formato", value: "json" },
  ];

  const response = await apiTiny("produto.incluir.php", data, "POST");
  return response;
}

module.exports = {
  obterNumeroPaginaPedido,
  pedidosPesquisa,
  pedidoObter,
  getPedidoParams,

  obterNumeroPaginaProduto,
  produtoPesquisa,
  produtoObter,
  produtoAtualizarEstoque,
  produtoIncluir,
  produtoAtualizarPrecos,

  notaFiscalIncluir,
};

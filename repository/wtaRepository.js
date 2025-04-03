const db = require("../config/db");
const lib = require("../utils/lib");
const winthorRepository = require("./winthorRepository");
const orderRepository = require("./orderRepository");
const stockRepository = require("./stockRepository");
const tinyRepository = require("./tinyRepository");
const productRepository = require("./productRepository");
const idTrackRepository = require("./idTrackRepository");
const { response } = require("express");

async function obterUltimoProdutoSyncronizado(id_tenant) {
  let idTracker = await idTrackRepository.getIdTracker(
    id_tenant,
    "product_wta"
  );
  let id_sequence = 0;

  if (idTracker == null || idTracker == undefined) {
    id_sequence = await winthorRepository.obterUltimoIdProduto(id_tenant);
  } else {
    id_sequence = idTracker.id_sequence;
  }
  return id_sequence;
}

async function checkExistsProductsTiny(id_tenant, idProduto) {
  let res = "continue";
  let isProdMongoDb = await productRepository.getProductBySku(
    id_tenant,
    idProduto
  );

  //nao achei vinculo entre sku x tiny
  if (isProdMongoDb == null || isProdMongoDb == undefined) {
    //obtendo retorno do winthorWta
    let isProdWinthor = await winthorRepository.consultarProduto(
      id_tenant,
      idProduto
    );
    if (!isProdWinthor || isProdWinthor == null || isProdWinthor == undefined) {
      return "stop";
    }

    if (isProdWinthor && isProdWinthor.data) {
      //produto tem no winthor,  providencie a inclusão no tiny
      // console.log(
      //   "O retorno da consulta é : " + JSON.stringify(isProdWinthor.data)
      // );
      let produto = isProdWinthor.data;
      if (produto.id) {
        if (produto.id == idProduto) return "incluir";
      } else if (isProdWinthor.status != 200) return "stop";
    } else return "stop";
  }
  return res;
}

async function obterPrecoProduto(id_tenant, branchId, sku, customerId) {
  let response = null;
  //o retorno é objeto json
  try {
    response = await winthorRepository.listaPrecoBySkuCustomerId(
      id_tenant,
      branchId,
      sku,
      customerId
    );
  } catch (error) {
    console.log("A consulta retornou erro ao ObterPrecoProduto");
    return 0;
  }

  if (!response.data || !response.data.items) {
    console.log("A consulta retornou erro ao ObterPrecoProduto");
    return 0;
  }

  let items = response.data.items;
  let price = 0.0;
  for (let item of items) {
    if (item.price > price) price = item.price;
  }
  console.log(`O preco do produto(${sku}) é : R$ ${price}`);
  return price;
}

async function parseProductWtaToTiny(payload) {
  let id_tenant = payload.id_tenant;
  let idProduto = payload.idProduto;

  //faz as buscar necessarias para obter dados basicos para cadastro no tiny ERP
  let response = await winthorRepository.consultarProduto(id_tenant, idProduto);
  if (!response && response.data) return null;
  let produto = response.data;
  let marcaWinthor = null;
  let params = { idtenant: id_tenant, brandId: produto.brandId };
  response = await winthorRepository.buscarMarcaById(params);
  if (response.data) marcaWinthor = response.data;
  if (!produto.isVisible) return null;
  let gtin_produto = produto.productSKUId ? produto.productSKUId : "";
  //por padrão esta buscando o preço padrao para o cliente 1 (Todo : Pode ser colocado na configuracao)
  let customerId = 1;
  let price = await obterPrecoProduto(id_tenant, 1, idProduto, customerId);
  // "productSKUId": "7899751938068-40835",
  gtin_produto = await lib.sliceString(gtin_produto, "-");
  if (price <= 0) price = 99999.99;

  // anexos: [
  //   {
  //     anexo: "http://minhalojavirtualtiny.com.br/images/45221.jpg",
  //   },
  //   {
  //     anexo: "http://minhalojavirtualtiny.com.br/images/45222.png",
  //   },
  // ],
  // imagens_externas: [
  //   {
  //     imagem_externa: {
  //       url: "http://outrositetiny.com.br/img_43.png",
  //     },
  //   },
  //   {
  //     imagem_externa: {
  //       url: "http://outrositetiny.com.br/img_44.png",
  //     },
  //   },
  // ],
  //    categoria: "", produto.NCM (observe que esta tudo em maisculo )
  let produtoTiny = {
    produto: {
      sequencia: "1",
      codigo: produto.id,
      nome: produto.title,
      unidade: "UN",
      preco: price,
      ncm: produto.NCM,
      preco_promocional: "0",
      origem: "0",
      situacao: "A",
      tipo: "P",
      gtin: gtin_produto,
      marca: marcaWinthor ? marcaWinthor.name : "",
      tipo_embalagem: "2",
      altura_embalagem: "0",
      comprimento_embalagem: "0",
      largura_embalagem: "0",
      diametro_embalagem: "00",
      garantia: "3 meses",
      cest: "",
      valor_max: "0",
      motivo_isencao: "",
      descricao_complementar: produto.technicalData,
      obs: `Cadastro gerado by T7Ti - ${produto.productionLineDescription}`,
    },
  };

  return produtoTiny;
}

async function addListProductToTiny(id_tenant, items) {
  let cont = 0;
  const max_items = 30;
  if (!items || items.length == 0) return false;
  for (let idProduto of items) {
    cont++;
    await lib.sleep(1000 * 7);
    if (!idProduto || cont > max_items) break;
    let params = { id_tenant: id_tenant, idProduto: idProduto };
    let produto = await parseProductWtaToTiny(params);

    //caso mudar o parseProductWtaToTiny
    let codigo = produto.produto.codigo;
    let nome = produto.produto.nome;

    // console.log(
    //   "O produto será enviado api Tiny ERP " + JSON.stringify(produto)
    // );

    let payload = { idtenant: id_tenant, produto: produto };
    let response = await tinyRepository.produtoIncluir(payload);

    // console.log(
    //   `O resultado da inclusão de produto no Tiny ERP : ` +
    //     JSON.stringify(response.data)
    // );
    try {
      if (response) {
        if (response.data) {
          let obj = response.data.retorno;
          let id = null;
          if (obj.registros)
            for (let x of obj.registros) {
              if (x.registro.status == "OK") id = x.registro.id;
            }

          //salvando referencia do produto para poder achar o estoque (igual estrutura que vem do Tiny ERP)
          if (id != null) {
            let items = [{ produto: { id, codigo, nome } }];
            await productRepository.saveProdutoMongo(id_tenant, items);
          }

          //Registra ultimo cadastro
          if (obj.status_processamento == 3) {
            if (idProduto > 0)
              await idTrackRepository.updateTracker(
                id_tenant,
                "product_wta",
                idProduto
              );

            //Força uma atualização de estoque
            await stockRepository.setStatusStock({
              idtenant: id_tenant,
              status: 1,
              productId: idProduto.toString(),
            });
          }
        }
      }
    } catch (error) {
      console.log("A rotina retornou erro " + error);
    }
  }
}

async function syncronizarProductToTiny(params = {}) {
  let id_tenant = params.idtenant;
  let tenant = await db.getConfigById(id_tenant);

  if (tenant.tiny_import_product != 1) {
    console.log(
      "Rejeição - Por favor Necessário ativar parametro para cadastro do produto Tiny ERP TenantId - " +
        tenant.id
    );
    return null;
  }
  let id_sequence = await obterUltimoProdutoSyncronizado(id_tenant);
  console.log("Ultimo produto cadastrado : " + id_sequence);

  let items = [];
  let idProduto = parseInt(id_sequence);
  for (let i = 0; i < 25; i++) {
    //console.log(`O retorno da variavel idProduto é : ${idProduto}`);
    let response = await checkExistsProductsTiny(id_tenant, idProduto);
    //console.log(response);

    if (response == "incluir") items.push(idProduto);
    if (response == "stop") break;
    idProduto++;
    await lib.sleep(500);
  }

  let estoques = await stockRepository.getAllStock({
    idtenant: id_tenant,
    status: 500,
  });

  if (estoques) {
    for (let estoque of estoques) {
      if (!items.includes(estoque.productId)) items.push(estoque.productId);
    }
  }

  //console.log("Lista de Produtos a serem cadastrado " + JSON.stringify(items));
  try {
    await addListProductToTiny(id_tenant, items);
  } catch (error) {}
  console.log(
    `TenantId[${id_tenant}] - Fim do processamento cadastro novos produtos API Tiny ${new Date().toLocaleString()} `
  );
}

async function syncronizarPedidoToWta(params = {}) {
  let idTenant = params.idtenant;
  let status = 1; //aberto
  let pedidos = await orderRepository.getAllOrder({
    idtenant: idTenant,
    status,
  });
  //console.log('o conteudo da listagem de pedidos é :' + JSON.stringify(pedidos))
  if (!pedidos) return true;

  for (let pedido of pedidos) {
    let new_params = {
      idtenant: idTenant,
      body: pedido.pedido,
    };

    //console.log('o resultado do params antes de enviar para api cadastar cliente: ' + JSON.stringify(params))
    let res = await winthorRepository.cadastrarCliente(new_params);
    //console.log('o resultado do cadastro do cliente '+ res)

    let idCustomer = null;
    if (res.data && res.data.Id) {
      idCustomer = res.data.Id;
    }
    if (!idCustomer) {
      console.log("Cliente inexistente junto ao WTA . Avise o administrador ");
      await orderRepository.setErrors({
        id: pedido.id,
        idtenant: idTenant,
        wta_message: res,
      });
      continue;
    }
    //console.log(idCustomer)

    new_params.idCustomer = idCustomer;
    let response = null;
    try {
      response = await winthorRepository.cadastrarPedido(new_params);
    } catch (error) {
      console.log(error);
    }
    //console.log(`o resultado do cadastrarPedido wta é :` + response )
    try {
      if (response && response.code == "WT-PV-0000239") {
        console.log(`${response.detailedMessage}`);
        let orderId = "";
        await orderRepository.setStatusOrder({
          id: pedido.id,
          status: 2,
          idtenant: idTenant,
          orderId,
        });
        await orderRepository.setErrors({
          id: pedido.id,
          idtenant: idTenant,
          wta_message: response.detailedMessage,
        });
      } else if (response && response.data && response.status == 200) {
        let orderId = response.data.orderId;
        await orderRepository.setStatusOrder({
          id: pedido.id,
          status: 2,
          idtenant: idTenant,
          orderId,
        });
        console.log(
          `Pedido cadastrado com sucesso via WTA : ${pedido.numero} - ${pedido.nome}`
        );
      } else if (response) {
        let orderId = "";

        await orderRepository.setStatusOrder({
          id: pedido.id,
          status: 500,
          idtenant: idTenant,
          orderId,
        });

        await orderRepository.setErrors({
          id: pedido.id,
          idtenant: idTenant,
          wta_message: response,
        });
        reportAdministrator(pedido);
      }
    } catch (error) {
      console.log(error);
      await orderRepository.setErrors({
        id: pedido.id,
        idtenant: idTenant,
        wta_message: error,
      });
    }
  }
}

async function reportAdministrator(pedido) {
  console.log(
    `Comunicamos erro ao cadastrar o pedido via WTA  :${pedido.numero} - ${pedido.nome}`
  );
}

global.stockWtaList = [];
global.stockWtaListTime = new Date();

async function removeWtaBlackList(idtenant) {
  let index = global.stockWtaList.indexOf(idtenant);
  if (index !== -1) {
    global.stockWtaList.splice(index, 1);
    if (global.stockWtaList.length == 0) global.stockWtaListTime = new Date();
    console.log(
      `TenantId[${idtenant}] Remoção do cache realizada com sucesso !`
    );
  }
}

async function checkSyncronizeProcessing(idtenant) {
  if (global.stockWtaList.includes(idtenant)) {
    console.log(
      `Existe uma sincronização(Envia estoque Tiny) em andamento. Tente mais tarde .`
    );
    let dtHoje = new Date();
    if (global.stockWtaListTime.getHours() !== dtHoje.getHours())
      removeWtaBlackList(idtenant);
    return true;
  }
  return false;
}

async function syncronizarStockWta(params = {}) {
  if (checkSyncronizeProcessing(params.idtenant) == true) return true;

  let idtenant = params.idtenant;
  let stocks = await stockRepository.getAllStock({ status: 1, idtenant });
  let page_count = stocks.length;
  let page = 0;
  global.stockWtaList.push(idtenant);

  //console.log('o conteudo da variavel stocks é : ' + JSON.stringify(stocks) )
  for (let stock of stocks) {
    page++;
    console.log(
      `TenantId[${idtenant}] Pesquisando SKU:  ${stock.productId} -  ${page}/${page_count}`
    );
    let product = await productRepository.getProductBySku(
      idtenant,
      stock.productId
    );
    if (product) {
      let idProdutoTiny = 0;
      //console.log('O conteudo da variavel product é : ' + JSON.stringify(product))
      if (product.id) idProdutoTiny = product.id;
      await lib.sleep(1000 * 5);
      let stockNow = await winthorRepository.consultaEstoqueBySku({
        idtenant,
        sku: stock.productId,
      });
      //console.log('O resultado do envio para stockNow é : ' +JSON.stringify(stockNow.data))
      let quantity = 0;

      if (stockNow) {
        //console.log('Teste aprovado para variavel stockNow : ' +JSON.stringify(stockNow.data))

        if (stockNow.data) {
          if (
            stockNow.data.quantity == undefined ||
            stockNow.data.quantity == null
          )
            continue;

          quantity = stockNow.data.quantity;
          //console.log('Testando variavel quantity : ' +quantity)

          let response = await tinyRepository.produtoAtualizarEstoque(
            idtenant,
            idProdutoTiny,
            quantity
          );
          //console.log('O resultado do envio para produtoAtualizarEstoque é : ' + JSON.stringify(response.data))
          try {
            if (
              response &&
              response.data &&
              response.data.retorno.status_processamento == 3
            ) {
              console.log(
                `TenantId[${idtenant}] Atualizando estoque Tiny SKU : [${stock.productId}] quantity:${quantity} `
              );
              await stockRepository.setStatusStock({
                productId: stock.productId,
                status: 2,
                idtenant,
              });
            }
          } catch (error) {
            console.log(
              `TenantId[${idtenant}] Não foi possivel atualizar o estoque do produto SKU : [${stock.productId}] quantity:${quantity} `
            );
            //console.log('O resultado do envio para produtoAtualizarEstoque é : ' + JSON.stringify(response.data))
          }
        }
      }
    } else {
      console.log(
        `TenantId[${idtenant}] Cód. Produto(SKU) sem relacionamento :  ${stock.productId} `
      );
      await stockRepository.setStatusStock({
        productId: stock.productId,
        status: 500,
        idtenant,
      });
    }
  }

  removeWtaBlackList(idtenant);
}

module.exports = {
  syncronizarPedidoToWta,
  syncronizarStockWta,
  syncronizarProductToTiny,
};

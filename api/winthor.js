const axios = require("axios");
const { response } = require("express");
const db = require("../config/db");
const lib = require("../utils/lib");
var cacheTokenApi = [];

async function getAccessToken(payLoad) {
  let accessToken = undefined;
  let hour = new Date();

  //aqui resolve o problema de ficar a todo  momento gerando token
  for (let token of cacheTokenApi) {
    if (token.id == payLoad.id && token.hour == hour.getHours())
      accessToken = token.accessToken;
  }

  if (!accessToken || accessToken == undefined || accessToken == null) {
    try {
      accessToken = await login(payLoad);
    } catch (error) {
      accessToken = await login(payLoad);
    }

    cacheTokenApi.push({ id: payLoad.id, accessToken, hour: hour.getHours() });
  }
  return accessToken;
}

async function getConfig(idTenant) {
  let config = await db.getConfigById(idTenant);
  if (!config) console.log(`A consulta não retornou dados: ${idTenant}`);

  const accessToken = await getAccessToken(config);
  //console.log('a consulta retorno o accessToken : ' +  accessToken)

  let response = {
    base_url: `http://${config.totvs_host}:${config.totvs_port}`,
    usuario: config.usuario,
    login: config.login,
    idtenant: idTenant,
    accessToken,
    config,
  };

  return response;
}

async function execute(idTenant, apiUrl, data = [], method = "GET") {
  const config = await getConfig(idTenant);
  let body = "";
  let accessToken = config.accessToken;
  let base_url = config.base_url;
  let paramStr = "";

  //console.log('os parametros antes de enviara para api Winthor : ' + JSON.stringify(data) )

  const params = new URLSearchParams();
  data.params.map(async (item) => {
    params.append(item.key, item.value);
  });
  if (data.body) body = data.body;
  if (params.toString() != "") paramStr = "?" + params.toString();

  //console.log('os parametros antes de enviara para api Winthor : ' + JSON.stringify(data)  + ' anexo' + paramStr )
  try {
    const response = await axios({
      method,
      url: `${base_url}${apiUrl}${paramStr}`,
      headers: {
        "content-type": "application/json",
        Cookie: `suukie=${accessToken}`,
      },
      data: body,
    });
    // console.log(response)

    if (response.status && response.status == 401) {
      logoutToken();
    }
    return response;
  } catch (error) {
    logoutToken();
    console.log(error);
    return error.response.data;
  }
}

async function login(data) {
  let usuario = data.totvs_usuario;
  let senha = data.totvs_login;
  let base_url = `http://${data.totvs_host}:${data.totvs_port}`;
  let apiUrl = `winthor/autenticacao/v1/login`;
  let body = { login: usuario, senha: senha };
  //console.log('O conteudo  do value :' +JSON.stringify(data))
  //console.log(`o retorno das variaveis body${JSON.stringify(body)} base_url ${base_url} + `)
  try {
    const response = await axios({
      method: "POST",
      url: `${base_url}/${apiUrl}`,
      headers: { "content-type": "application/json" },
      data: body,
    });
    //console.log(`o retorno do response : ` +JSON.stringify(response.data) )
    return response.data.accessToken;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

async function logoutToken() {
  cacheTokenApi = [];
}

module.exports = {
  execute,
  logoutToken,
};

function objectToLowerCase(records) {
  const results = [];
  for (const record of records) {
    const keys = Object.keys(record);
    const novo = {};
    for (const key of keys) {
      novo[key.toLocaleLowerCase()] = record[key];
    }
    results.push(novo);
  }
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//data.toLocaleString()) //Hoje é: 16/12/2022 17:20:12
//var data = new Date();   exemplo de uso    addDays( new Date(), -14)
function addDays(date, days) {
  date.setDate(date.getDate() + days);
  return date;
}

//-----------------------------------------------
// Retorna somente numeros
//-----------------------------------------------
function onlyNumber(string) {
  return string.replace(/[^0-9]/g, "");
}

//-----------------------------------------------
// Formatatação de data para Brasil !
//-----------------------------------------------
function adicionaZero(numero) {
  if (numero <= 9) return "0" + numero;
  else return numero;
}

function formatDateBr(data) {
  let dataFormatada =
    adicionaZero(data.getDate().toString()) +
    "/" +
    adicionaZero(data.getMonth() + 1).toString() +
    "/" +
    data.getFullYear();
  return dataFormatada;
}

//-----------------------------------------------
function sliceString(string, separador) {
  return string.slice(0, string.indexOf(separador));
}

function upperCase(str) {
  let value = str;
  if (!value || value == null || value == undefined) {
    value = String("");
  } else {
    value = String(str).toUpperCase();
  }
  return value;
}

//exemplo de uso
//await sleep(3000);

export const lib = {
  objectToLowerCase,
  sleep,
  addDays,
  formatDateBr,
  onlyNumber,
  sliceString,
  upperCase,
};

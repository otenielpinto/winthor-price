import nodeSchedule from "node-schedule";
import { lib } from "./utils/lib.js";
import { priceRepository } from "./repository/priceRepository.js";
import { seavixPriceRepository } from "./repository/seavixPriceRepository.js";

async function task() {
  await priceRepository.init();
  //job Seavix nao pode derrubar o job principal se a conexao falhar
  try {
    await seavixPriceRepository.init();
  } catch (e) {
    console.log("Seavix: erro no job de precos - " + e.message);
  }
}

async function init() {
  // console.log("iniciando o processamento  " + new Date().toLocaleString());
  //await priceRepository.init();

  //await seavixPriceRepository.init();
  //console.log("Fim da leitura as " + new Date().toLocaleString());
  //return;

  try {
    // Executa diariamente às 01:00, 12:00, 16:00 e 22:00
    const job = nodeSchedule.scheduleJob("0 1,12,16,22 * * *", async () => {
      console.log(" Job start as " + new Date().toLocaleString());
      await task();
    });
  } catch (err) {
    throw new Error(`Can't start agenda! Err: ${err.message}`);
  }
}

export const agenda = { init };

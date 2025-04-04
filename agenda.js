import nodeSchedule from "node-schedule";
import { TMongo } from "./config/db.js";
import { lib } from "./utils/lib.js";
import { priceRepository } from "./repository/priceRepository.js";

async function task() {
  await priceRepository.init();
}

async function init() {
  await priceRepository.init();

  console.log("Fim da leitura as " + new Date().toLocaleString());

  return;

  try {
    const time = 60 * 6; //tempo em minutos
    const job = nodeSchedule.scheduleJob(`*/${time} * * * *`, async () => {
      console.log(" Job start as " + new Date().toLocaleString());
      await TMongo.validateTimeConnection();
      await task();
    });
  } catch (err) {
    throw new Error(`Can't start agenda! Err: ${err.message}`);
  }
}

export const agenda = { init };

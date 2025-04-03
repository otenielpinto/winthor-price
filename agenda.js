const db = require("./config/db");
const nodeSchedule = require("node-schedule");
const priceRepository = require("./repository/priceRepository");
const lib = require("./utils/lib");

async function init() {
  await priceRepository.SyncPricesAllTenants();
  await priceRepository.updatePricesTiny();
  console.log("Fim da leitura as " + new Date().toLocaleString());

  //   try {
  //     const time = 60*24; //tempo em minutos
  //     const job = nodeSchedule.scheduleJob(`*/${time} * * * *`, async () => {
  //       console.log(" Job start as " + new Date().toLocaleString());
  //       await db.validateTimeConnection();
  //       syncronizaWtaNow();
  //     });
  //   } catch (err) {
  //     throw new Error(`Can't start agenda! Err: ${err.message}`);
  //   }
}

module.exports = { init };

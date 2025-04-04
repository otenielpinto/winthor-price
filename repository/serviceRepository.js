import { TMongo } from "../config/db.js";
import { lib } from "../utils/lib.js";

async function getServiceById(idtenant, name_service) {
  const client = await TMongo.mongoConnect();
  let response = await client
    .collection("service")
    .findOne({ id: idtenant, name: name_service });
  return response;
}

async function getService(idtenant, name_service) {
  let response = await getServiceById(idtenant, name_service);
  if (!response) {
    response = await updateService(idtenant, name_service);
  }
  return response;
}

async function updateService(idtenant, name_service) {
  let last = new Date();
  let dateBr = lib.formatDateBr(new Date());

  const client = await TMongo.mongoConnect();
  const service = await getServiceById(idtenant, name_service);

  if (!service) {
    last = null;
    dateBr = null;
  }

  let config = {
    id: idtenant,
    name: name_service,
    last: last,
    dateBr: dateBr,
  };

  return client
    .collection("service")
    .updateOne(
      { id: { $eq: idtenant }, name: { $eq: name_service } },
      { $set: config },
      { upsert: true }
    );
}

async function wasExecutedToday(id_tenant, name_service) {
  const service = await getService(id_tenant, name_service);

  if (service?.dateBr) {
    const today = lib.formatDateBr(new Date());
    if (service.dateBr === today) return true;
  }

  await updateService(id_tenant, name_service);
  return false;
}

export const serviceRepository = {
  wasExecutedToday,
};

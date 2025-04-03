const db = require("../config/db");
const lib = require("../utils/lib");
const table_name = "id_tracker";

async function getIdTracker(id_tenant, name_service) {
  const client = await db.mongoConnect();
  let response = await client
    .collection(table_name)
    .findOne({ id_tenant: id_tenant, name: name_service });
  return response;
}

async function updateTracker(id_tenant, name_service, id_sequence) {
  if (!id_sequence) id_sequence = 0;
  const client = await db.mongoConnect();
  const service = await getIdTracker(id_tenant, name_service);

  if (service) {
    if (service.id_sequence > id_sequence) return null;
  }

  let config = {
    id_tenant,
    name: name_service,
    id_sequence: parseInt(id_sequence),
  };

  return client
    .collection(table_name)
    .updateOne(
      { id_tenant: { $eq: id_tenant }, name: { $eq: name_service } },
      { $set: config },
      { upsert: true }
    );
}

module.exports = {
  getIdTracker,
  updateTracker,
};

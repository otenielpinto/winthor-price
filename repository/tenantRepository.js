import { TMongo } from "../config/db.js";
import { lib } from "../utils/lib.js";

async function getAllTenantSystem() {
  const client = await TMongo.mongoConnect();
  return await client.collection("tenant").find().toArray();
}

async function getTokenByTenantId(idTenant) {
  const tenant = await getTenantById(idTenant);
  if (!tenant || tenant == null || tenant === undefined) {
    throw new Error(`A consulta não retornou dados: ${idTenant}`);
  }
  return tenant.tiny_token;
}

async function insertTenant() {
  let id = 1;
  const config = {
    id: id,
    tiny_token: "",
    oracle_host: "",
    oracle_user: "",
    oracle_password: "",
    oracle_connectString: "",
    totvs_usuario: "",
    totvs_login: "",
    totvs_host: "",
    totvs_port: "",
    customer_sellerId: "",
    customer_activityId: "",
    customer_squareId: 0,
    customer_customerOrigin: "",
    customer_cnaeId: null,
    customer_phone: "",
    customer_email: "",
    order_paymentPlanId: 1,
    order_chargingId: "",
    order_saleTypePayment: "",
    order_seller: 0,
    price_codregiao: "",
    price_codfilial: "",
    price_service_on: 0,

    updateat: new Date(),
  };

  const client = await TMongo.mongoConnect();
  client
    .collection("tenant")
    .updateOne({ id: { $eq: id } }, { $set: config }, { upsert: true });
  return true;
}
async function getTenantById(idTenant) {
  return TMongo.getConfigById(idTenant);
}

export const tenantRepository = {
  getAllTenantSystem,
  getTokenByTenantId,
  getTenantById,
  insertTenant,
};

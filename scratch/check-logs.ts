import { MongoClient } from "mongodb";

const uri = "mongodb+srv://ujjalchatterjee08_db_user:FzTdjnRXTZKeeNEN@all-in-one.te7gpgx.mongodb.net/pdf-tools?appName=all-in-one";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  console.log("--- LOGS ---");
  const logs = await db.collection("logs").find({}).toArray();
  console.log(JSON.stringify(logs, null, 2));

  console.log("--- USERS ---");
  const users = await db.collection("users").find({}).toArray();
  console.log(JSON.stringify(users, null, 2));

  console.log("--- DEVICES ---");
  const devices = await db.collection("devices").find({}).toArray();
  console.log(JSON.stringify(devices, null, 2));

  await client.close();
}

main().catch(console.error);

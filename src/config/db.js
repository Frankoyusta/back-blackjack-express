const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = process.env.DATABASE_NAME;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await client.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Disconnection error:', error);
  }
};

// CRUD Operations
const createReport = async (data, collectionName) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).insertOne(data);
};

const getReports = async (collectionName) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).find().toArray();
};

const getReportById = async (id, collectionName) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
};

const updateReport = async (id, data, collectionName, query) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).updateOne(query, { $set: data });
};

const deleteReport = async (id, collectionName) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
};

const getDocument = async (collectionName, query) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).findOne(query);
};

const getDocumentsByReportId = async (collectionName, query) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).find(query).toArray();
}

const getCollection = async (collectionName) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).find().toArray();
};

const updateDocument = async (data, collectionName, query) => {
  const db = client.db(dbName);
  return await db.collection(collectionName).updateOne(query, { $set: data });
};

module.exports = { 
  connectDB, 
  createReport, 
  getReports, 
  getReportById, 
  updateReport, 
  deleteReport, 
  getDocument, 
  updateDocument, 
  getCollection, 
  getDocumentsByReportId,
  disconnectDB
};
// src/controllers/tableController.js
const tableService = require('../services/tableService');
const { connectDB, disconnectDB } = require('../config/db');

async function getTables(req, res) {
  try {
    // Ensure DB connection is established
    await connectDB();
    
    const tables = await tableService.getAllTables();
    res.json(tables);
  } catch (error) {
    console.error('Error in getTables controller:', error);
    res.status(500).json({ error: error.message });
  }
}

async function createTable(req, res) {
  try {
    // Ensure DB connection is established
    await connectDB();
    
    const { name, createdBy } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Table name and creator are required' });
    }
    
    const table = await tableService.createTable(name, createdBy);
    res.status(201).json({ id: table.id, name: table.name });
  } catch (error) {
    console.error('Error in createTable controller:', error);
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getTables,
  createTable
};
// src/controllers/tableController.js
const tableService = require('../services/tableService');

function getTables(req, res) {
  try {
    const tables = tableService.getAllTables();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function createTable(req, res) {
  try {
    const { name, createdBy } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Nombre de mesa y creador son requeridos' });
    }
    
    const table = tableService.createTable(name, createdBy);
    res.status(201).json({ id: table.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getTables,
  createTable
};
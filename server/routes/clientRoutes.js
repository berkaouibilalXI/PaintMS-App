const express = require('express');
const router = express.Router();
const {getAllClients, createClient, editClient, deleteClient} = require('../controllers/clientController');

router.get('/', getAllClients);
router.post('/', createClient);
router.put('/:id', editClient);
router.delete('/:id', deleteClient);

module.exports = router;
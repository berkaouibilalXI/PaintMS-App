const express = require('express');
const router =  express.Router();
const {getAllProducts, createProduct, editProduct, deleteProduct} = require('../controllers/productController');

router.get('/', getAllProducts);
router.post('/', createProduct);
router.put('/:id', editProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
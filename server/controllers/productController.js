const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createProductSchema, updateProductSchema } = require("../validations/productValidation");

// GET all products
const getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' }
        });
        
        // Fixed: Don't send a string message, send proper JSON
        if (products.length === 0) {
            return res.json([]);
        }
        
        res.json(products);
    } catch (err) {
        console.error("Error getting products:", err);
        res.status(500).json({ error: err.message });
    }
}

// POST create product
const createProduct = async (req, res) => {
    try {
        console.log("Creating product with data:", req.body);
        
        const result = createProductSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: result.error.errors
            });
        }

        const { name, price, unit } = result.data;
        
        const product = await prisma.product.create({
            data: {
                name,
                price: parseFloat(price),
                unit: unit || "unité"
            }
        });
        
        res.status(201).json(product);
    } catch (err) {
        console.error("Error creating product:", err);
        res.status(500).json({ error: err.message });
    }
}

// PUT update product
const editProduct = async (req, res) => {
    const { id } = req.params;

    try {
        console.log("Updating product:", id, "with data:", req.body);

        // Validate input
        const result = updateProductSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: result.error.errors
            });
        }

        // Validate the product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingProduct) {
            return res.status(404).json({ error: "Produit non trouvé" });
        }

        const { name, price, unit, description } = result.data;

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name: name || existingProduct.name,
                price: price !== undefined ? parseFloat(price) : existingProduct.price,
                unit: unit || existingProduct.unit,
                description: description !== undefined ? description : existingProduct.description
            }
        });

        res.json(product);
    } catch (err) {
        console.error("Error updating product:", err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE product with foreign key constraint handling
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log("Attempting to delete product:", id);
        
        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingProduct) {
            return res.status(404).json({ error: "Produit non trouvé" });
        }

        // Check if product is used in any invoice items
        const invoiceItems = await prisma.invoiceItem.findMany({
            where: { productId: parseInt(id) },
            include: {
                invoice: {
                    select: { invoiceNumber: true }
                }
            }
        });

        if (invoiceItems.length > 0) {
            const invoiceNumbers = invoiceItems.map(item => item.invoice.invoiceNumber);
            console.log(`Product ${id} is used in invoices:`, invoiceNumbers);
            return res.status(400).json({ 
                error: "Impossible de supprimer ce produit",
                message: `Ce produit est utilisé dans les factures suivantes: ${invoiceNumbers.join(', ')}. Supprimez d'abord ces factures ou modifiez-les.`,
                usedInInvoices: invoiceNumbers
            });
        }

        console.log(`Product ${id} is not used in any invoices, proceeding with deletion`);

        // If no constraints, delete the product
        const deletedProduct = await prisma.product.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({ 
            message: "Produit supprimé avec succès",
            product: deletedProduct 
        });
        
    } catch (err) {
        console.error("Error deleting product:", err);
        
        // Handle specific Prisma errors
        if (err.code === 'P2003') {
            return res.status(400).json({ 
                error: "Impossible de supprimer ce produit",
                message: "Ce produit est utilisé dans des factures existantes. Supprimez d'abord les factures qui utilisent ce produit."
            });
        }
        
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllProducts,
    createProduct,
    editProduct,
    deleteProduct
}
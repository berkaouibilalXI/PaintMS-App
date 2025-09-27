const { z } = require('zod');

const invoiceItemSchema = z.object({
    // Accept strings and coerce to numbers since frontend sends strings
    productId: z.string().or(z.number()).pipe(z.coerce.number().int().positive()),
    quantity: z.string().or(z.number()).pipe(z.coerce.number().int().min(1)),
    unitPrice: z.string().or(z.number()).pipe(z.coerce.number().positive())
});

const createInvoiceSchema = z.object({
    // Accept strings and coerce to numbers
    clientId: z.string().or(z.number()).pipe(z.coerce.number().int().positive()),
    items: z.array(invoiceItemSchema).min(1, "Au moins un produit est requis"),
    note: z.string().optional().default("")
});

module.exports = {
    createInvoiceSchema
};
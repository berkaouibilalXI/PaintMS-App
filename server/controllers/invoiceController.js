const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { createInvoiceSchema } = require("../validations/invoiceValidation");
const fs = require('fs');
const path = require('path');

// Helper function to get logo as base64
const getLogoBase64 = () => {
  try {
    // Try different possible paths for the logo
    const possiblePaths = [
      path.join(__dirname, '../../frontend/src/assets/logo.png'),
      path.join(__dirname, '../../assets/logo.png'),
      path.join(__dirname, '../assets/logo.png'),
      path.join(process.cwd(), 'assets/logo.png'),
      path.join(process.cwd(), 'frontend/src/assets/logo.png')
    ];

    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        return logoBuffer.toString('base64');
      }
    }
    
    // If no logo found, return empty string
    console.log('Logo not found in any of the expected paths');
    return '';
  } catch (error) {
    console.error('Error reading logo file:', error);
    return '';
  }
};

// GET all invoices
const getAllInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        client: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { date: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    console.error("Error getting invoices:", err);
    res.status(500).json({ error: err.message });
  }
};

// Utility: hydrate prices if missing
const hydrateItemPrices = async (items) => {
  const productIds = [...new Set(items.map(i => parseInt(i.productId)))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true },
  });
  const priceMap = Object.fromEntries(products.map(p => [p.id, p.price]));

  return items.map(it => ({
    productId: parseInt(it.productId),
    quantity: parseInt(it.quantity) || 1,
    unitPrice: parseFloat(it.unitPrice) || priceMap[parseInt(it.productId)] || 0,
  }));
};

// POST create invoice
const createInvoice = async (req, res) => {
  try {
    console.log("Received data:", JSON.stringify(req.body, null, 2));
    
    const result = createInvoiceSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Validation errors:", result.error.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: result.error.errors 
      });
    }

    const { clientId, items, note } = result.data;

    // Validate that client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const hydrated = await hydrateItemPrices(items);

    const mergedItems = Object.values(
      hydrated.reduce((acc, item) => {
        if (!acc[item.productId]) acc[item.productId] = { ...item };
        else acc[item.productId].quantity += item.quantity;
        return acc;
      }, {})
    );

    const total = mergedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.invoice.count();
    const numBon = `PMS-${datePart}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: numBon,
        clientId: clientId,
        total,
        note: note || "",
        items: {
          create: mergedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        client: true,
        items: { include: { product: true } },
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("Error creating invoice:", err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH update invoice
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log("Updating invoice:", id, "with data:", JSON.stringify(req.body, null, 2));
    
    const result = createInvoiceSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Validation errors:", result.error.errors);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: result.error.errors 
      });
    }

    const { clientId, items, note } = result.data;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    });
    if (!existingInvoice) {
      return res.status(404).json({ error: "Facture non trouvée" });
    }

    // Validate that client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: parseInt(id) },
    });

    const hydrated = await hydrateItemPrices(items);

    const mergedItems = Object.values(
      hydrated.reduce((acc, item) => {
        if (!acc[item.productId]) acc[item.productId] = { ...item };
        else acc[item.productId].quantity += item.quantity;
        return acc;
      }, {})
    );

    const total = mergedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const updatedInvoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: {
        clientId: clientId,
        note: note || "",
        total,
        items: {
          create: mergedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        client: true,
        items: { include: { product: true } },
      },
    });

    res.json(updatedInvoice);
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH mark paid/unpaid
const markInvoiceAsPaid = async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(req.params.id) },
      data: { paid: true },
    });
    res.json(invoice);
  } catch (err) {
    console.error("Error marking invoice as paid:", err);
    res.status(400).json({ error: err.message });
  }
};

const markInvoiceAsUnpaid = async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(req.params.id) },
      data: { paid: false },
    });
    res.json(invoice);
  } catch (err) {
    console.error("Error marking invoice as unpaid:", err);
    res.status(400).json({ error: err.message });
  }
};

// DELETE
const deleteInvoice = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    
    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    
    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Delete invoice items first (due to foreign key constraint)
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: invoiceId },
    });

    // Then delete the invoice
    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Error deleting invoice:", err);
    res.status(400).json({ error: err.message });
  }
};

// GET invoice print data
const getInvoicePrintData = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Facture non trouvée" });
    }

    // Generate HTML template for printing
    const printHTML = generateInvoicePrintHTML(invoice);
    
    res.json({
      invoice,
      printHTML
    });
  } catch (err) {
    console.error("Error getting invoice print data:", err);
    res.status(500).json({ error: err.message });
  }
};

const generateInvoicePrintHTML = (invoice) => {
  const currentDate = new Date().toLocaleDateString('fr-FR');
  const logoBase64 = getLogoBase64();
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Facture ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          .invoice-header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .logo-container {
            margin-bottom: 20px;
          }
          
          .company-logo {
            height: 80px;
            width: auto;
            max-width: 200px;
            object-fit: contain;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 8px;
          }
          
          .document-type {
            font-size: 16px;
            color: #666;
            margin: 0;
          }
          
          .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          
          .info-section {
            flex: 1;
          }
          
          .info-section h3 {
            color: #2563eb;
            margin-bottom: 15px;
            font-size: 16px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          
          .info-section p {
            margin: 8px 0;
            font-size: 14px;
          }
          
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .invoice-table th {
            background-color: #f8fafc;
            border: 1px solid #e5e7eb;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            font-size: 14px;
          }
          
          .invoice-table td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            font-size: 14px;
          }
          
          .invoice-table tbody tr:hover {
            background-color: #f9fafb;
          }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          
          .total-row {
            background-color: #f1f5f9 !important;
            font-weight: bold;
            font-size: 16px;
          }
          
          .invoice-note {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
            margin-bottom: 30px;
          }
          
          .invoice-note h4 {
            color: #2563eb;
            margin-bottom: 10px;
            font-size: 14px;
          }
          
          .invoice-footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .status-paid {
            background-color: #dcfce7;
            color: #166534;
          }
          
          .status-unpaid {
            background-color: #fef3c7;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          ${logoBase64 ? `
            <div class="logo-container">
              <img src="data:image/png;base64,${logoBase64}" 
                   alt="Logo PaintMS" 
                   class="company-logo"/>
            </div>
          ` : ''}
          <h1 class="company-name">PAINT MS</h1>
          <p class="document-type">Bon de Commande / Facture</p>
        </div>
        
        <div class="invoice-info">
          <div class="info-section">
            <h3>Informations Client</h3>
            <p><strong>Nom :</strong> ${invoice.client?.name || 'Client inconnu'}</p>
            <p><strong>Date :</strong> ${new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
          </div>
          <div class="info-section" style="text-align: right;">
            <h3>Détails Facture</h3>
            <p><strong>N° :</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Statut :</strong> 
              <span class="status-badge ${invoice.paid ? 'status-paid' : 'status-unpaid'}">
                ${invoice.paid ? 'Payé' : 'Non payé'}
              </span>
            </p>
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th class="text-center">Quantité</th>
              <th class="text-right">Prix Unit. (DZD)</th>
              <th class="text-right">Total (DZD)</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items?.map(item => `
              <tr>
                <td>${item.product?.name || 'Produit inconnu'}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.unitPrice?.toFixed(2)}</td>
                <td class="text-right font-bold">${item.total?.toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="text-center" style="padding: 40px; color: #6b7280;">Aucun produit dans cette facture</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" class="text-right">Total Général :</td>
              <td class="text-right">${invoice.total?.toFixed(2)} DZD</td>
            </tr>
          </tfoot>
        </table>

        ${invoice.note ? `
          <div class="invoice-note">
            <h4>Note :</h4>
            <p>${invoice.note}</p>
          </div>
        ` : ''}

        <div class="invoice-footer">
          <p>Merci pour votre confiance !</p>
          <p>Document imprimé le ${currentDate}</p>
        </div>
      </body>
    </html>
  `;
};

module.exports = {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsPaid,
  markInvoiceAsUnpaid,
  getInvoicePrintData
};
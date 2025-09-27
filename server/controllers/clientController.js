const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {createClientSchema} = require("../validations/clientValidation");
const validate = require("../middlewares/validationMiddleware");

//Endpoint te3 les clients: /api/v1/clients

//lister ga3 les clients li kynin f la table
const getAllClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
    });
    if (clients.length == 0) {
      return res.json({
        Message: "DIR DES CLIENTS W WELLI",
      });
    }
    res.json(clients);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};

//nzidou client
const createClient = async (req, res) => {
  //Validation avant tt
  const result =  createClientSchema.safeParse(req.body);
  if(!result.success){
    return res.status(400).json({
      error:  result.error.errors[0].message
    });
  }


  const { name, phone, address } = result.data;
  try {
    const client = await prisma.client.create({
      data: { name, phone, address },
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({error: err.message});
  }
};

//nmodifou client

const editClient =  async (req, res) => {
    const { id } = req.params;
    const { name, phone, address } = req.body;

    // Validation basique
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Nom est requis' });
    }

    try {
        const client = await prisma.client.update({
            where: { id: parseInt(id) },
            data: { name: name.trim(), phone, address }
        });
        res.json(client);
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Client non trouvé' });
        }
        res.status(500).json({ error: err.message });
    }
};

//nsupprimou client
const deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        const client = await prisma.client.delete({
            where: {
                id: parseInt(id)
            }
        });
        res.json({ message: 'Client supprimé avec succès', client });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Client non trouvé' });
        }
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getAllClients,
    createClient,
    editClient,
    deleteClient,
}
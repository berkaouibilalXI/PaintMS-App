const {z} =  require('zod');

const createClientSchema = z.object({
    name: z.string().min(1, 'Nom est requis'),
    phone : z.string().optional(),
    address: z.string().optional(),
});

module.exports = {
    createClientSchema
};
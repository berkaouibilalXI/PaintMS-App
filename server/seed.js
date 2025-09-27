const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma =  new PrismaClient();

async function main(){
    //nhashiw le mdps
    const hashedPassword =  await bcrypt.hash('admin123', 10);

    //ncreyiw l'utilisateur admin
    const admin = await prisma.user.upsert({
        where: {email: 'admin@paintms.com'},
        update: {},
        create: {
            email: 'admin@paintms.com',
            password: hashedPassword,
            name: 'Admin PaintMS'
        }
    });

    console.log('Utilisateur admin créé ou déjà existant:', admin);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async ()=>{
        await prisma.$disconnect();
    })
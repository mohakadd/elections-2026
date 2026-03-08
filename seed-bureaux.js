require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const rawList = [
    { numero: "1", nom: "HOTEL DE VILLE" },
    { numero: "2", nom: "ECOLE MATERNELLE DES TILLEULS" },
    { numero: "3", nom: "ECOLE PRIMAIRE DU CHAT PERCHE (03),2 ALLEE DE LA FANTAISIE" },
    { numero: "4", nom: "ECOLE PRIMAIRE DU GROS CAILLOU" },
    { numero: "5", nom: "ECOLE PRIMAIRE DU GROS CAILLOU" },
    { numero: "6", nom: "ECOLE MATERNELLE DU TERROIR" },
    { numero: "7", nom: "ECOLE PRIMAIRE DU BONTEMPS" },
    { numero: "8", nom: "ECOLE MATERNELLE POINT DU JOUR" },
    { numero: "9", nom: "ECOLE PRIMAIRE DU HAZAY" },
    { numero: "10", nom: "ECOLE PRIMAIRE DES ESSARTS" },
    { numero: "11", nom: "ECOLE MATERNELLE DES TERRASSES" },
    { numero: "12", nom: "ECOLE PRIMAIRE DE LA BELLE EPINE" },
    { numero: "13", nom: "ECOLE PRIMAIRE DE LA SEBILLE" },
    { numero: "14", nom: "ECOLE PRIMAIRE DE LA JUSTICE" },
    { numero: "15", nom: "ECOLE MATERNELLE DU PARC" },
    { numero: "16", nom: "ECOLE PRIMAIRE DES LINANDES" },
    { numero: "17", nom: "ECOLE PRIMAIRE DU PONCEAU" },
    { numero: "18", nom: "ECOLE PRIMAIRE DU VILLAGE" },
    { numero: "19", nom: "LCR DU PORT" },
    { numero: "20", nom: "ECOLE MATERNELLE DU VILLAGE" },
    { numero: "21", nom: "ECOLE MATERNELLE DES CHENES" },
    { numero: "22", nom: "CARREAU DE CERGY" },
    { numero: "23", nom: "CARREAU DE CERGY" },
    { numero: "24", nom: "ECOLE PRIMAIRE DES PLANTS" },
    { numero: "25", nom: "PETIT VENT" },
    { numero: "26", nom: "ECOLE MATERNELLE DES TOULEUSES" },
    { numero: "27", nom: "ECOLE MATERNELLE DES CHATEAUX" },
    { numero: "28", nom: "ECOLE PRIMAIRE DU POINT DU JOUR" },
    { numero: "29", nom: "ECOLE MATERNELLE DES GENOTTES" },
    { numero: "30", nom: "ECOLE MATERNELLE DU HAZAY" },
    { numero: "31", nom: "ECOLE PRIMAIRE DU CHEMIN DUPUIS" },
    { numero: "32", nom: "ECOLE PRIMAIRE DE LA CHANTERELLE" },
    { numero: "33", nom: "ECOLE MATERNELLE DU CHAT PERCHE" },
    { numero: "34", nom: "ECOLE PRIMAIRE DES ESSARTS" },
    { numero: "35", nom: "GROUPE SCOLAIRE DU NAUTILUS" }
];

async function seed() {
    console.log('Connexion à Supabase...');

    console.log('Suppression des anciens bureaux...');
    const { error: deleteError } = await supabase
        .from('bureaux')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('Erreur lors de la purge :', deleteError);
        return;
    }

    const records = rawList.map(b => {
        return {
            numero: b.numero,
            nom: b.nom,
            pin: '0000', // PIN par défaut (4 zéros)
            inscrits: 0
        };
    });

    console.log(`Insertion de ${records.length} bureaux...`);
    const { data, error } = await supabase
        .from('bureaux')
        .insert(records);

    if (error) {
        console.error('Erreur Supabase lors de l\'insertion :', error);
    } else {
        console.log('Succès ! 35 nouveaux bureaux insérés avec le PIN par défaut "0000".');
    }
}

seed();

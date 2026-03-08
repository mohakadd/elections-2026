const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // API Publique : On renvoie l'ID, le Numéro et le Nom pour le menu déroulant
        const { data: bureaux, error } = await supabase
            .from('bureaux')
            .select('id, numero, nom');

        if (error) {
            throw error;
        }

        // Tri numérique en Javascript (pour éviter que '10' ne passe avant '2')
        bureaux.sort((a, b) => (parseInt(a.numero) || 0) - (parseInt(b.numero) || 0));

        return {
            statusCode: 200,
            body: JSON.stringify({ bureaux })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
    }
};

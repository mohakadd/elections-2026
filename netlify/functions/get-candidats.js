const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // API Publique : Renvoie la liste des candidats et leurs couleurs
        const { data: candidats, error } = await supabase
            .from('candidats')
            .select('*')
            .order('nom');

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ candidats })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
    }
};

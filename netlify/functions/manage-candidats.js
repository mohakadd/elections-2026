const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const allowedMethods = ['POST', 'DELETE'];

    if (!allowedMethods.includes(event.httpMethod)) {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const authHeader = event.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Accès non autorisé : Mot de passe incorrect' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // ---- CREATE (POST) ----
        if (event.httpMethod === 'POST') {
            const { nom, couleur } = JSON.parse(event.body);
            if (!nom || !couleur) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Nom et Couleur requis' }) };
            }

            const { data, error } = await supabase
                .from('candidats')
                .insert([{ nom, couleur }])
                .select();

            if (error) {
                if (error.code === '23505') return { statusCode: 400, body: JSON.stringify({ error: 'Un candidat avec ce nom existe déjà' }) };
                throw error;
            }
            return { statusCode: 201, body: JSON.stringify({ message: 'Candidat créé avec succès', candidat: data[0] }) };
        }

        // ---- DELETE (DELETE) ----
        if (event.httpMethod === 'DELETE') {
            const { id } = JSON.parse(event.body);
            if (!id) {
                return { statusCode: 400, body: JSON.stringify({ error: 'ID du candidat requis' }) };
            }

            // Supabase CASCADE va supprimer les votes_candidats liés
            const { error } = await supabase
                .from('candidats')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ message: 'Candidat supprimé avec succès' }) };
        }

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur', details: error.message }) };
    }
};

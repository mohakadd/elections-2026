const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const allowedMethods = ['POST', 'DELETE', 'PUT'];

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

            // Déterminer le prochain ordre
            const { data: existing, error: fetchError } = await supabase
                .from('candidats')
                .select('ordre')
                .order('ordre', { ascending: false })
                .limit(1);

            if (fetchError) throw fetchError;
            const nextOrdre = (existing && existing.length > 0) ? existing[0].ordre + 1 : 0;

            const { data, error } = await supabase
                .from('candidats')
                .insert([{ nom, couleur, ordre: nextOrdre }])
                .select();

            if (error) {
                if (error.code === '23505') return { statusCode: 400, body: JSON.stringify({ error: 'Un candidat avec ce nom existe déjà' }) };
                throw error;
            }
            return { statusCode: 201, body: JSON.stringify({ message: 'Candidat créé avec succès', candidat: data[0] }) };
        }

        // ---- REORDER (PUT) ----
        if (event.httpMethod === 'PUT') {
            const { ordres } = JSON.parse(event.body);
            if (!ordres || !Array.isArray(ordres)) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Liste des ordres requise (tableau [{id, ordre}, ...])' }) };
            }

            for (const item of ordres) {
                const { error } = await supabase
                    .from('candidats')
                    .update({ ordre: item.ordre })
                    .eq('id', item.id);
                if (error) throw error;
            }

            return { statusCode: 200, body: JSON.stringify({ message: 'Ordre mis à jour avec succès' }) };
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


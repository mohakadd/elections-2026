const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const allowedMethods = ['POST', 'PUT', 'DELETE'];

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
            const { nom, pin, inscrits } = JSON.parse(event.body);
            if (!nom || !pin || pin.length !== 4) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Nom et PIN (4 chiffres) requis' }) };
            }

            const inscritsValue = parseInt(inscrits) || 0;

            const { data, error } = await supabase
                .from('bureaux')
                .insert([{ nom, pin, inscrits: inscritsValue }])
                .select();

            if (error) {
                if (error.code === '23505') return { statusCode: 400, body: JSON.stringify({ error: 'Un bureau avec ce nom existe déjà' }) };
                throw error;
            }
            return { statusCode: 201, body: JSON.stringify({ message: 'Bureau créé avec succès', bureau: data[0] }) };
        }

        // ---- UPDATE (PUT) : Reset ou Edit ----
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { action, id } = body;

            if (action === 'reset') {
                if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'ID du bureau requis pour réinitialisation' }) };

                // 1. Delete associated results (will cascade to votes_candidats)
                const { data: bureau } = await supabase.from('bureaux').select('nom').eq('id', id).single();
                if (!bureau) return { statusCode: 404, body: JSON.stringify({ error: 'Bureau introuvable' }) };

                const { error: delResError } = await supabase
                    .from('resultats')
                    .delete()
                    .eq('bureau_nom', bureau.nom);

                if (delResError) throw delResError;

                // 2. Set a_vote to false
                const { data, error } = await supabase
                    .from('bureaux')
                    .update({ a_vote: false })
                    .eq('id', id)
                    .select();

                if (error) throw error;
                return { statusCode: 200, body: JSON.stringify({ message: 'Bureau réinitialisé', bureau: data[0] }) };
            } else if (action === 'edit') {
                const { nom, pin, inscrits } = body;
                if (!id || !nom || !pin || pin.length !== 4) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Données invalides pour la modification' }) };
                }
                const inscritsValue = parseInt(inscrits) || 0;

                const { data, error } = await supabase
                    .from('bureaux')
                    .update({ nom, pin, inscrits: inscritsValue })
                    .eq('id', id)
                    .select();

                if (error) {
                    if (error.code === '23505') return { statusCode: 400, body: JSON.stringify({ error: 'Un bureau avec ce nom existe déjà' }) };
                    throw error;
                }
                return { statusCode: 200, body: JSON.stringify({ message: 'Bureau modifié avec succès', bureau: data[0] }) };
            }

            return { statusCode: 400, body: JSON.stringify({ error: 'Action non supportée' }) };
        }

        // ---- DELETE (DELETE) ----
        if (event.httpMethod === 'DELETE') {
            const { id } = JSON.parse(event.body);
            if (!id) {
                return { statusCode: 400, body: JSON.stringify({ error: 'ID du bureau requis' }) };
            }

            // Vérifier si le bureau a déjà voté (si oui, interdire la suppression par précaution)
            const { data: bureauCheck } = await supabase.from('bureaux').select('a_vote').eq('id', id).single();
            if (bureauCheck && bureauCheck.a_vote) {
                return { statusCode: 403, body: JSON.stringify({ error: 'Impossible de supprimer un bureau qui a déjà transmis ses résultats' }) };
            }

            const { error } = await supabase
                .from('bureaux')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ message: 'Bureau supprimé avec succès' }) };
        }

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur', details: error.message }) };
    }
};

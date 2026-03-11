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
            const { numero, nom, pin, inscrits } = JSON.parse(event.body);
            if (!numero || !nom || !pin || pin.length !== 4) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Numéro, Nom et PIN (4 chiffres) requis' }) };
            }

            // Vérification unicité Numéro
            const { data: existing, error: checkError } = await supabase
                .from('bureaux')
                .select('numero')
                .eq('numero', numero);
            if (checkError) throw checkError;
            if (existing && existing.length > 0) {
                return { statusCode: 400, body: JSON.stringify({ error: `Un bureau avec ce Numéro existe déjà` }) };
            }

            const inscritsValue = parseInt(inscrits) || 0;

            const { data, error } = await supabase
                .from('bureaux')
                .insert([{ numero, nom, pin, inscrits: inscritsValue }])
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

                const { error: delResError } = await supabase
                    .from('resultats')
                    .delete()
                    .eq('bureau_id', id);

                if (delResError) throw delResError;

                // 2. Set a_vote to false
                const { data, error } = await supabase
                    .from('bureaux')
                    .update({ a_vote: false })
                    .eq('id', id)
                    .select();

                if (error) throw error;
                return { statusCode: 200, body: JSON.stringify({ message: 'Bureau réinitialisé', bureau: data[0] }) };
            } else if (action === 'reset_all') {
                // 1. Delete ALL results
                const { error: delResError } = await supabase
                    .from('resultats')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to delete all rows

                if (delResError) throw delResError;

                // 2. Set API a_vote to false for ALL bureaux
                const { error } = await supabase
                    .from('bureaux')
                    .update({ a_vote: false })
                    .neq('id', '00000000-0000-0000-0000-000000000000');

                if (error) throw error;
                return { statusCode: 200, body: JSON.stringify({ message: 'Tous les bureaux ont été réinitialisés' }) };
            } else if (action === 'edit') {
                const { numero, nom, pin, inscrits } = body;
                if (!id || !numero || !nom || !pin || pin.length !== 4) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Données invalides pour la modification' }) };
                }

                // Vérification unicité Numéro (exclure l'actuel)
                const { data: existing, error: checkError } = await supabase
                    .from('bureaux')
                    .select('id, numero')
                    .eq('numero', numero);
                if (checkError) throw checkError;
                const conflicts = existing.filter(b => b.id !== id);
                if (conflicts.length > 0) {
                    return { statusCode: 400, body: JSON.stringify({ error: `Un bureau avec ce Numéro existe déjà` }) };
                }

                const inscritsValue = parseInt(inscrits) || 0;

                const { data, error } = await supabase
                    .from('bureaux')
                    .update({ numero, nom, pin, inscrits: inscritsValue })
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

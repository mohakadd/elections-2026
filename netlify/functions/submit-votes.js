const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { bureauId, pin, blancs, nuls, total_votants, votes_candidats } = JSON.parse(event.body);

        if (!bureauId || !pin || blancs == null || nuls == null || !total_votants || !votes_candidats) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Données manquantes' }) };
        }

        // Calcul du total des voix attribuées aux candidats
        let totalVoixCandidats = 0;
        for (const candidatId in votes_candidats) {
            totalVoixCandidats += parseInt(votes_candidats[candidatId]);
        }

        // Contrôle backend : Votants - (Blancs + Nuls) doivent égaler les voix candidatées
        const suffragesExprimes = parseInt(total_votants) - parseInt(blancs) - parseInt(nuls);
        if (totalVoixCandidats !== suffragesExprimes) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Problème de cohérence : le total des voix saisies ne correspond pas aux suffrages exprimés attendus.' }) };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Vérifier les identifiants et si le bureau a déjà voté
        const { data: bureau, error: authError } = await supabase
            .from('bureaux')
            .select('*')
            .eq('id', bureauId)
            .eq('pin', pin)
            .single();

        if (authError || !bureau) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Identifiants incorrects' }) };
        }

        if (bureau.a_vote) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Ce bureau a déjà transmis ses résultats' }) };
        }

        const inscritsDuBureau = bureau.inscrits || 0;
        // On ne bloque que si Inscrits est renseigné (> 0) et que Votants le dépasse.
        if (inscritsDuBureau > 0 && parseInt(total_votants) > inscritsDuBureau) {
            return { statusCode: 400, body: JSON.stringify({ error: `Incohérence : Le nombre de votants (${total_votants}) ne peut pas être supérieur au nombre d'inscrits du bureau (${inscritsDuBureau}).` }) };
        }

        // Insérer le résultat global avec les compteurs
        const { data: resultat, error: insertError } = await supabase
            .from('resultats')
            .insert([{
                bureau_id: bureauId,
                blancs: parseInt(blancs),
                nuls: parseInt(nuls),
                total_votants: parseInt(total_votants),
                total_inscrits: inscritsDuBureau
            }])
            .select()
            .single();

        if (insertError) {
            console.error("Erreur lors de l'insertion du résultat db:", insertError);
            throw insertError;
        }

        // Préparer & Insérer toutes les lignes pour les voix des candidats dynamiques
        const votesToInsert = [];
        for (const candidatId in votes_candidats) {
            votesToInsert.push({
                resultat_id: resultat.id,
                candidat_id: candidatId,
                voix: parseInt(votes_candidats[candidatId])
            });
        }

        if (votesToInsert.length > 0) {
            const { error: votesError } = await supabase.from('votes_candidats').insert(votesToInsert);
            if (votesError) throw votesError;
        }

        // Mettre à jour le statut du bureau
        const { error: updateError } = await supabase
            .from('bureaux')
            .update({ a_vote: true })
            .eq('nom', nom);

        if (updateError) {
            throw updateError;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Résultats transmis avec succès' })
        };
    } catch (error) {
        console.error("Erreur globale :", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur', details: error.message }) };
    }
};

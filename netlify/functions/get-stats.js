const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const authHeader = event.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Accès non autorisé : Mot de passe incorrect' }) };
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Récupérer tous les bureaux
        const { data: bureaux, error: bureauxError } = await supabase
            .from('bureaux')
            .select('*')
            .order('nom');

        if (bureauxError) throw bureauxError;

        // Récupérer tous les candidats
        const { data: candidats, error: candidatsError } = await supabase
            .from('candidats')
            .select('*')
            .order('nom');

        if (candidatsError) throw candidatsError;

        // Récupérer tous les résultats globaux (pour Blancs, Nuls, Votants, Inscrits)
        const { data: resultats, error: resultatsError } = await supabase
            .from('resultats')
            .select('*');

        if (resultatsError) throw resultatsError;

        // Récupérer tous les votes détaillés des candidats
        const { data: votesCandidats, error: votesError } = await supabase
            .from('votes_candidats')
            .select('*');

        if (votesError) throw votesError;

        // Calculer les statistiques globales
        let totalBlancs = 0;
        let totalNuls = 0;
        let totalVotants = 0;
        let totalInscritsGlobals = 0;

        resultats.forEach(res => {
            totalBlancs += res.blancs;
            totalNuls += res.nuls;
            totalVotants += res.total_votants;
        });

        // Le total des inscrits de l'élection est la somme des inscrits des bureaux dépouillés (qui ont voté)
        bureaux.filter(b => b.a_vote).forEach(b => {
            totalInscritsGlobals += (b.inscrits || 0);
        });

        // Agréger les votes par candidat (Global)
        const resultatsCandidats = candidats.map(c => {
            const votesPourCeCandidat = votesCandidats
                .filter(v => v.candidat_id === c.id)
                .reduce((acc, v) => acc + v.voix, 0);

            return {
                id: c.id,
                nom: c.nom,
                couleur: c.couleur,
                voix: votesPourCeCandidat
            };
        });

        // participation optionnelle si total_inscritsGlobals est renseigné
        const participation = totalInscritsGlobals > 0 ? ((totalVotants / totalInscritsGlobals) * 100).toFixed(2) : 0;

        // --- NOUVEAU : Agrégation par Bureau ---
        const statsParBureau = {};
        bureaux.forEach(bureau => {
            // Trouver le résultat pour ce bureau
            const resBureau = resultats.find(r => r.bureau_id === bureau.id);

            if (resBureau) {
                // S'il y a un résultat, on calcule ses stats en utilisant le nombre d'inscrits du bureau
                const inscritsBureau = bureau.inscrits || 0;

                const stat = {
                    totalBlancs: resBureau.blancs,
                    totalNuls: resBureau.nuls,
                    totalVotants: resBureau.total_votants,
                    totalInscritsGlobals: inscritsBureau,
                    participation: inscritsBureau > 0 ? ((resBureau.total_votants / inscritsBureau) * 100).toFixed(2) : 0,
                    candidats: []
                };

                // Votes pour ce bureau spécifique
                stat.candidats = candidats.map(c => {
                    const voteLigne = votesCandidats.find(v => v.resultat_id === resBureau.id && v.candidat_id === c.id);
                    return {
                        id: c.id,
                        nom: c.nom,
                        couleur: c.couleur,
                        voix: voteLigne ? voteLigne.voix : 0
                    };
                });

                statsParBureau[bureau.id] = stat;
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                stats: {
                    global: {
                        candidats: resultatsCandidats,
                        totalBlancs,
                        totalNuls,
                        totalVotants,
                        totalInscritsGlobals,
                        participation
                    },
                    parBureau: statsParBureau
                },
                bureaux
            })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
    }
};

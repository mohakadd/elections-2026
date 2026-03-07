const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { nom, pin } = JSON.parse(event.body);

    if (!nom || !pin) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nom et PIN requis' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: bureau, error } = await supabase
      .from('bureaux')
      .select('*')
      .eq('nom', nom)
      .eq('pin', pin)
      .single();

    if (error || !bureau) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Identifiants incorrects' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Authentification réussie',
        bureau: { nom: bureau.nom, a_vote: bureau.a_vote }
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

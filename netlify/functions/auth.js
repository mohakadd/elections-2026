const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { bureauId, pin } = JSON.parse(event.body);

    if (!bureauId || !pin) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Bureau ID et PIN requis' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: bureau, error } = await supabase
      .from('bureaux')
      .select('*')
      .eq('id', bureauId)
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
        bureau: { id: bureau.id, numero: bureau.numero, nom: bureau.nom, a_vote: bureau.a_vote, inscrits: bureau.inscrits }
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};

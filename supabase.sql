-- Supabase Schema V2 : Gestion dynamique des candidats

-- Nettoyage optionnel (à décommenter si vous repartez de zéro sur une base de test)
-- DROP TABLE IF EXISTS public.votes_candidats;
-- DROP TABLE IF EXISTS public.resultats;
-- DROP TABLE IF EXISTS public.candidats;
-- DROP TABLE IF EXISTS public.bureaux;

-- 1. Table 'bureaux' (Inchangée structurellement, ajout d'inscrits)
CREATE TABLE IF NOT EXISTS public.bureaux (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text UNIQUE NOT NULL,
  nom text NOT NULL,
  pin text NOT NULL,
  inscrits integer NOT NULL DEFAULT 0,
  a_vote boolean DEFAULT false
);

-- 2. Table 'candidats' (NOUVEAU)
CREATE TABLE IF NOT EXISTS public.candidats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom text UNIQUE NOT NULL,
  couleur text NOT NULL DEFAULT '#000000'
);

-- 3. Table 'resultats' (MODIFIEE : Suppression de voix_a/voix_b, séparation blancs/nuls)
CREATE TABLE IF NOT EXISTS public.resultats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bureau_id uuid NOT NULL REFERENCES public.bureaux(id) ON DELETE CASCADE,
  blancs integer NOT NULL DEFAULT 0,
  nuls integer NOT NULL DEFAULT 0,
  total_votants integer NOT NULL, -- Émargements
  total_inscrits integer NOT NULL DEFAULT 0, -- Optionnel si vous ne voulez que les votants
  date_envoi timestamp with time zone DEFAULT now()
);

-- 4. Table de liaison 'votes_candidats' (NOUVEAU)
CREATE TABLE IF NOT EXISTS public.votes_candidats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resultat_id uuid NOT NULL REFERENCES public.resultats(id) ON DELETE CASCADE,
  candidat_id uuid NOT NULL REFERENCES public.candidats(id) ON DELETE CASCADE,
  voix integer NOT NULL DEFAULT 0
);

-- Sécurité RLS
ALTER TABLE public.bureaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes_candidats ENABLE ROW LEVEL SECURITY;

import { createClient } from '@supabase/supabase-js';

// Chave "publishable": é pública por design; a segurança dos dados
// é garantida pelas políticas de RLS no banco.
export const supabase = createClient(
  'https://ogwepzrwmywnubfgndpn.supabase.co',
  'sb_publishable_BwBpKV4-yCeQhYVuJ52STw_8kBaFr7u'
);

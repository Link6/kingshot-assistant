import {createHandler} from './handler.mjs';
Deno.serve(createHandler({
  url:Deno.env.get('SUPABASE_URL'),
  publishableKey:Deno.env.get('SUPABASE_ANON_KEY'),
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  guildId:'1409235905629130915'
}));

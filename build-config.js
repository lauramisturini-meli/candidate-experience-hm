/**
 * Gera config.js a partir das Environment Variables do Vercel.
 * Rodado automaticamente pelo Vercel via script "vercel-build" do package.json.
 *
 * Environment Variables esperadas (configurar no Vercel dashboard):
 *   SUPABASE_URL   — ex: https://xxxxx.supabase.co
 *   SUPABASE_ANON  — chave anon public do projeto
 */
const fs = require('fs');
const path = require('path');

const url  = process.env.SUPABASE_URL  || '';
const anon = process.env.SUPABASE_ANON || '';

if (!url || !anon) {
  console.warn('[build-config] ⚠️  SUPABASE_URL ou SUPABASE_ANON não definidas nas env vars do Vercel.');
  console.warn('[build-config] O dashboard vai carregar, mas o botão "Copiar link" não vai funcionar.');
}

const content = `/* Gerado automaticamente pelo build do Vercel — não editar. */
window.__CONFIG__ = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON: anon }, null, 2)};
`;

const outPath = path.join(__dirname, 'config.js');
fs.writeFileSync(outPath, content);
console.log(`[build-config] ✓ config.js gerado em ${outPath}`);
console.log(`[build-config]   SUPABASE_URL:  ${url ? url.slice(0, 30) + '...' : '(vazio)'}`);
console.log(`[build-config]   SUPABASE_ANON: ${anon ? anon.slice(0, 20) + '...' : '(vazio)'}`);

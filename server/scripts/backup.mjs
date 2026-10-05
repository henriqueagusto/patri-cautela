// Cópia de segurança do PATRI: banco + fotos + configuração.
//
//   npm run backup                 cópia manual (nunca é apagada sozinha)
//   npm run backup -- --auto       cópia automática (mantém só as mais recentes)
//   npm run backup -- --destino D:/pendrive
//   npm run backup -- --tipo antes-de-atualizar
//
// Só LÊ o banco (pg_dump). Não altera nem apaga nenhum dado do sistema.
import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARQUIVO_ENV, argumento, banco, carimbo, conexao, configuracao, executar, falhar,
  ferramentaPg, tamanhoLegivel, temArgumento,
} from './lib.mjs';

function tamanhoDaPasta(pasta) {
  let total = 0;
  let arquivos = 0;
  if (!existsSync(pasta)) return { total, arquivos };
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) {
      const sub = tamanhoDaPasta(caminho);
      total += sub.total;
      arquivos += sub.arquivos;
    } else {
      total += statSync(caminho).size;
      arquivos += 1;
    }
  }
  return { total, arquivos };
}

/**
 * Faz a cópia. Devolve { pasta, ... } ou lança erro com mensagem legível.
 * `tipo`: 'manual' | 'auto' | rótulo livre (ex.: 'antes-de-restaurar').
 */
export function fazerBackup({ tipo = 'manual', destino, url, silencioso = false } = {}) {
  const cfg = configuracao();
  const b = banco(url || cfg.DATABASE_URL);
  const raiz = resolve(destino || cfg.backups);
  const pasta = join(raiz, `patri-${carimbo()}-${tipo}`);
  const diga = (t) => { if (!silencioso) console.log(t); };

  mkdirSync(pasta, { recursive: true });
  try {
    // 1. Banco — formato próprio do PostgreSQL, compactado, restaurável com pg_restore.
    const dump = join(pasta, 'banco.dump');
    const c = conexao(b);
    diga(`Copiando o banco "${b.nome}"…`);
    const r = executar(ferramentaPg('pg_dump'), [...c.args, '-Fc', '--no-owner', '--no-acl', '-f', dump], { env: c.env });
    if (!r.ok) throw new Error(`pg_dump falhou: ${r.erro}`);

    // Confere se o arquivo gerado é legível antes de considerar a cópia boa.
    const lista = executar(ferramentaPg('pg_restore'), ['--list', dump]);
    if (!lista.ok || statSync(dump).size === 0) throw new Error(`A cópia do banco não pôde ser verificada: ${lista.erro}`);
    const tabelas = lista.saida.split('\n').filter((l) => / TABLE DATA /.test(l)).length;

    // 2. Fotos.
    let fotos = { total: 0, arquivos: 0 };
    if (existsSync(cfg.uploads)) {
      diga('Copiando as fotos…');
      cpSync(cfg.uploads, join(pasta, 'uploads'), { recursive: true });
      fotos = tamanhoDaPasta(join(pasta, 'uploads'));
    }

    // 3. Configuração (contém a senha do banco e o segredo de login: guarde com cuidado).
    if (existsSync(ARQUIVO_ENV)) copyFileSync(ARQUIVO_ENV, join(pasta, 'env.txt'));

    const info = {
      criadoEm: new Date().toISOString(),
      tipo,
      banco: { nome: b.nome, host: b.host, tabelasComDados: tabelas, bytes: statSync(dump).size },
      fotos,
    };
    writeFileSync(join(pasta, 'info.json'), JSON.stringify(info, null, 2));

    diga(`\nBackup concluído: ${pasta}`);
    diga(`  banco: ${tamanhoLegivel(info.banco.bytes)} (${tabelas} tabelas)   fotos: ${fotos.arquivos} arquivo(s), ${tamanhoLegivel(fotos.total)}\n`);
    if (tipo === 'auto') limparAntigos(raiz, cfg.manterBackups, diga);
    return { pasta, ...info };
  } catch (erro) {
    // Cópia incompleta não fica parecendo backup válido.
    rmSync(pasta, { recursive: true, force: true });
    throw erro;
  }
}

/** Remove as cópias AUTOMÁTICAS mais antigas. Manuais e de segurança nunca são apagadas. */
function limparAntigos(raiz, manter, diga) {
  const automaticos = readdirSync(raiz)
    .filter((n) => /^patri-\d{4}-\d{2}-\d{2}_\d{6}-auto$/.test(n))
    .sort()
    .reverse();
  for (const antigo of automaticos.slice(manter)) {
    rmSync(join(raiz, antigo), { recursive: true, force: true });
    diga(`  (removida cópia automática antiga: ${antigo})`);
  }
}

/** Data da cópia mais recente, de qualquer tipo. */
export function ultimoBackup(raiz = configuracao().backups) {
  if (!existsSync(raiz)) return undefined;
  const nomes = readdirSync(raiz).filter((n) => /^patri-\d{4}-\d{2}-\d{2}_\d{6}-/.test(n) && existsSync(join(raiz, n, 'banco.dump'))).sort();
  const ultimo = nomes.at(-1);
  return ultimo ? { nome: ultimo, pasta: join(raiz, ultimo), quando: statSync(join(raiz, ultimo, 'banco.dump')).mtime } : undefined;
}

// Executado direto: `node scripts/backup.mjs`
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // --tipo: rótulo livre no nome da pasta (ex.: antes-de-atualizar). Só "auto" é apagado sozinho.
    const rotulo = (argumento('tipo') || '').replace(/[^a-z0-9-]/gi, '') || (temArgumento('auto') ? 'auto' : 'manual');
    fazerBackup({ tipo: rotulo, destino: argumento('destino') || undefined });
  } catch (erro) {
    falhar(erro.message);
  }
}

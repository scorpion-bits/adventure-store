// Confere o conteúdo de src/data: ids únicos, referências válidas e metas de quantidade.
// Uso:  npm run validate            -> só erros (referência quebrada, id repetido...)
//       npm run validate -- --metas -> também falha se alguma meta de conteúdo não foi atingida
import { DATA } from '../src/data/index.js';

export function validar(data = DATA) {
  const erros = [];
  const { meta, listas } = data;
  const ids = (lista) => new Set(lista.map((x) => x.id));
  const cats = ids(meta.categorias);
  const rars = ids(meta.raridades);
  const temps = ids(meta.temperamentos);
  const classes = ids(meta.classes);
  const oficios = ids(meta.oficios);
  const regioes = ids(listas.regioes);
  const itens = ids(listas.itens);
  const materiais = ids(listas.materiais);

  // ids únicos dentro de cada lista (e itens x materiais não podem repetir id: viram chaves no mesmo estoque)
  for (const [nome, lista] of Object.entries({ ...listas, ...Object.fromEntries(['categorias', 'raridades', 'qualidades', 'temperamentos', 'classes', 'oficios'].map((k) => [k, meta[k]])) })) {
    const visto = new Set();
    for (const x of lista) {
      if (!x.id || typeof x.id !== 'string') erros.push(`${nome}: entrada sem id (${JSON.stringify(x).slice(0, 60)})`);
      else if (visto.has(x.id)) erros.push(`${nome}: id repetido "${x.id}"`);
      visto.add(x.id);
    }
  }
  for (const id of itens) if (materiais.has(id)) erros.push(`id "${id}" existe como item e como material`);

  const exige = (cond, msg) => { if (!cond) erros.push(msg); };

  for (const it of listas.itens) {
    exige(typeof it.nome === 'string' && it.nome, `item ${it.id}: sem nome`);
    exige(cats.has(it.cat), `item ${it.id}: categoria inválida "${it.cat}"`);
    exige(rars.has(it.raridade), `item ${it.id}: raridade inválida "${it.raridade}"`);
    exige(it.valor > 0, `item ${it.id}: valor deve ser > 0`);
  }
  for (const m of listas.materiais) {
    exige(m.valor > 0, `material ${m.id}: valor deve ser > 0`);
    exige(regioes.has(m.regiao), `material ${m.id}: região inválida "${m.regiao}"`);
  }
  for (const r of listas.receitas) {
    exige(itens.has(r.item), `receita ${r.id}: item inexistente "${r.item}"`);
    exige(oficios.has(r.oficio), `receita ${r.id}: ofício inválido "${r.oficio}"`);
    exige(r.tempo > 0, `receita ${r.id}: tempo deve ser > 0`);
    exige(r.nivel >= 1, `receita ${r.id}: nivel deve ser >= 1`);
    const mats = Object.entries(r.materiais ?? {});
    exige(mats.length > 0, `receita ${r.id}: sem materiais`);
    for (const [m, q] of mats) {
      exige(materiais.has(m), `receita ${r.id}: material inexistente "${m}"`);
      exige(q > 0, `receita ${r.id}: quantidade de "${m}" deve ser > 0`);
    }
  }
  for (const a of listas.aventureiros) {
    exige(classes.has(a.classe), `aventureiro ${a.id}: classe inválida "${a.classe}"`);
    exige(temps.has(a.temperamento), `aventureiro ${a.id}: temperamento inválido "${a.temperamento}"`);
    exige(regioes.has(a.regiao), `aventureiro ${a.id}: região inválida "${a.regiao}"`);
    exige(a.orcamento > 0, `aventureiro ${a.id}: orcamento deve ser > 0`);
    exige(Array.isArray(a.prefere) && a.prefere.length > 0 && a.prefere.every((c) => cats.has(c)), `aventureiro ${a.id}: "prefere" precisa listar categorias válidas`);
    for (const k of ['chega', 'compra', 'recusa']) {
      exige(Array.isArray(a.falas?.[k]) && a.falas[k].length > 0, `aventureiro ${a.id}: faltam falas "${k}"`);
    }
  }
  for (const f of listas.fornecedores) {
    exige(regioes.has(f.regiao), `fornecedor ${f.id}: região inválida "${f.regiao}"`);
    for (const v of f.vende ?? []) {
      exige(materiais.has(v.material) || itens.has(v.material), `fornecedor ${f.id}: "${v.material}" não existe`);
      exige(v.preco > 0 && v.estoque > 0, `fornecedor ${f.id}: preco e estoque de "${v.material}" devem ser > 0`);
    }
  }
  for (const id of Object.keys(data.icones)) {
    exige(itens.has(id) || materiais.has(id), `icones: "${id}" não é item nem material`);
  }

  // cada categoria precisa ter ao menos um item (senão "pedido por categoria" trava)
  for (const c of meta.categorias) exige(listas.itens.some((i) => i.cat === c.id), `categoria "${c.id}" não tem nenhum item`);

  // ---------- metas de conteúdo ----------
  const m = meta.metas;
  const contagens = {
    itens: [listas.itens.length, m.itens],
    receitas: [listas.receitas.length, m.receitas],
    aventureiros: [listas.aventureiros.length, m.aventureiros],
    regioes: [listas.regioes.length, m.regioes],
    fornecedores: [listas.fornecedores.length, m.fornecedores],
  };
  const faltas = Object.entries(contagens).filter(([, [n, meta_]]) => n < meta_).map(([k, [n, meta_]]) => `${k}: ${n}/${meta_}`);
  return { erros, contagens, faltas };
}

// executado direto (não importado pelos testes)
if (import.meta.url === `file://${process.argv[1]}`) {
  const { erros, contagens, faltas } = validar();
  console.log('Conteúdo:', Object.entries(contagens).map(([k, [n, meta]]) => `${k} ${n}/${meta}`).join(' · '));
  if (erros.length) {
    console.error(`\n${erros.length} erro(s):\n- ${erros.join('\n- ')}`);
    process.exit(1);
  }
  if (process.argv.includes('--metas') && faltas.length) {
    console.error(`\nMetas não atingidas: ${faltas.join(', ')}`);
    process.exit(1);
  }
  console.log('Dados válidos.');
}

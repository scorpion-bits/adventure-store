// Confere o conteúdo de src/data: ids únicos, referências válidas e metas de quantidade.
// Uso:  npm run validate            -> só erros (referência quebrada, id repetido...)
//       npm run validate -- --metas -> também falha se alguma meta de conteúdo não foi atingida
import { DATA } from '../src/data/index.js';
import { EFEITOS } from '../src/core/mods.js';

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
    exige(r.nivel >= 1 && r.nivel <= meta.oficina.nivelMax, `receita ${r.id}: nivel deve ficar entre 1 e ${meta.oficina.nivelMax}`);
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
    exige(Array.isArray(a.falas?.chega) && a.falas.chega.length > 0, `aventureiro ${a.id}: faltam falas "chega"`);
    for (const k of ['compra', 'recusa']) {
      const t = meta.temperamentos.find((x) => x.id === a.temperamento);
      exige((a.falas?.[k]?.length ?? 0) > 0 || (t?.falas?.[k]?.length ?? 0) > 0, `aventureiro ${a.id}: sem falas "${k}" (nem próprias, nem do temperamento)`);
    }
  }
  // cada temperamento precisa das quatro listas de frases genéricas (a base de quem não tem as suas)
  for (const t of meta.temperamentos) for (const k of ['compra', 'recusa', 'barato', 'caro']) exige(t.falas?.[k]?.length >= 2, `temperamento ${t.id}: faltam falas "${k}" (pelo menos 2)`);
  for (const r of listas.regioes) exige(r.valorMin >= 0 && r.valorMax > r.valorMin, `região ${r.id}: faixa de valor inválida`);

  for (const f of listas.fornecedores) {
    exige(regioes.has(f.regiao), `fornecedor ${f.id}: região inválida "${f.regiao}"`);
    for (const v of f.vende ?? []) {
      exige(materiais.has(v.material) || itens.has(v.material), `fornecedor ${f.id}: "${v.material}" não existe`);
      exige(v.preco > 0 && v.estoque > 0, `fornecedor ${f.id}: preco e estoque de "${v.material}" devem ser > 0`);
    }
  }
  // toda receita precisa ser possível: cada material dela é vendido por algum fornecedor, e nenhum material fica sem uso nem sem venda
  const vendidos = new Set(listas.fornecedores.flatMap((f) => f.vende.map((v) => v.material)));
  const usados = new Set(listas.receitas.flatMap((r) => Object.keys(r.materiais)));
  for (const m of usados) exige(vendidos.has(m) || !materiais.has(m), `material "${m}" é usado em receitas mas nenhum fornecedor o vende`);
  for (const m of materiais) exige(vendidos.has(m) || usados.has(m), `material "${m}" não é vendido nem usado: sobrou`);
  // o ofício de cada item craftável: itens sem receita só chegam por fornecedores (ou eventos)
  const craftaveis = new Set(listas.receitas.map((r) => r.item));
  const semOrigem = listas.itens.filter((i) => !craftaveis.has(i.id) && !vendidos.has(i.id) && i.id !== 'ovo_dragao');
  for (const i of semOrigem) exige(false, `item "${i.id}" não tem receita nem fornecedor`);

  // todo item e material tem ícone, e cada ícone é de um só (assim a prateleira não confunde um item com outro)
  for (const id of [...itens, ...materiais]) exige(data.icones[id], `"${id}" está sem ícone em data/icones.js`);
  const porIcone = {};
  for (const [id, q] of Object.entries(data.icones)) (porIcone[q] ??= []).push(id);
  for (const [q, lista] of Object.entries(porIcone)) exige(lista.length === 1, `o ícone ${q} está em uso por ${lista.join(', ')}`);

  for (const id of Object.keys(data.icones)) {
    exige(itens.has(id) || materiais.has(id), `icones: "${id}" não é item nem material`);
  }

  // melhorias, equipe e decoração: efeitos conhecidos, requisitos existentes e custos válidos
  const melhorias = ids(listas.melhorias);
  const conferirEfeitos = (dono, efeitos) => {
    for (const e of efeitos ?? []) {
      exige(EFEITOS[e.tipo], `${dono}: efeito desconhecido "${e.tipo}"`);
      if (['slots', 'velocidade', 'filaOficina', 'qualidadeOficio', 'rendimento'].includes(e.tipo)) exige(oficios.has(e.oficio), `${dono}: efeito "${e.tipo}" com ofício inválido "${e.oficio}"`);
    }
  };
  for (const m of listas.melhorias) {
    exige(m.custo > 0, `melhoria ${m.id}: custo deve ser > 0`);
    exige(m.grupo === 'loja' || oficios.has(m.grupo), `melhoria ${m.id}: grupo inválido "${m.grupo}"`);
    exige((m.efeitos ?? []).length > 0, `melhoria ${m.id}: sem efeitos`);
    for (const r of m.requer ?? []) exige(melhorias.has(r) && r !== m.id, `melhoria ${m.id}: requer "${r}" que não existe`);
    conferirEfeitos(`melhoria ${m.id}`, m.efeitos);
  }
  for (const f of listas.equipe) {
    exige(f.niveis?.length > 0, `equipe ${f.id}: sem níveis`);
    f.niveis.forEach((n, i) => { exige(n.custo > 0, `equipe ${f.id} nível ${i + 1}: custo deve ser > 0`); conferirEfeitos(`equipe ${f.id} nível ${i + 1}`, n.efeitos); });
  }
  for (const d of listas.decoracoes) {
    for (const c of ['parede', 'piso', 'balcao', 'prateleira']) exige(Number.isInteger(d.cores?.[c]), `decoração ${d.id}: falta a cor "${c}"`);
    conferirEfeitos(`decoração ${d.id}`, d.efeitos);
  }
  exige(data.decoracoes.rustico?.custo === 0, 'a decoração "rustico" (padrão, grátis) precisa existir');

  // ofícios: o primeiro vem aberto de graça (senão o jogo começa sem como produzir) e todos têm custo e reputação
  exige(meta.oficios[0].custo === 0, 'o primeiro ofício precisa ser grátis (vem aberto no início)');
  for (const o of meta.oficios) exige(o.custo >= 0 && o.nivelRep >= 1, `ofício ${o.id}: custo e nivelRep inválidos`);

  // cada categoria precisa ter ao menos um item (senão "pedido por categoria" trava)
  for (const c of meta.categorias) exige(listas.itens.some((i) => i.cat === c.id), `categoria "${c.id}" não tem nenhum item`);

  // ---------- metas de conteúdo ----------
  const m = meta.metas;
  const contagens = {
    itens: [listas.itens.length, m.itens],
    receitas: [listas.receitas.length, m.receitas],
    aventureiros: [listas.aventureiros.length, m.aventureiros],
    // menor número de aventureiros por classe e por região (variedade)
    porClasse: [Math.min(...meta.classes.map((c) => listas.aventureiros.filter((a) => a.classe === c.id).length)), 5],
    porRegiao: [Math.min(...listas.regioes.map((r) => listas.aventureiros.filter((a) => a.regiao === r.id).length)), 6],
    regioes: [listas.regioes.length, m.regioes],
    fornecedores: [listas.fornecedores.length, m.fornecedores],
    // a menor quantidade de melhorias entre os ofícios
    melhoriasPorOficio: [Math.min(...meta.oficios.map((o) => listas.melhorias.filter((x) => x.grupo === o.id).length)), m.melhoriasPorOficio],
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

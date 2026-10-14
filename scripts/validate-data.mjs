// Confere o conteúdo de src/data: ids únicos, referências válidas e metas de quantidade.
// Uso:  npm run validate            -> só erros (referência quebrada, id repetido...)
//       npm run validate -- --metas -> também falha se alguma meta de conteúdo não foi atingida
import { readFileSync } from 'node:fs';
import { DATA } from '../src/data/index.js';
import { EFEITOS } from '../src/core/mods.js';
import { TIPOS_DE_EFEITO } from '../src/core/events.js';
import { defaultState } from '../src/core/state.js';
import { MEDIDAS } from '../src/core/achievements.js';

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
  for (const r of listas.regioes) {
    exige(r.valorMin >= 0 && r.valorMax > r.valorMin, `região ${r.id}: faixa de valor inválida`);
    exige(listas.materiais.some((x) => x.regiao === r.id), `região ${r.id}: nenhum material nela (as expedições não trariam nada)`);
    for (const d of r.drops ?? []) exige(itens.has(d.item) && d.chance > 0 && d.chance <= 1, `região ${r.id}: drop inválido "${d.item}"`);
  }
  for (const t of meta.expedicoes.tiers) exige(t.minutos > 0 && t.unidades > 0 && t.eficiencia > 1, `expedição ${t.id}: valores inválidos (eficiência deve ser > 1 para valer a pena)`);

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

  // um efeito de evento/recompensa (veja core/events.js): tipo conhecido e referências existentes
  const conferirEfeitoEvento = (onde, ef) => {
    exige(TIPOS_DE_EFEITO.includes(ef.tipo), `${onde}: efeito desconhecido "${ef.tipo}"`);
    if (ef.tipo === 'material') exige(materiais.has(ef.id), `${onde}: material inexistente "${ef.id}"`);
    if (ef.tipo === 'item') exige(itens.has(ef.id), `${onde}: item inexistente "${ef.id}"`);
    if (ef.tipo === 'itemAleatorio') exige(cats.has(ef.cat), `${onde}: categoria inválida "${ef.cat}"`);
    if (ef.tipo === 'materialAleatorio') exige(regioes.has(ef.regiao), `${onde}: região inválida "${ef.regiao}"`);
    if (ef.tipo === 'xpOficio') exige(oficios.has(ef.oficio), `${onde}: ofício inválido "${ef.oficio}"`);
    if (ef.tipo === 'cliente') exige(listas.aventureiros.some((a) => a.id === ef.adv), `${onde}: aventureiro inexistente "${ef.adv}"`);
    if (ef.tipo === 'bonus') { exige(EFEITOS[ef.efeito?.tipo] && ef.minutos > 0 && ef.rotulo, `${onde}: bônus inválido`); }
  };

  // eventos: textos, requisitos, escolhas e efeitos válidos
  for (const ev of listas.eventos) {
    const dono = `evento ${ev.id}`;
    exige(ev.titulo && ev.texto && ev.texto.length > 30, `${dono}: título e texto (30+ caracteres) são obrigatórios`);
    exige(ev.peso > 0, `${dono}: peso deve ser > 0`);
    exige(!ev.requer?.regiao || regioes.has(ev.requer.regiao), `${dono}: região inválida "${ev.requer?.regiao}"`);
    exige(ev.escolhas?.length >= 1 && ev.escolhas.length <= 3, `${dono}: precisa de 1 a 3 escolhas`);
    for (const [i, c] of (ev.escolhas ?? []).entries()) {
      const onde = `${dono} escolha ${i + 1}`;
      exige(c.rotulo && c.resultados?.length >= 1, `${onde}: rótulo e resultados são obrigatórios`);
      exige(!c.custo || c.custo > 0, `${onde}: custo deve ser > 0`);
      for (const r of c.resultados ?? []) {
        exige(r.texto && r.texto.length > 8, `${onde}: resultado sem texto`);
        for (const ef of r.efeitos ?? []) {
          conferirEfeitoEvento(onde, ef);
        }
      }
    }
  }

  // lendários: cada um é um aventureiro (peso 0, lendario: true) com 3+ capítulos que pedem itens que dá para obter
  const lendas = new Set(listas.lendarios.map((l) => l.id));
  for (const a of listas.aventureiros) {
    if (a.lendario) exige(lendas.has(a.id) && a.peso === 0, `aventureiro lendário ${a.id}: precisa de peso 0 e de uma entrada em data/lendarios.js`);
    else exige(a.peso > 0, `aventureiro ${a.id}: peso deve ser > 0 (só lendários têm peso 0)`);
  }
  for (const l of listas.lendarios) {
    const dono = `lendário ${l.id}`;
    exige(listas.aventureiros.some((a) => a.id === l.id && a.lendario), `${dono}: falta o aventureiro com lendario: true`);
    exige(l.titulo && l.resumo, `${dono}: título e resumo são obrigatórios`);
    const nomeAdv = listas.aventureiros.find((a) => a.id === l.id)?.nome ?? '';
    exige(!nomeAdv || !l.titulo?.includes(nomeAdv), `${dono}: o título não pode repetir o nome ("${l.titulo}")`);
    exige(l.capitulos?.length >= 3, `${dono}: precisa de pelo menos 3 capítulos`);
    let nivelAnterior = 0;
    for (const [i, c] of (l.capitulos ?? []).entries()) {
      const onde = `${dono} capítulo ${i + 1}`;
      exige(c.titulo && c.texto?.length >= 80, `${onde}: título e texto (80+ caracteres) são obrigatórios`);
      exige(itens.has(c.pedido?.item), `${onde}: item pedido inexistente "${c.pedido?.item}"`);
      exige(craftaveis.has(c.pedido?.item) || vendidos.has(c.pedido?.item), `${onde}: o item pedido "${c.pedido?.item}" não dá para obter`);
      exige((c.pedido?.qualidadeMin ?? 0) >= 0 && (c.pedido?.qualidadeMin ?? 0) < meta.qualidades.length, `${onde}: qualidadeMin inválida`);
      exige(c.nivelRep >= nivelAnterior, `${onde}: a reputação exigida não pode cair`);
      nivelAnterior = c.nivelRep ?? 0;
      exige(c.recompensa?.length > 0, `${onde}: sem recompensa`);
      for (const ef of c.recompensa ?? []) conferirEfeitoEvento(onde, ef);
    }
  }

  // retenção: eventos sazonais, encomendas diárias e metas semanais
  for (const sz of listas.sazonais) {
    const dono = `sazonal ${sz.id}`;
    for (const k of ['de', 'ate']) exige(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(sz[k] ?? ''), `${dono}: "${k}" precisa estar no formato MM-DD`);
    exige(sz.nome && sz.desc?.length > 20, `${dono}: nome e descrição são obrigatórios`);
    conferirEfeitos(dono, sz.efeitos);
    exige(sz.efeitos?.length > 0, `${dono}: sem efeitos`);
  }
  const estatisticas = Object.keys(defaultState(0).stats);
  for (const m of data.semanal.metas) {
    exige(estatisticas.includes(m.stat), `meta semanal ${m.id}: o contador "${m.stat}" não existe em state.stats`);
    exige(m.texto?.includes('{n}') && m.base > 0, `meta semanal ${m.id}: texto com {n} e base > 0`);
  }
  exige(data.semanal.quantas <= data.semanal.metas.length, 'metas semanais: "quantas" passa do tamanho do pool');
  exige(data.diario.faixas[0] === 1 && data.diario.faixas.every((n, i, a) => i === 0 || n > a[i - 1]), 'diário: as faixas precisam começar em 1 e crescer');

  // herança (prestígio): efeitos válidos e custos que não caem de um nível para o outro
  for (const h of listas.heranca) {
    const dono = `herança ${h.id}`;
    exige(h.nome && h.desc && h.niveis?.length >= 1, `${dono}: nome, descrição e pelo menos 1 nível`);
    h.niveis.forEach((n, i) => {
      exige(n.custo >= 1 && (i === 0 || n.custo >= h.niveis[i - 1].custo), `${dono} nível ${i + 1}: custo inválido ou menor que o do nível anterior`);
      conferirEfeitos(`${dono} nível ${i + 1}`, n.efeitos);
    });
  }
  exige(listas.heranca.length === 0 || data.cidades.length >= 3, 'cidades: precisa de pelo menos 3 nomes');

  // conquistas: medida conhecida, argumento válido, meta e prêmio sensatos
  const argumentos = {
    categoria: new Set(meta.categorias.map((c) => c.id)), classe: new Set(meta.classes.map((c) => c.id)), raridade: new Set(meta.raridades.map((r) => r.id)),
  };
  for (const c of listas.conquistas) {
    const dono = `conquista ${c.id}`;
    exige(c.nome && c.desc, `${dono}: nome e descrição são obrigatórios`);
    exige(MEDIDAS[c.medida], `${dono}: medida "${c.medida}" não existe`);
    if (argumentos[c.medida]) exige(argumentos[c.medida].has(c.arg), `${dono}: argumento "${c.arg}" inválido para ${c.medida}`);
    exige(c.meta === 'todos' || c.meta > 0, `${dono}: meta inválida`);
    exige(c.ouro > 0 || c.rep > 0, `${dono}: precisa de um prêmio (ouro ou rep)`);
  }

  // ofícios: o primeiro vem aberto de graça (senão o jogo começa sem como produzir) e todos têm custo e reputação
  exige(meta.oficios[0].custo === 0, 'o primeiro ofício precisa ser grátis (vem aberto no início)');
  for (const o of meta.oficios) exige(o.custo >= 0 && o.nivelRep >= 1, `ofício ${o.id}: custo e nivelRep inválidos`);

  // cada categoria precisa ter ao menos um item (senão "pedido por categoria" trava)
  for (const c of meta.categorias) exige(listas.itens.some((i) => i.cat === c.id), `categoria "${c.id}" não tem nenhum item`);

  // retratos: o mapa só pode apontar para aventureiros que existem e para retratos que estão no atlas (gerado por `npm run pack:ninja`);
  // quem não está no mapa recebe um do pack
  const atlasRetratos = JSON.parse(readFileSync(new URL('../src/assets/retratos/retratos.json', import.meta.url), 'utf8'));
  for (const [id, chave] of Object.entries(data.retratos)) {
    exige(data.aventureiros[id], `data/retratos.js: "${id}" não é um aventureiro`);
    exige(/^[cmba]_[A-Za-z0-9]+$/.test(chave), `data/retratos.js: "${id}" tem o retrato "${chave}" (esperava a chave do pack: c_, m_, b_ ou a_ + nome da pasta, ex.: "c_Knight")`);
    exige(atlasRetratos.quadros[chave], `data/retratos.js: o retrato "${chave}" (${id}) não está no atlas: rode npm run pack:ninja`);
  }

  // loja de apoio: cada produto é válido, os temas apontam para decorações pagas e os pacotes só incluem produtos que existem
  const prods = data.apoio.produtos;
  exige(data.apoio.pix.chave && data.apoio.chavePublica?.kty === 'EC' && data.apoio.chavePublica?.crv === 'P-256', 'data/apoio.js: faltam a chave Pix e a chave pública (EC P-256)');
  for (const p of data.apoio.lista) {
    exige(p.preco > 0, `apoio ${p.id}: preço inválido`);
    exige(['sem_anuncios', 'tema', 'pacote'].includes(p.tipo), `apoio ${p.id}: tipo "${p.tipo}" desconhecido`);
    if (p.tipo === 'tema') exige(data.decoracoes[p.decoracao]?.premium === p.id, `apoio ${p.id}: a decoração "${p.decoracao}" precisa existir com premium: '${p.id}'`);
    if (p.tipo === 'pacote') for (const i of p.inclui ?? []) exige(prods[i] && prods[i].tipo !== 'pacote', `apoio ${p.id}: inclui "${i}", que não é um produto simples`);
  }
  for (const d of listas.decoracoes.filter((x) => x.premium)) {
    exige(prods[d.premium]?.decoracao === d.id, `decoração ${d.id}: o produto "${d.premium}" não existe em data/apoio.js`);
    exige((d.efeitos ?? []).length === 0 && d.custo === 0, `decoração ${d.id}: tema pago só muda a aparência (sem efeitos e sem custo em ouro)`);
  }

  // ---------- metas de conteúdo ----------
  const m = meta.metas;
  const contagens = {
    itens: [listas.itens.length, m.itens],
    eventos: [listas.eventos.length, m.eventos],
    lendarios: [listas.lendarios.length, m.lendarios],
    expedicoes: [meta.expedicoes.tiers.length, m.expedicoes],
    receitas: [listas.receitas.length, m.receitas],
    aventureiros: [listas.aventureiros.filter((a) => !a.lendario).length, m.aventureiros],
    // menor número de aventureiros por classe e por região (variedade)
    porClasse: [Math.min(...meta.classes.map((c) => listas.aventureiros.filter((a) => a.classe === c.id).length)), 8],
    porRegiao: [Math.min(...listas.regioes.map((r) => listas.aventureiros.filter((a) => a.regiao === r.id).length)), 15],
    regioes: [listas.regioes.length, m.regioes],
    fornecedores: [listas.fornecedores.length, m.fornecedores],
    conquistas: [listas.conquistas.length, m.conquistas],
    heranca: [listas.heranca.length, m.heranca],
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

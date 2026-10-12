// Prestígio: "Expandir para uma nova cidade". Ao expandir, a loja recomeça, mas o jogador ganha Herança (moeda permanente)
// e a gasta nestes bônus, que valem em todas as cidades seguintes.
// Cada bônus tem níveis; `niveis[n - 1].efeitos` é o total do bônus no nível n (os mesmos efeitos de melhorias, veja core/mods.js).
// { id, nome, desc, niveis: [{ custo (em Herança), efeitos }] }

// monta os níveis a partir dos custos e de uma função que dá o efeito do nível n (1, 2, 3...)
const escada = (custos, efeito) => custos.map((custo, i) => ({ custo, efeitos: [efeito(i + 1)] }));
const arred = (x) => Math.round(x * 1000) / 1000;

export const HERANCA = [
  { id: 'fama', nome: 'Fama herdada', desc: 'O nome da sua família abre portas: mais reputação por venda.',
    niveis: escada([1, 2, 3, 5, 8], (n) => ({ tipo: 'repGanho', valor: arred(1 + 0.05 * n) })) },
  { id: 'contatos', nome: 'Contatos nos fornecedores', desc: 'Os fornecedores lembram de você e fazem preço melhor.',
    niveis: escada([1, 2, 3, 5, 8], (n) => ({ tipo: 'compra', valor: arred(1 - 0.03 * n) })) },
  { id: 'preco', nome: 'Olho de mercador', desc: 'Você sabe quanto cada coisa vale: as vendas rendem mais ouro.',
    niveis: escada([2, 3, 5, 8, 12], (n) => ({ tipo: 'preco', valor: arred(1 + 0.03 * n) })) },
  { id: 'clientela', nome: 'Boa vizinhança', desc: 'Notícias correm: chegam mais clientes.',
    niveis: escada([1, 2, 4, 6, 10], (n) => ({ tipo: 'chegada', valor: arred(1 + 0.05 * n) })) },
  { id: 'paciencia', nome: 'Hospitalidade', desc: 'Chá e conversa na fila: os clientes esperam mais.',
    niveis: escada([1, 2, 3, 5], (n) => ({ tipo: 'paciencia', valor: arred(1 + 0.06 * n) })) },
  { id: 'prateleiras', nome: 'Prateleiras de família', desc: 'Móveis herdados que já vêm prontos: mais espaço nas prateleiras.',
    niveis: escada([1, 2, 4, 6], (n) => ({ tipo: 'capacidade', valor: 4 * n })) },
  { id: 'fila', nome: 'Salão maior', desc: 'Mais lugares na fila de clientes desde o primeiro dia.',
    niveis: escada([2, 4, 7], (n) => ({ tipo: 'fila', valor: n })) },
  { id: 'aprendizado', nome: 'Aprendizado acelerado', desc: 'O que você já sabe passa depressa: os ofícios sobem de nível mais rápido.',
    niveis: escada([1, 2, 3, 5, 8], (n) => ({ tipo: 'xpOficio', valor: arred(1 + 0.1 * n) })) },
  { id: 'maos', nome: 'Mãos treinadas', desc: 'Memória nos dedos: itens saem com mais qualidade.',
    niveis: escada([2, 4, 8], (n) => ({ tipo: 'qualidade', valor: arred(0.03 * n) })) },
  { id: 'oficina', nome: 'Oficina bem montada', desc: 'Ferramentas na medida certa: todos os ofícios produzem mais rápido.',
    niveis: escada([2, 3, 5, 8], (n) => ({ tipo: 'velocidadeGlobal', valor: arred(1 + 0.05 * n) })) },
  { id: 'exploradores', nome: 'Rede de exploradores', desc: 'Guias conhecidos: as expedições trazem mais material.',
    niveis: escada([1, 3, 5], (n) => ({ tipo: 'expedicaoRendimento', valor: arred(1 + 0.1 * n) })) },
  { id: 'reserva', nome: 'Reserva de família', desc: 'Um pé-de-meia para recomeçar: mais ouro ao fundar a nova cidade.',
    niveis: [100, 250, 500, 1000, 2000].map((valor, i) => ({ custo: [1, 2, 3, 5, 8][i], efeitos: [{ tipo: 'ouroInicial', valor }] })) },
];

// nomes das cidades, na ordem em que o jogador as funda (depois da última, recomeça com um número: "Vila Aurora II")
export const CIDADES = ['Vila Aurora', 'Porto Salgado', 'Pico Alto', 'Vale Verde', 'Cais das Brumas', 'Forte Carvalho', 'Ilha do Sol', 'Campos Dourados'];

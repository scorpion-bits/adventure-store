// Eventos sazonais: valem enquanto a data de hoje (do aparelho) estiver entre `de` e `ate` ("MM-DD", pode virar o ano).
// Para criar um novo basta acrescentar uma linha aqui; ele liga e desliga sozinho nas datas.
// { id, nome, desc, de, ate, efeitos: [ { tipo, valor } ] (os mesmos de data/melhorias.js) }
export const SAZONAIS = [
  { id: 'inverno_festivo', nome: 'Inverno Festivo', desc: 'Luzes nas janelas e presentes para todo lado: mais clientes e vendas melhores.', de: '12-18', ate: '01-03',
    efeitos: [{ tipo: 'chegada', valor: 1.2 }, { tipo: 'preco', valor: 1.1 }] },
  { id: 'carnaval_mascaras', nome: 'Festa das Máscaras', desc: 'A cidade inteira de máscara: o povo está animado e esbanjando.', de: '02-10', ate: '02-20',
    efeitos: [{ tipo: 'chegada', valor: 1.25 }, { tipo: 'paciencia', valor: 1.15 }] },
  { id: 'primavera', nome: 'Festival da Primavera', desc: 'As flores chegaram: ervas e poções em alta.', de: '03-20', ate: '03-31',
    efeitos: [{ tipo: 'chegada', valor: 1.15 }, { tipo: 'compra', valor: 0.92 }] },
  { id: 'semana_aventureiro', nome: 'Semana do Aventureiro', desc: 'Uma semana para homenagear quem sai de casa para o perigo: reputação rende mais.', de: '10-10', ate: '10-17',
    efeitos: [{ tipo: 'repGanho', valor: 1.3 }, { tipo: 'chegada', valor: 1.1 }] },
  { id: 'festa_junina', nome: 'Festa Junina', desc: 'Fogueira, quadrilha e muita comida: ótimo para a cozinha.', de: '06-10', ate: '06-30',
    efeitos: [{ tipo: 'chegada', valor: 1.15 }, { tipo: 'velocidade', oficio: 'culinaria', valor: 1.25 }] },
  { id: 'torneio_verao', nome: 'Torneio de Verão', desc: 'Guerreiros de todo o reino na cidade: armas e armaduras em demanda.', de: '07-15', ate: '07-31',
    efeitos: [{ tipo: 'chegada', valor: 1.2 }, { tipo: 'velocidade', oficio: 'ferraria', valor: 1.2 }] },
  { id: 'colheita', nome: 'Semana da Colheita', desc: 'Fartura nas feiras: materiais mais baratos e clientes pacientes.', de: '09-20', ate: '09-30',
    efeitos: [{ tipo: 'compra', valor: 0.9 }, { tipo: 'paciencia', valor: 1.2 }] },
  { id: 'noite_lanternas', nome: 'Noite das Lanternas', desc: 'Lanternas flutuam sobre a cidade, e quem passa gosta de coisas misteriosas.', de: '10-28', ate: '11-03',
    efeitos: [{ tipo: 'chegada', valor: 1.2 }, { tipo: 'qualidade', valor: 0.04 }] },
];

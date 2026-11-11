// Dados fictícios do Residencial Jardins. Os CPFs têm dígitos verificadores
// válidos, mas não pertencem a ninguém conhecido.
export type Morador = {
  titular: number;
  unidade: string;
  nome: string;
  cpf: string;
  email: string;
};

export const moradores: Morador[] = [
  { titular: 1, unidade: "101", nome: "Ana Ribeiro", cpf: "314.159.265-90" },
  { titular: 2, unidade: "102", nome: "Bruno Teixeira", cpf: "271.828.182-05" },
  { titular: 3, unidade: "302", nome: "Carlos Menezes", cpf: "161.803.398-05" },
  { titular: 4, unidade: "401", nome: "Daniela Souza", cpf: "141.421.356-51" },
].map((m) => ({
  ...m,
  email: m.nome.toLowerCase().replace(" ", ".") + "@exemplo.com.br",
}));

// O ex-morador que pede a eliminação
export const EX_MORADOR = 3;

// Eventos publicados para os outros módulos: parte pública e parte pessoal
export type Evento = {
  titular: number;
  tipo: string;
  momento: string;
  publicos: Record<string, string>;
  pessoais: Record<string, string>;
};

export function eventos(): Evento[] {
  const lista: Evento[] = [];
  for (const m of moradores) {
    lista.push({
      titular: m.titular,
      tipo: "MoradorCadastrado",
      momento: `2026-09-01T09:0${m.titular}`,
      publicos: { unidade: m.unidade },
      pessoais: { nome: m.nome, cpf: m.cpf, email: m.email },
    });
    lista.push({
      titular: m.titular,
      tipo: "CobrancaPaga",
      momento: `2026-10-05T10:0${m.titular}`,
      publicos: { unidade: m.unidade, competencia: "2026-10", valor: "890,00" },
      pessoais: { pagador: m.nome },
    });
  }
  lista.push({
    titular: EX_MORADOR,
    tipo: "EncomendaRecebida",
    momento: "2026-10-12T15:30",
    publicos: { unidade: "302" },
    pessoais: { destinatario: "Carlos Menezes" },
  });
  return lista.sort((a, b) => a.momento.localeCompare(b.momento));
}

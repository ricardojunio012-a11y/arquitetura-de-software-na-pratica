// A tabela de entradas da calculadora. Cada valor diz de onde veio: um capítulo
// do livro, a lista pública de preços da AWS ou uma premissa deste laboratório.
// Troque os valores pelos da sua empresa; o resto do código só lê esta tabela.
export interface Entrada {
  valor: number;
  unidade: string;
  fonte: string;
}

const e = (valor: number, unidade: string, fonte: string): Entrada => ({
  valor,
  unidade,
  fonte,
});

export const ENTRADAS = {
  // O negócio
  condominios: e(3000, "condomínios", "cap. 17"),
  mensalidade: e(300, "R$ por condomínio por mês", "cap. 17"),
  boletos: e(110, "boletos por condomínio por mês", "cap. 25"),
  pedidos: e(50_000, "pedidos por condomínio por mês", "cap. 34"),
  // Dinheiro e pessoas
  dolar: e(5.5, "R$ por US$", "cap. 12"),
  hora: e(150, "R$ por hora de engenharia", "cap. 14"),
  pessoa: e(25_200, "R$ por pessoa por mês", "cap. 32"),
  // Preços da AWS em São Paulo, sob demanda
  no: e(0.1301, "US$ por hora, EC2 m7g.large", "cap. 31"),
  cluster: e(0.1, "US$ por hora, plano de controle do EKS", "cap. 32"),
  banco: e(0.442, "US$ por hora, RDS db.m7g.large Multi-AZ", "cap. 17"),
  disco: e(0.438, "US$ por GB-mês, gp3 Multi-AZ", "cap. 17"),
  // Compromissos, na lista de preços da AWS de 26/10/2026 (sem pagamento adiantado)
  plano1: e(0.0884, "US$ por hora, Compute Savings Plan de 1 ano", "cap. 40"),
  plano3: e(0.0675, "US$ por hora, Compute Savings Plan de 3 anos", "cap. 40"),
  reserva1: e(0.3403, "US$ por hora, RDS reservado por 1 ano", "cap. 40"),
  // Custos já calculados nos capítulos
  sinais: e(950 / 150, "R$ por milhão de pedidos (logs e rastros)", "cap. 34"),
  ia: e(1.16, "R$ por condomínio, assistente no modelo menor", "cap. 20"),
  backup: e(1.8, "R$ por GB-mês de backup em outra conta", "cap. 35"),
  segredos: e(190, "R$ por mês, cofre de segredos", "cap. 36"),
  dados: e(0.1, "GB por condomínio", "cap. 31"),
  horasBanco: e(8, "horas de operação por banco por mês", "cap. 31"),
  ensaio: e(800, "R$ por banco por mês, ensaio de restauração", "cap. 35"),
  keycloak: e(0.25, "pessoa para operar o Keycloak", "cap. 36"),
  esteira: e(1660, "R$ por mês, esteira de 40 engenheiros", "cap. 33"),
  soc2: e(17_500, "R$ por mês, SOC 2 a partir do 2º ano", "cap. 37"),
  // Premissas deste laboratório
  porNo: e(1500, "condomínios por nó", "premissa"),
  porBanco: e(4000, "condomínios num db.m7g.large", "premissa"),
  porAtendente: e(1000, "condomínios por pessoa de atendimento", "premissa"),
  porPlataforma: e(5, "instalações por pessoa de plataforma", "premissa"),
  horasInstalacao: e(8, "horas por instalação por mês", "premissa"),
  porCelula: e(3000, "condomínios por célula", "premissa"),
  isolados: e(0.2, "fração em administradoras que exigem silo", "premissa"),
  porSilo: e(400, "condomínios por silo", "cap. 31"),
} satisfies Record<string, Entrada>;

export const HORAS_MES = 730;

export const v = (nome: keyof typeof ENTRADAS): number => ENTRADAS[nome].valor;

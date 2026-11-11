// Os dados do laboratório: três condomínios, doze boletos e as relações entre
// pessoas, unidades, condomínios e administradoras.

export interface Boleto {
  id: string;
  condominio: string;
  unidade: string;
  vencimento: string;
  valorCentavos: number;
}

const unidades = [
  ["C-01", "101"],
  ["C-01", "102"],
  ["C-01", "103"],
  ["C-01", "104"],
  ["C-02", "201"],
  ["C-02", "202"],
  ["C-02", "203"],
  ["C-02", "204"],
  ["C-03", "301"],
  ["C-03", "302"],
  ["C-03", "303"],
  ["C-03", "304"],
];

// Identificadores sequenciais, como em muitos sistemas reais: fáceis de adivinhar
export const boletos: Boleto[] = unidades.map(([condominio, unidade], i) => ({
  id: `B-${1001 + i}`,
  condominio,
  unidade: `${condominio}/${unidade}`,
  vencimento: "2026-11-05",
  valorCentavos: 61_000 + i * 1_250,
}));

// Os usuários vêm do Keycloak: o "sub" do token. As contas de serviço entram
// como "cliente:<client_id>".
export const pessoas = {
  ana: "0a000000-0000-4000-8000-000000000001",
  bruno: "0a000000-0000-4000-8000-000000000002",
  carla: "0a000000-0000-4000-8000-000000000003",
  dora: "0a000000-0000-4000-8000-000000000004",
  edu: "0a000000-0000-4000-8000-000000000005",
};

// Relações no estilo do Zanzibar: objeto#relação@sujeito. O sujeito pode ser um
// usuário ou um conjunto de usuários (outro objeto#relação).
export const tuplas: string[] = [
  `unidade:C-01/101#morador@${pessoas.ana}`,
  `unidade:C-01/102#morador@${pessoas.bruno}`,
  `unidade:C-02/201#morador@${pessoas.edu}`,
  `condominio:C-01#sindico@${pessoas.bruno}`,
  `condominio:C-01#porteiro@${pessoas.carla}`,
  `administradora:ADM-1#membro@${pessoas.dora}`,
  "administradora:ADM-1#membro@cliente:integracao-adm1",
  "condominio:C-01#administradora@administradora:ADM-1#membro",
  "condominio:C-03#administradora@administradora:ADM-1#membro",
  "condominio:C-02#administradora@administradora:ADM-2#membro",
];

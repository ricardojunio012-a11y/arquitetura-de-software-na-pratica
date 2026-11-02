// Teste de arquitetura: as regras de fronteira entre os módulos do monólito.
module.exports = {
  forbidden: [
    {
      name: "reservas-so-usa-a-api-do-financeiro",
      comment: "Reservas não pode ler os dados internos (a tabela) do Financeiro",
      severity: "error",
      from: { path: "^src/(antes|depois)/modulos/reservas/" },
      to: { path: "^src/$1/modulos/financeiro/interno/" },
    },
    {
      name: "financeiro-nao-depende-de-reservas",
      comment: "O Financeiro não conhece Reservas: a dependência tem um sentido só",
      severity: "error",
      from: { path: "^src/(antes|depois)/modulos/financeiro/" },
      to: { path: "^src/$1/modulos/reservas/" },
    },
  ],
  options: { tsPreCompilationDeps: true },
};

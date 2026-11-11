// Teste de arquitetura do Morada: o domínio não conhece a infraestrutura.
module.exports = {
  forbidden: [
    {
      name: "dominio-sem-infraestrutura",
      comment: "O domínio não importa adaptadores nem bibliotecas de banco de dados",
      severity: "error",
      from: { path: "/dominio/" },
      to: { path: "(/adaptadores/|node_modules/pg/)" },
    },
  ],
  options: { tsPreCompilationDeps: true },
};

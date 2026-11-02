// Configuração global: qualquer módulo lê e altera (acoplamento comum).
export const config = {
  fundoPorcento: 10,
  multaPorcento: 2,
  hoje: new Date(),
  dados: null as any, // o condomínio inteiro, preenchido pelo main
};

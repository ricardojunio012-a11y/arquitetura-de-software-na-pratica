// Modelo anêmico: só dados, todos públicos e alteráveis. Nenhuma regra mora aqui.
export class Reserva {
  id = "";
  unidade = "";
  espaco = "";
  data = "";
  inicio = 0;
  fim = 0;
  situacao = "confirmada";
  taxaCentavos = 0;
}

export class Espaco {
  id = "";
  taxaCentavos = 0;
  antecedenciaMinimaDias = 0;
  limitePorMes = 0;
}

// Os dados de todas as reservas, que qualquer parte do sistema pode ler e alterar
export const reservas: Reserva[] = [];

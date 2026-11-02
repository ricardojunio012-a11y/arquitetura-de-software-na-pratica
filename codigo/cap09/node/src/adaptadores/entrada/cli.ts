// Adaptador de entrada de linha de comando: os mesmos casos de uso, acionados por
// argumentos e respondidos em texto para uma pessoa ler no terminal.
import type { CasosDeUsoDeReservas } from "../../aplicacao/portas.ts";

const USO_RESERVAR =
  "uso: reservar <reserva> <unidade> <espaco> <data> <inicio> <fim> <hoje>";

// Devolve o texto a mostrar e o código de saída do processo (0 = deu certo)
export async function executar(
  reservas: CasosDeUsoDeReservas,
  args: string[],
): Promise<[string, number]> {
  const [comando, ...resto] = args;
  try {
    switch (comando) {
      case "espacos": {
        const espacos = await reservas.listarEspacos();
        const linhas = espacos.map((e) => {
          const dias = `${e.antecedenciaMinimaDias} dia(s)`;
          return `${e.id}: taxa ${e.taxa}, antecedência de ${dias}`;
        });
        return [linhas.join("\n"), 0];
      }
      case "reservar": {
        if (resto.length !== 7) return [USO_RESERVAR, 2];
        const [reserva, unidade, espaco, data, inicio, fim, em] = resto;
        const c = await reservas.reservar({
          reserva,
          unidade,
          espaco,
          data,
          inicio: Number(inicio),
          fim: Number(fim),
          em,
        });
        return [`${c.reserva} confirmada, taxa ${c.taxa}`, 0];
      }
      case "cancelar": {
        const c = await reservas.cancelar(resto[0], resto[1]);
        return [`${c.reserva} cancelada, multa ${c.multa}`, 0];
      }
      case "reservas": {
        const lista = await reservas.reservasDoEspaco(resto[0]);
        if (lista.length === 0) return ["nenhuma reserva", 0];
        return [
          lista.map((r) => `${r.reserva} ${r.unidade} ${r.periodo}`).join("\n"),
          0,
        ];
      }
      default:
        return ["comandos: espacos, reservar, cancelar, reservas", 2];
    }
  } catch (erro) {
    return [`erro: ${(erro as Error).message}`, 1];
  }
}

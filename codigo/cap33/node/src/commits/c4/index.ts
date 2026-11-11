// O ponto de entrada que o resto do Morada chama: liga o domínio ao adaptador
import { FeriadosFixos } from "./adaptadores/feriados-fixos.ts";
import { type Cobranca, calcularEncargos } from "./dominio/encargos.ts";

const calendario = new FeriadosFixos();

export function valorAtualizado(c: Cobranca, pagamento: string) {
  return calcularEncargos(c, pagamento, calendario);
}

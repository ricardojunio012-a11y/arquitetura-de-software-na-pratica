// "Agora a parte difícil": dois pedidos para o mesmo espaço e a mesma data
// chegam ao mesmo tempo. A intercalação é forçada, para a saída ser sempre igual:
// os dois passam pela cadeia antes de qualquer um gravar.
import type { Etapa } from "./aprovacao.ts";
import { Reserva } from "./estado.ts";
import type { RepositorioDeReservas } from "./repositorio.ts";
import { dataBr, type Pedido } from "./tipos.ts";

type Montar = () => { cadeia: Etapa; reservas: RepositorioDeReservas };

export function corrida(pedidos: Pedido[], montar: Montar): string[] {
  const { espaco, data } = pedidos[0];
  const linhas = [`Pedidos simultâneos: ${espaco.nome} em ${dataBr(data)}`];
  for (const protegido of [false, true]) {
    linhas.push(
      protegido
        ? "gravar só se o espaço estiver livre, numa operação só:"
        : "verificar e depois gravar (check-then-act):",
    );
    const { cadeia, reservas } = montar();
    // 1. Os dois verificam: o espaço está livre para ambos
    const aprovados = pedidos.filter((p) => {
      const d = cadeia.avaliar(p);
      linhas.push(
        `  ${p.id} ${p.unidade.id}: ${d.aprovada ? "passou na cadeia" : d.motivo}`,
      );
      return d.aprovada;
    });
    // 2. Os dois gravam
    for (const p of aprovados) {
      const reserva = new Reserva(p);
      const gravou = protegido ? reservas.salvarSeLivre(reserva) : true;
      if (!protegido) reservas.salvar(reserva);
      if (gravou) reserva.aprovar();
      linhas.push(`  ${p.id} ${gravou ? "gravada" : "recusada na gravação"}`);
    }
    const n = pedidos.filter((p) => reservas.buscar(p.id)?.estado === "aprovada");
    const resultado =
      n.length === 1 ? "1 reserva aprovada" : `${n.length} reservas aprovadas`;
    linhas.push(`  resultado: ${resultado}${n.length > 1 ? " (reserva dupla)" : ""}`);
  }
  return linhas;
}

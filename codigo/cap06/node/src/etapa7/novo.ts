// O código novo: o módulo refatorado da etapa 5 mais a regra do limite, que já nasceu
// separada na etapa 6 (a classe-broto) e por isso migra sem ser reescrita.
import { LimitePorMes } from "../etapa6/limite.ts";
import {
  type Decisao,
  type Espaco,
  type Pedido,
  type Unidade,
  motivoDaRecusa,
  valorDaReserva,
} from "../etapa5/reservas.ts";

export function decidir(
  dados: { espacos: Espaco[]; unidades: Unidade[]; pedidos: Pedido[] },
  hoje: Date,
  limite = new LimitePorMes(),
): Decisao[] {
  const aprovadas: Pedido[] = [];
  return dados.pedidos.map((pedido) => {
    const unidade = dados.unidades.find((u) => u.id === pedido.unidade)!;
    const espaco = dados.espacos.find((e) => e.id === pedido.espaco)!;
    const motivo =
      motivoDaRecusa(pedido, unidade, hoje, aprovadas) ??
      (limite.atingido(pedido, aprovadas)
        ? "limite de reservas do mês atingido"
        : null);
    if (motivo) return { pedido, email: unidade.email, motivo, valor: 0 };
    aprovadas.push(pedido);
    return {
      pedido,
      email: unidade.email,
      motivo,
      valor: valorDaReserva(espaco, pedido),
    };
  });
}

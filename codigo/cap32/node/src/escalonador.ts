// O escalonador do Kubernetes em duas etapas, como a documentação descreve:
// filtrar os nós em que o pedido de CPU do pod cabe e pontuar os que sobraram.
// A pontuação padrão (LeastAllocated) prefere o nó com mais folga, o que espalha
// as réplicas. No empate, o Kubernetes sorteia; aqui vence o nome, para a saída
// ser sempre a mesma.
export type No = {
  nome: string;
  cpu: number; // milésimos de núcleo alocáveis para a aplicação
  pedida: number; // soma dos pedidos dos pods já colocados nele
  pronto: boolean;
};

export function escolherNo(nos: No[], pedido: number): No | undefined {
  const cabem = nos.filter((n) => n.pronto && n.cpu - n.pedida >= pedido);
  const folga = (n: No) => (n.cpu - n.pedida) / n.cpu;
  cabem.sort((a, b) => folga(b) - folga(a) || a.nome.localeCompare(b.nome));
  return cabem[0]; // undefined: o pod fica Pending
}

// A porta do banco que o código dos módulos usa. Na função de aptidão de latência,
// quem a implementa conta as consultas e as linhas de cada pedido.
export interface Banco {
  consultar<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

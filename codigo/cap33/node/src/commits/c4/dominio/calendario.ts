// A porta: o domínio só precisa saber se um dia é útil
export interface Calendario {
  ehDiaUtil(dia: string): boolean;
}

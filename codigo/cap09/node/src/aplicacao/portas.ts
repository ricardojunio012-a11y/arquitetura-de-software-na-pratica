// As portas do hexágono. Quem está dentro define as duas; quem está fora se adapta.
import type { Agenda } from "../dominio/agenda.ts";

// Porta de entrada: o que o sistema oferece, seja quem for que o acione
export interface CasosDeUsoDeReservas {
  listarEspacos(): Promise<EspacoListado[]>;
  reservar(pedido: PedidoDeReserva): Promise<Confirmacao>;
  cancelar(reserva: string, em: string): Promise<Cancelamento>;
  reservasDoEspaco(espaco: string): Promise<ReservaListada[]>;
}

// Porta de saída: o que o sistema precisa para guardar as agendas
export interface RepositorioDeAgendas {
  todas(): Promise<Agenda[]>;
  doEspaco(espaco: string): Promise<Agenda>;
  daReserva(reserva: string): Promise<Agenda>;
  salvar(agenda: Agenda): Promise<void>;
}

export interface PedidoDeReserva {
  reserva: string;
  unidade: string;
  espaco: string;
  data: string;
  inicio: number;
  fim: number;
  em: string;
}

export interface EspacoListado {
  id: string;
  taxa: string;
  antecedenciaMinimaDias: number;
}

export interface Confirmacao {
  reserva: string;
  situacao: "confirmada";
  taxa: string;
}

export interface Cancelamento {
  reserva: string;
  situacao: "cancelada";
  multa: string;
}

export interface ReservaListada {
  reserva: string;
  unidade: string;
  periodo: string;
}

// A mesma configuração, com os segredos fora do código: o que não é segredo fica
// aqui; o segredo é lido, em tempo de execução, de onde o cofre o entrega.
import { readFileSync } from "node:fs";

const segredo = (nome: string) => readFileSync(`/run/segredos/${nome}`, "utf8").trim();

export const config = {
  emissor: process.env.EMISSOR ?? "http://keycloak:8080/realms/morada",
  clientId: "integracao-adm1",
  clientSecret: () => segredo("integracao"), // lido a cada uso: a troca não exige deploy
  banco: () => `postgresql://morada:${segredo("banco")}@banco:5432/morada`,
  // Sem chave de acesso da AWS: na nuvem, a aplicação usa o papel da própria máquina
  // ou do pod, com credenciais temporárias, e nenhuma chave fixa existe
};

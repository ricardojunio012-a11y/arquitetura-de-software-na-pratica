// A configuração da integração como ela estava no primeiro rascunho do Morada.
// NÃO FAÇA ASSIM: tudo o que está aqui vai para o Git, para cada cópia do
// repositório e para cada imagem gerada a partir dele.
export const config = {
  emissor: "http://keycloak:8080/realms/morada",
  clientId: "integracao-adm1",
  clientSecret: "adm1-integracao-2026-segredo",
  banco: "postgresql://morada:Morada2026@banco:5432/morada",
  awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE", // a chave de exemplo da documentação da AWS
};

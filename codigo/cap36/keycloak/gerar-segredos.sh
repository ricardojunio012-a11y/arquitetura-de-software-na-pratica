#!/bin/sh
# O "cofre" do laboratório: gera segredos aleatórios num volume, na primeira subida.
# Em produção, este papel é de um gerenciador de segredos (Vault, AWS Secrets Manager,
# Azure Key Vault, GCP Secret Manager), e não de um arquivo no repositório.
set -e
umask 077
for nome in integracao rotacao senha_usuarios; do
  if [ ! -s "/segredos/$nome" ]; then
    head -c 24 /dev/urandom | base64 | tr -d '/+=\n' > "/segredos/$nome"
    echo "segredo '$nome' gerado"
  fi
done
# O Keycloak e a aplicação rodam com usuários diferentes; os dois precisam ler
chmod 0644 /segredos/*

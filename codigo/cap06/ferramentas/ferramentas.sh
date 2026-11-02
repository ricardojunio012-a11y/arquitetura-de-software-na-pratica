#!/bin/sh
# Ferramentas do laboratório do capítulo 6.
#   verificar etapaN   compara saida/etapaN com o resultado aprovado (teste de caracterização)
#   medir [linguagem]  mede o tamanho de cada passo de refatoração (padrão: $LINGUAGEM; "todas" mede as quatro)
set -e

pasta_do_codigo() {
  case "$1" in
    node) echo "node/src" ;;
    php) echo "php/src" ;;
    python) echo "python/morada" ;;
    java) echo "java/src/main/java/morada" ;;
    *) echo "linguagem desconhecida: $1" >&2; exit 1 ;;
  esac
}

nome_da_linguagem() {
  case "$1" in
    node) echo "Node/TypeScript" ;;
    php) echo "PHP" ;;
    python) echo "Python" ;;
    java) echo "Java" ;;
  esac
}

# Linhas não vazias de um arquivo
linhas() { grep -cE '[^[:space:]]' "$1" || true; }

verificar() {
  etapa="$1"
  case "$etapa" in
    etapa[1-7]) ;;
    *) echo "uso: verificar etapa1|...|etapa7" >&2; exit 1 ;;
  esac
  if [ ! -d "saida/$etapa" ]; then
    echo "saida/$etapa não existe: rode antes 'docker compose run --rm app $etapa'" >&2
    exit 1
  fi
  if diff -ru esperado "saida/$etapa"; then
    echo "OK: a saída de $etapa é idêntica ao resultado aprovado."
  else
    echo "FALHOU: a saída de $etapa difere do resultado aprovado." >&2
    exit 1
  fi
}

# Compara duas etapas da mesma linguagem e imprime o tamanho da mudança
comparar() {
  base="$1/$2"
  nova="$1/$3"
  tmp=$(mktemp -d)
  # Ignora o fim de linha do Windows (CRLF) e o nome da etapa, que aparece
  # em pacotes, namespaces e imports: nenhum dos dois conta como mudança
  mkdir -p "$tmp/a" "$tmp/b"
  for f in $(cd "$base" && ls); do sed -e 's/\r$//' -e 's/[Ee]tapa[0-9]/etapaX/g' "$base/$f" > "$tmp/a/$f"; done
  for f in $(cd "$nova" && ls); do sed -e 's/\r$//' -e 's/[Ee]tapa[0-9]/etapaX/g' "$nova/$f" > "$tmp/b/$f"; done

  alterados=0; novos=0; removidas=0; adicionadas=0
  for f in $(ls "$tmp/b"); do
    if [ -f "$tmp/a/$f" ]; then
      d=$(diff "$tmp/a/$f" "$tmp/b/$f" || true)
      if [ -n "$d" ]; then
        alterados=$((alterados + 1))
        r=$(printf '%s\n' "$d" | grep -cE '^< .*[^[:space:]]' || true)
        a=$(printf '%s\n' "$d" | grep -cE '^> .*[^[:space:]]' || true)
        removidas=$((removidas + r)); adicionadas=$((adicionadas + a))
      fi
    else
      novos=$((novos + 1))
      adicionadas=$((adicionadas + $(linhas "$tmp/b/$f")))
    fi
  done
  total=0
  for f in $(ls "$tmp/b"); do total=$((total + $(linhas "$tmp/b/$f"))); done
  printf '  %s -> %s: %d arquivo(s) alterado(s), %d novo(s); %d linha(s) existente(s) alterada(s) ou removida(s); %d linha(s) nova(s); %d linhas no total\n' \
    "$2" "$3" "$alterados" "$novos" "$removidas" "$adicionadas" "$total"
  rm -rf "$tmp"
}

medir_linguagem() {
  pasta=$(pasta_do_codigo "$1")
  echo "$(nome_da_linguagem "$1")"
  comparar "$pasta" etapa1 etapa2
  comparar "$pasta" etapa2 etapa3
  comparar "$pasta" etapa3 etapa4
  comparar "$pasta" etapa4 etapa5
  # A regra nova no legado (broto e invólucro) parte da etapa 2, não da 5
  comparar "$pasta" etapa2 etapa6
}

medir() {
  alvo="${1:-$LINGUAGEM}"
  if [ "$alvo" = "todas" ]; then
    for l in node php python java; do medir_linguagem "$l"; done
  else
    medir_linguagem "$alvo"
  fi
}

case "$1" in
  verificar) verificar "$2" ;;
  medir) medir "$2" ;;
  *) echo "uso: verificar etapaN | medir [node|php|python|java|todas]" >&2; exit 1 ;;
esac

FROM maven:3.9-eclipse-temurin-21
WORKDIR /app
COPY pom.xml ./
RUN mvn -q dependency:go-offline
COPY rodar.sh ./
COPY src ./src
# Compila e roda os testes uma vez na construção: o Maven baixa tudo o que o "testes" vai usar
RUN mvn -q package
ENTRYPOINT ["sh", "rodar.sh"]

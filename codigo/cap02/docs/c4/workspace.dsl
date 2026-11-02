/*
 * Modelo C4 do Morada no fim do capítulo 1 (2026).
 * Abra com o Structurizr no modo local: docker compose up -d structurizr
 * e acesse http://localhost:8080
 */
workspace "Morada" "SaaS de gestão de condomínios: modelo C4 do capítulo 2" {

    !identifiers hierarchical

    model {
        sindico = person "Síndico" "Acompanha cobranças e inadimplência."
        morador = person "Morador" "Recebe o aviso e paga a taxa."
        administradora = person "Administradora" "Recebe o relatório mensal."

        morada = softwareSystem "Morada" "Calcula e envia a cobrança mensal." {
            web = container "Aplicação web" "Telas do síndico e do morador." "React"
            cobranca = container "Cobrança mensal" "Cobranças, pagamentos e avisos." {
                technology "Node.js, PHP, Python ou Java"
                aplicacao = component "Orquestração" "Calcula, gera, registra e avisa."
                calculo = component "Cálculo" "Taxa, fundo, multa e juros."
                pagamento = component "Meios de pagamento" "Código do boleto ou do Pix."
                notificacao = component "Notificação" "E-mail ou WhatsApp."
                relatorio = component "Relatório" "Relatório da administradora."
            }
            banco = container "Banco de dados" "Cobranças." "PostgreSQL" {
                tags "Banco"
            }
        }

        bancoEmissor = softwareSystem "Banco emissor" "Registra boletos." {
            tags "Externo"
        }
        provedorPix = softwareSystem "Provedor de Pix" "Cria cobranças Pix." {
            tags "Externo"
        }
        provedorEmail = softwareSystem "Provedor de e-mail" "Entrega e-mails." {
            tags "Externo"
        }
        whatsapp = softwareSystem "WhatsApp Business" "Entrega mensagens." {
            tags "Externo"
        }

        sindico -> morada.web "Acompanha cobranças"
        morador -> morada.web "Consulta e paga"
        morada.web -> morada.banco "Lê e grava" "SQL"
        morada.cobranca.aplicacao -> morada.cobranca.calculo "Calcula"
        morada.cobranca.aplicacao -> morada.cobranca.pagamento "Gera o código"
        morada.cobranca.aplicacao -> morada.cobranca.notificacao "Avisa"
        morada.cobranca.aplicacao -> morada.cobranca.relatorio "Registra"
        morada.cobranca.aplicacao -> morada.banco "Lê e grava" "SQL"
        morada.cobranca.pagamento -> bancoEmissor "Registra boletos" "API"
        morada.cobranca.pagamento -> provedorPix "Cria cobranças" "API Pix"
        morada.cobranca.notificacao -> provedorEmail "Envia e-mails" "SMTP"
        morada.cobranca.notificacao -> whatsapp "Envia mensagens" "HTTPS"
        provedorEmail -> morador "Entrega o aviso"
        whatsapp -> morador "Entrega o aviso"
        morada.cobranca.relatorio -> administradora "Envia o relatório"
    }

    views {
        systemContext morada "Contexto" "Nível 1: contexto." {
            include *
            autolayout lr
        }
        container morada "Conteineres" "Nível 2: contêineres." {
            include *
            autolayout lr
        }
        component morada.cobranca "Componentes" "Nível 3: componentes." {
            include *
            autolayout lr
        }

        styles {
            element "Person" {
                shape Person
                background #1F4E79
                color #ffffff
            }
            element "Software System" {
                background #1F4E79
                color #ffffff
            }
            element "Container" {
                background #3A6EA5
                color #ffffff
            }
            element "Component" {
                background #DCE8F4
                color #1D2733
            }
            element "Externo" {
                background #6B7785
                color #ffffff
            }
            element "Banco" {
                shape Cylinder
            }
        }
    }
}

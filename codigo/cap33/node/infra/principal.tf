# A infraestrutura de um ambiente do Morada: a fila de cobranças com a sua fila de
# mensagens mortas, o bucket das prestações de contas e o banco dos relatórios.

resource "aws_sqs_queue" "cobrancas_mortas" {
  name                      = "morada-${var.ambiente}-cobrancas-mortas"
  message_retention_seconds = 1209600 # 14 dias
}

resource "aws_sqs_queue" "cobrancas" {
  name                       = "morada-${var.ambiente}-cobrancas"
  visibility_timeout_seconds = 30
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.cobrancas_mortas.arn
    maxReceiveCount     = 5
  })
}

resource "aws_s3_bucket" "prestacao" {
  bucket = "morada-${var.ambiente}-prestacao-de-contas"
}

resource "aws_s3_bucket_versioning" "prestacao" {
  bucket = aws_s3_bucket.prestacao.id
  versioning_configuration {
    status = "Enabled"
  }
}

# O LocalStack gratuito não tem RDS. O servidor PostgreSQL vem do Compose, e o
# OpenTofu cria nele o papel e o banco dos relatórios.
resource "postgresql_role" "relatorios" {
  name     = "relatorios"
  login    = true
  password = var.senha_relatorios
}

resource "postgresql_database" "relatorios" {
  name  = "morada_relatorios"
  owner = postgresql_role.relatorios.name
}

output "fila_cobrancas" {
  value = aws_sqs_queue.cobrancas.url
}

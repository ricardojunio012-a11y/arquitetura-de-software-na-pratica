# A AWS de mentira: o LocalStack aceita qualquer credencial
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = var.nuvem_url
    sqs = var.nuvem_url
  }

  default_tags {
    tags = {
      projeto    = "morada"
      ambiente   = var.ambiente
      gerenciado = "opentofu"
    }
  }
}

provider "postgresql" {
  host     = var.banco_host
  port     = 5432
  username = "morada"
  password = "morada"
  sslmode  = "disable"
}

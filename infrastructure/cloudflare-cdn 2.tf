# Cloudflare CDN Configuration for LEARN-X
# This Terraform configuration sets up Cloudflare as a CDN for static assets

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for your domain"
  type        = string
}

variable "domain_name" {
  description = "Your domain name (e.g., learnx.com)"
  type        = string
  default     = "learnx.com"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for static assets"
  type        = string
  default     = "learnx-production"
}

# Providers
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for static assets
resource "aws_s3_bucket" "static_assets" {
  bucket = var.s3_bucket_name
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket policy for Cloudflare access
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudflareAccess"
        Effect = "Allow"
        Principal = "*"
        Action = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = [
              # Cloudflare IP ranges
              "173.245.48.0/20",
              "103.21.244.0/22",
              "103.22.200.0/22",
              "103.31.4.0/22",
              "141.101.64.0/18",
              "108.162.192.0/18",
              "190.93.240.0/20",
              "188.114.96.0/20",
              "197.234.240.0/22",
              "198.41.128.0/17",
              "162.158.0.0/15",
              "172.64.0.0/13",
              "131.0.72.0/22",
              "104.16.0.0/13",
              "104.24.0.0/14"
            ]
          }
        }
      }
    ]
  })
}

# S3 bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://www.${var.domain_name}",
      "https://app.${var.domain_name}"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Cloudflare DNS records
resource "cloudflare_record" "cdn" {
  zone_id = var.cloudflare_zone_id
  name    = "cdn"
  type    = "CNAME"
  value   = aws_s3_bucket.static_assets.bucket_regional_domain_name
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "static" {
  zone_id = var.cloudflare_zone_id
  name    = "static"
  type    = "CNAME"
  value   = aws_s3_bucket.static_assets.bucket_regional_domain_name
  ttl     = 1
  proxied = true
}

# Cloudflare Page Rules
resource "cloudflare_page_rule" "static_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "https://cdn.${var.domain_name}/*"
  priority = 1

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 2678400  # 31 days
    browser_cache_ttl = 2678400
    
    # Enable Cloudflare optimizations
    minify {
      css  = "on"
      js   = "on"
      html = "on"
    }
    
    # Enable Brotli compression
    polish = "lossless"
    
    # Enable WebP conversion
    mirage = "on"
  }
}

# Cloudflare Cache Rules for different asset types
resource "cloudflare_ruleset" "cache_rules" {
  zone_id = var.cloudflare_zone_id
  name    = "LEARN-X Cache Rules"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules {
    action = "set_cache_settings"
    action_parameters {
      edge_ttl {
        mode    = "override_origin"
        default = 2678400  # 31 days
      }
      browser_ttl {
        mode    = "override_origin"
        default = 604800   # 7 days
      }
      serve_stale {
        disable_stale_while_updating = false
      }
    }
    expression  = "(http.host eq \"cdn.${var.domain_name}\" and http.request.uri.path.extension in {\"js\" \"css\" \"woff\" \"woff2\" \"ttf\" \"eot\" \"svg\"})"
    description = "Long cache for static assets"
    enabled     = true
  }

  rules {
    action = "set_cache_settings"
    action_parameters {
      edge_ttl {
        mode    = "override_origin"
        default = 86400  # 1 day
      }
      browser_ttl {
        mode    = "override_origin"
        default = 3600   # 1 hour
      }
    }
    expression  = "(http.host eq \"cdn.${var.domain_name}\" and http.request.uri.path.extension in {\"jpg\" \"jpeg\" \"png\" \"gif\" \"webp\" \"ico\" \"pdf\"})"
    description = "Medium cache for images and documents"
    enabled     = true
  }
}

# Cloudflare Security Rules
resource "cloudflare_ruleset" "security_rules" {
  zone_id = var.cloudflare_zone_id
  name    = "LEARN-X Security Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(http.request.uri.path contains \".env\" or http.request.uri.path contains \".git\" or http.request.uri.path contains \"wp-admin\")"
    description = "Block access to sensitive files"
    enabled = true
  }

  rules {
    action = "challenge"
    expression = "(cf.threat_score gt 30)"
    description = "Challenge high threat score visitors"
    enabled = true
  }
}

# Cloudflare Transform Rules for URL rewriting
resource "cloudflare_ruleset" "transform_rules" {
  zone_id = var.cloudflare_zone_id
  name    = "LEARN-X Transform Rules"
  kind    = "zone"
  phase   = "http_request_transform"

  rules {
    action = "rewrite"
    action_parameters {
      uri {
        path {
          expression = "concat(\"/static\", http.request.uri.path)"
        }
      }
    }
    expression  = "(http.host eq \"cdn.${var.domain_name}\" and not starts_with(http.request.uri.path, \"/static\"))"
    description = "Rewrite CDN URLs to include /static prefix"
    enabled     = true
  }
}

# Cloudflare Workers for advanced CDN logic (optional)
resource "cloudflare_worker_script" "cdn_worker" {
  name    = "learnx-cdn-worker"
  content = file("${path.module}/cdn-worker.js")
}

resource "cloudflare_worker_route" "cdn_route" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "cdn.${var.domain_name}/*"
  script_name = cloudflare_worker_script.cdn_worker.name
}

# Outputs
output "cdn_domain" {
  value       = "https://cdn.${var.domain_name}"
  description = "CDN domain for static assets"
}

output "static_domain" {
  value       = "https://static.${var.domain_name}"
  description = "Alternative static domain"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.static_assets.id
  description = "S3 bucket name for uploading static assets"
}
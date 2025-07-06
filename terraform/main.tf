resource "aws_ecr_repository" "this" {
  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = var.force_delete
} 
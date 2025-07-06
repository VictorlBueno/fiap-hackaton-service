db_host = "fiap-hack-production.cqjqjqjqjqjq.us-east-1.rds.amazonaws.com"
db_port = "5432"
db_name = "fiaphack"
db_username = "postgres"
db_password = "fiap-hack-2024!"

rabbitmq_host = "rabbitmq-service.rabbitmq.svc.cluster.local"
rabbitmq_port = "5672"
rabbitmq_username = "admin"
rabbitmq_password = "admin123"

aws_region = "us-east-1"
aws_access_key_id = "AKIAIOSFODNN7EXAMPLE"
aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

app_name = "video-processor"
app_namespace = "video-processor"
app_replicas = 2
app_image = "410211328905.dkr.ecr.us-east-1.amazonaws.com/fiap-hack-production:latest"

cpu_request = "250m"
cpu_limit = "500m"
memory_request = "256Mi"
memory_limit = "512Mi"

hpa_min_replicas = 2
hpa_max_replicas = 10
hpa_cpu_target = 70
hpa_memory_target = 80

ingress_host = "video-processor.local"
ingress_class = "nginx" 
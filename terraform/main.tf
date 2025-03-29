// terraform/main.tf
resource "google_compute_instance" "guacamole_server" {
  name         = "guacamole-server"
  machine_type = "e2-standard-2"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 50
    }
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP
    }
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose
    
    # Create Docker Compose file for Guacamole
    mkdir -p /opt/guacamole
    cat > /opt/guacamole/docker-compose.yml << 'EOL'
    version: '3'
    services:
      guacd:
        image: guacamole/guacd
        restart: always
        networks:
          - guacamole_net
        
      guacamole:
        image: guacamole/guacamole
        restart: always
        ports:
          - "8080:8080"
        environment:
          GUACD_HOSTNAME: guacd
          POSTGRES_HOSTNAME: postgres
          POSTGRES_DATABASE: guacamole_db
          POSTGRES_USER: guacamole_user
          POSTGRES_PASSWORD: ${var.db_password}
        networks:
          - guacamole_net
        depends_on:
          - guacd
          - postgres
          
      postgres:
        image: postgres:13
        restart: always
        environment:
          POSTGRES_DB: guacamole_db
          POSTGRES_USER: guacamole_user
          POSTGRES_PASSWORD: ${var.db_password}
        volumes:
          - postgres_data:/var/lib/postgresql/data
        networks:
          - guacamole_net
          
      init:
        image: guacamole/guacamole
        command: /opt/guacamole/bin/initdb.sh --postgres > /init/initdb.sql
        volumes:
          - ./init:/init
        networks:
          - guacamole_net
        depends_on:
          - postgres
    
    networks:
      guacamole_net:
    
    volumes:
      postgres_data:
    EOL
    
    # Start Guacamole
    cd /opt/guacamole
    docker-compose up -d
  EOF

  tags = ["guacamole", "http-server", "https-server"]
}

// Create firewall rules to allow access to Guacamole
resource "google_compute_firewall" "guacamole_firewall" {
  name    = "allow-guacamole"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8080", "22", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["guacamole", "http-server", "https-server"]
}

// terraform/vm_templates.tf
resource "google_compute_instance_template" "ubuntu_template" {
  name         = "ubuntu-template"
  machine_type = "e2-medium"
  
  disk {
    source_image = "ubuntu-os-cloud/ubuntu-2204-lts"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
  }
  
  network_interface {
    network = "default"
    access_config {}
  }
  
  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y openssh-server xfce4 xfce4-goodies tightvncserver
    # Configure VNC for Guacamole access
    mkdir -p /home/ubuntu/.vnc
    echo "password" | vncpasswd -f > /home/ubuntu/.vnc/passwd
    chmod 600 /home/ubuntu/.vnc/passwd
    vncserver :1 -geometry 1280x800 -depth 24
  EOF
  
  scheduling {
    preemptible       = true
    automatic_restart = false
  }
  
  service_account {
    scopes = ["cloud-platform"]
  }
}

// Similar templates for Rocky Linux and OpenSUSE

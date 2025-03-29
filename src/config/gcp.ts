export const gcpConfig = {
    projectId: process.env.GCP_PROJECT_ID || 'unnati-cloud-labs',
    zone: process.env.GCP_ZONE || 'us-central1-a',
    region: process.env.GCP_REGION || 'us-central1',
    keyFilePath: process.env.GCP_KEY_FILE || './gcp-key.json',
    network: process.env.GCP_NETWORK || 'default',
    subnetwork: process.env.GCP_SUBNETWORK || 'default',
    templates: {
      ubuntu: process.env.UBUNTU_TEMPLATE || 'ubuntu-template',
      rockyLinux: process.env.ROCKY_TEMPLATE || 'rocky-linux-template',
      openSUSE: process.env.OPENSUSE_TEMPLATE || 'opensuse-template'
    }
  };
  
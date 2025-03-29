export interface GCPVMMetadata {
    id: string;
    creationTimestamp: string;
    name: string;
    description: string;
    tags: {
      items: string[];
    };
    machineType: string;
    status: string;
    zone: string;
    networkInterfaces: Array<{
      network: string;
      subnetwork: string;
      networkIP: string;
      accessConfigs: Array<{
        natIP: string;
        type: string;
      }>;
    }>;
    disks: Array<{
      type: string;
      mode: string;
      source: string;
      deviceName: string;
      index: number;
      boot: boolean;
      autoDelete: boolean;
      licenses: string[];
      interface: string;
    }>;
    metadata: {
      items: Array<{
        key: string;
        value: string;
      }>;
    };
  }
  
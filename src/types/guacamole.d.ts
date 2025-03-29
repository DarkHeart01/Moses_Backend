export interface GuacamoleConnection {
    name: string;
    identifier: string;
    parentIdentifier: string;
    protocol: string;
    parameters: {
      [key: string]: string;
    };
    attributes: {
      [key: string]: string;
    };
  }
  
  export interface GuacamoleAuthToken {
    authToken: string;
    username: string;
    dataSource: string;
    availableDataSources: string[];
  }
  
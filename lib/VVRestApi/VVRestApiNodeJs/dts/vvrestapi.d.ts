class authorize {
    getVaultApi(loginToken: string, developerId: string, developerSecret: string, baseVaultUrl: string, customerAlias: string, databaseAlias: string) : any;
}

class sessionToken {
    isAuthenticated: bool;

    baseUrl: string;

    apiUrl: string;

    authenticationUrl: string;

    customerAlias: string;

    databaseAlias: string;

    expirationDateUtc: Date;

    tokenBase64: string;

    tokenType: number;

    developerId: string;

    developerSecret: string;

    loginToken: string;

    constructor();
}

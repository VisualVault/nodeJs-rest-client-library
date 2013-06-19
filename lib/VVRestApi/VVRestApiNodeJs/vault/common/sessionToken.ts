///<reference path='..\..\dts\node.d.ts' />

class sessionToken {
    isAuthenticated: bool;

    apiUrl: string;

    baseUrl: string;

    authenticationUrl: string;

    customerAlias: string;

    databaseAlias: string;

    expirationDateUtc: Date;

    tokenBase64: string;

    tokenType: number;

    developerId: string;

    developerSecret: string;

    loginToken: string;

    constructor() {
        this.isAuthenticated = false;
        this.apiUrl = null;

        this.baseUrl = null;

        this.authenticationUrl = null;

        this.customerAlias = null;

        this.databaseAlias = null;

        this.expirationDateUtc = null;

        this.tokenBase64 = null;

        this.tokenType = 0;

        this.developerId = null;

        this.developerSecret = null;

        this.loginToken = null;
        

    }
}

(module ).exports = new sessionToken();
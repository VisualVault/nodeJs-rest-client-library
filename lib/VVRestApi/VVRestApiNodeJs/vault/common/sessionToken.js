var sessionToken = (function () {
    function sessionToken() {
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
    return sessionToken;
})();
(module).exports = new sessionToken();

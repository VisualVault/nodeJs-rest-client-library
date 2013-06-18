VV = require('./core');
var inherit = VV.util.inherit;
VV.Endpoint = inherit({
    constructor: function Endpoint(endpoint, config) {
        if(typeof endpoint === 'undefined' || endpoint === null) {
            throw new Error('Invalid endpoint: ' + endpoint);
        } else if(typeof endpoint !== 'string') {
            return VV.util.copy(endpoint);
        }
        if(!endpoint.match(/^http/)) {
            var useSSL = config && config.sslEnabled !== undefined ? config.sslEnabled : VV.config.sslEnabled;
            endpoint = (useSSL ? 'https' : 'http') + '://' + endpoint;
        }
        VV.util.update(this, VV.util.urlParse(endpoint));
        if(this.port) {
            this.port = parseInt(this.port, 10);
        } else {
            this.port = this.protocol === 'https:' ? 443 : 80;
        }
    }
});
VV.HttpRequest = inherit({
    constructor: function HttpRequest(endpoint, region, method, currentHeaders, data) {
        endpoint = new VV.Endpoint(endpoint);
        this.method = method.toUpperCase();
        this.path = endpoint.path || '/';
        this.headers = {
        };
        for(var headerName in currentHeaders) {
            this.headers[headerName] = currentHeaders[headerName];
        }
        this.body = data || '';
        this.endpoint = endpoint;
        this.region = region;
    },
    pathname: function pathname() {
        return this.path.split('?', 1)[0];
    },
    search: function search() {
        return this.path.split('?', 2)[1] || '';
    }
});
VV.HttpResponse = inherit({
    constructor: function HttpResponse() {
        this.statusCode = undefined;
        this.headers = {
        };
        this.body = undefined;
    }
});

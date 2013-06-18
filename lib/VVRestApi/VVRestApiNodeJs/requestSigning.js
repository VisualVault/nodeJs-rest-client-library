var crypto = require('crypto');
var uuid = require('node-uuid');
var VVRequestSigning = (function () {
    function VVRequestSigning() { }
    VVRequestSigning.prototype.sign = function (headers, targetUrl, method, data, developerId, developerSecret) {
        var algorithm = 'SHA256';
        var requestDate = new Date();
        var xRequestDate = requestDate.toISOString();
        headers["X-VV-RequestDate"] = xRequestDate;
        algorithm = algorithm || 'HS256';
        var algorithms = {
            RIPEMD160: 'ripemd160',
            SHA1: 'sha1',
            SHA256: 'sha256',
            SHA384: 'sha384',
            SHA512: 'sha512',
            MD5: 'md5'
        };
        var authAlgorithm = '';
        var authCredentials = developerId;
        var authSignedHeaders = '';
        var authNonce = uuid.v1();
        var authSignature = '';
        if(!algorithms[algorithm]) {
            throw new Error('Algorithm not supported');
        } else {
            authAlgorithm = 'VVA-HMAC-' + algorithm;
        }
        this.request = new VV.HttpRequest(targetUrl, 'region1', method, headers, data);
        authSignedHeaders = this.signedHeaders();
        var canonicalRequest = this.createCanonicalRequest();
        var stringToSign = authAlgorithm + '\n' + xRequestDate + '\n' + developerId + '\n' + this.hexEncodedHash(canonicalRequest);
        var kSigning = crypto.createHmac(algorithms[algorithm], xRequestDate).update(authNonce + developerSecret).digest('hex');
        authSignature = crypto.createHmac(algorithms[algorithm], kSigning).update(stringToSign).digest('hex');
        var xAuthorization = "Algorithm=" + authAlgorithm + ", Credential=" + authCredentials + ", SignedHeaders=" + authSignedHeaders + ", Nonce=" + authNonce + ", Signature=" + authSignature;
        headers["X-Authorization"] = xAuthorization;
    };
    VVRequestSigning.prototype.createCanonicalRequest = function () {
        var pathname = this.request.pathname();
        var parts = new Array();
        parts.push(this.request.method);
        parts.push(pathname.substring(pathname.indexOf('/api/')));
        parts.push(this.request.search());
        parts.push(this.canonicalHeaders());
        parts.push(this.signedHeaders());
        if(this.request.body != null && this.request.body.length > 0) {
            parts.push(this.hexEncodedHash(this.request.body));
        } else {
            parts.push('');
        }
        return parts.join('\n');
    };
    VVRequestSigning.prototype.canonicalHeaders = function () {
        var headers = [];
        VV.util.each.call(this, this.request.headers, function (key, item) {
            headers.push([
                key, 
                item
            ]);
        });
        headers.sort(function (a, b) {
            return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1;
        });
        var parts = [];
        VV.util.arrayEach.call(this, headers, function (item) {
            if(item[0] !== 'X-Authorization') {
                parts.push(item[0].toLowerCase() + ':' + this.canonicalHeaderValues(item[1].toString()));
            }
        });
        return parts.join('\n');
    };
    VVRequestSigning.prototype.canonicalHeaderValues = function (values) {
        return values.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    };
    VVRequestSigning.prototype.signedHeaders = function () {
        var keys = [];
        VV.util.each.call(this, this.request.headers, function (key) {
            key = key.toLowerCase();
            if(key !== 'X-Authorization') {
                keys.push(key);
            }
        });
        return keys.sort().join(';');
    };
    VVRequestSigning.prototype.hexEncodedHash = function (value) {
        return VV.util.crypto.sha256(value, 'hex');
    };
    VVRequestSigning.prototype.urlsafeB64Decode = function (str) {
        str += Array(5 - str.length % 4).join('=');
        return (new Buffer(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64')).toString('ascii', null, null);
    };
    VVRequestSigning.prototype.urlsafeB64Encode = function (str) {
        return (new Buffer(str, 'ascii')).toString('base64', null, null).replace(/\+/g, '-').replace(/\//g, '_').split('=')[0];
    };
    return VVRequestSigning;
})();
(module).exports = new VVRequestSigning();

///<reference path='dts\node.d.ts' />
///<reference path='dts\express.d.ts' />
///<reference path='dts\general.d.ts' />

var crypto = require('crypto');
//var VV: VaultCore = require('./core');
var uuid=require('node-uuid');


class VVRequestSigning {
    request : any;
 /**
 * Signs a request and returns a string that can be placed in the X-Authentication
 * @param {String} algorithm     Allowed values are: RIPEMD160, SHA1, SHA256, SHA384. SHA512, MD5.
 */    
 	sign(headers, targetUrl, method, data, developerId, developerSecret) {
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
		
		
		
		//VVA-HMAC-MD5, VVA-HMAC-RIPEMD160, VVA-HMAC-SHA1, VVA-HMAC-SHA256, VVA-HMAC-SHA384 and VVA-HMAC-SHA512
		var authAlgorithm = '';
		var authCredentials = developerId;
		var authSignedHeaders = '';
		var authNonce = uuid.v1(); //Create a GUID Nonce
		var authSignature = '';
		
        if (!algorithms[algorithm]) {
            throw new Error('Algorithm not supported');
        } else {
			authAlgorithm = 'VVA-HMAC-' + algorithm;
		}

		this.request = new VV.HttpRequest(targetUrl,'region1', method, headers,data);
		
		authSignedHeaders = this.signedHeaders();
		//CREATE THE CANONICAL REQUEST
		var canonicalRequest = this.createCanonicalRequest();
			
		var stringToSign = authAlgorithm + '\n' + xRequestDate + '\n' + developerId + '\n' + this.hexEncodedHash(canonicalRequest);
	
				
		var kSigning = crypto.createHmac(algorithms[algorithm], xRequestDate).update(authNonce + developerSecret).digest('hex');
		
		
		authSignature = crypto.createHmac(algorithms[algorithm], kSigning).update(stringToSign).digest('hex');
			
		var xAuthorization = "Algorithm=" + authAlgorithm + ", Credential=" + authCredentials + ", SignedHeaders=" + authSignedHeaders + ", Nonce=" + authNonce + ", Signature=" + authSignature;
	
		headers["X-Authorization"] = xAuthorization;
		
    }
	
	createCanonicalRequest() {
		var pathname = this.request.pathname();
		var parts = new Array();
		parts.push(this.request.method);
		parts.push(pathname.substring(pathname.indexOf('/api/')));
		parts.push(this.request.search());
		parts.push(this.canonicalHeaders());
		parts.push(this.signedHeaders());
		if (this.request.body != null && this.request.body.length > 0){
			parts.push(this.hexEncodedHash(this.request.body));
		} else {
			parts.push('');
		}
		return parts.join('\n');
	}
	

	canonicalHeaders() {
		var headers = [];
		VV.util.each.call(this, this.request.headers, function (key, item) {
		  headers.push([key, item]);
		});
		headers.sort(function (a, b) {
		  return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1;
		});
		var parts = [];
		VV.util.arrayEach.call(this, headers, function (item) {
		  if (item[0] !== 'X-Authorization') {
			parts.push(item[0].toLowerCase() + ':' +
			  this.canonicalHeaderValues(item[1].toString()));
		  }
		});
		return parts.join('\n');
	  }

	canonicalHeaderValues(values) {
		return values.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
	}

	signedHeaders() {
		var keys = [];
		VV.util.each.call(this, this.request.headers, function (key) {
		  key = key.toLowerCase();
		  if (key !== 'X-Authorization') keys.push(key);
		});
		return keys.sort().join(';');
	}

	hexEncodedHash(value : string) {
		return VV.util.crypto.sha256(value, 'hex');
	}
	
    urlsafeB64Decode(str) {
        str += Array(5 - str.length % 4).join('=');
        return (new Buffer(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64')).toString('ascii', null, null);
    }
	
    urlsafeB64Encode(str) {
        return (new Buffer(str, 'ascii')).toString('base64', null, null).replace(/\+/g, '-').replace(/\//g, '_').split('=')[0];
    }
}

declare var module: any;
(module).exports = new VVRequestSigning();
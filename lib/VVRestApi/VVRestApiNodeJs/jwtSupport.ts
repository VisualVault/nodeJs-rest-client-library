///<reference path='dts\node.d.ts' />
///<reference path='dts\express.d.ts' />
/* Copyright 2013 Auersoft */

var crypto = require('crypto');

class JWT {
    decode(jwt, key, verify) {
        verify = typeof verify === 'undefined' ? true : verify;

        var tks = jwt.split('.');
        if (tks.length != 3) {
            throw new Error('Wrong number of segments.');
        }

        var header = JSON.parse(this.urlsafeB64Decode(tks[0]));
        if (null === header) {
            throw new Error('Invalid segment encoding');
        }

        var payload = JSON.parse(this.urlsafeB64Decode(tks[1]));
        if (null === payload) {
            throw new Error('Invalid segment encoding');
        }

        if (verify) {
            if (!header.alg) {
                throw new Error('Empty algorithm');
            }
            if (this.urlsafeB64Decode(tks[2]) != this.sign([tks[0], tks[1]].join('.'), key, header.alg)) {
                throw new Error('Signature verification failed');
            }
        }

        return payload;
    }

    encode(payload, key, algo) {
        algo = algo || 'HS256';
        var header = {
                typ: 'JWT', alg: algo
            },
            segments = [
                this.urlsafeB64Encode(JSON.stringify(header)),
                this.urlsafeB64Encode(JSON.stringify(payload))
            ],
            signing_input = segments.join('.'),
            signature = this.sign(signing_input, key, algo);
        segments.push(this.urlsafeB64Encode(signature));
        return segments.join('.');
    }

    sign(msg, key, method) {
        method = method || 'HS256';
        var methods = {
            HS256: 'sha256',
            HS512: 'sha512'
        };
        if (!methods[method]) {
            throw new Error('Algorithm not supported');
        }
        return crypto.createHmac(methods[method], key).update(msg).digest('binary');
    }

    urlsafeB64Decode(str) {
        str += Array(5 - str.length % 4).join('=');
        return (new Buffer(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64')).toString('ascii', null, null);
    }

    urlsafeB64Encode(str) {
        return (new Buffer(str, 'ascii')).toString('base64', null, null).replace(/\+/g, '-').replace(/\//g, '_').split('=')[0];
    }
}

(module).exports = new JWT();

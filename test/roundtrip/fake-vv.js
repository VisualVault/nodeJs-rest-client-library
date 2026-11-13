// A fake VisualVault API and a fake .NET StudioApi in one process, for the round-trip tests.
//
// The Node script server and the real visualvault-api client talk to it over HTTP, so a test sees
// the requests a script run really makes: the OAuth grants, the getjwt calls, the VV API calls, and
// where the Completion went. Control routes under /__ let a test read and reset what it recorded.
//
// Start: FAKE_VV_PORT=3901 node test/roundtrip/fake-vv.js
var express = require('express');

var port = Number(process.env.FAKE_VV_PORT || 3901);
var host = process.env.FAKE_VV_HOST || undefined;
var selfUrl = 'http://localhost:' + port;

var state;

function reset() {
    state = {
        calls: [],
        counter: 0,
        accessTokens: {},
        refreshTokens: {},
        jwts: {},
        // Seconds. A test shortens them to force the client to refresh mid-run.
        accessTokenLifetime: 1200,
        jwtLifetime: 1200,
        // When false, /configuration/studioapi answers with no data, as a site without StudioApi does.
        studioApiEnabled: true
    };
}

reset();

function record(req, kind, extra) {
    var call = Object.assign({
        kind: kind,
        method: req.method,
        path: req.path,
        query: req.query,
        at: new Date().toISOString()
    }, extra || {});

    state.calls.push(call);

    return call;
}

function issue(prefix, store, lifetimeSeconds, owner) {
    state.counter += 1;

    var token = prefix + '-' + state.counter;

    store[token] = { owner: owner, expires: Date.now() + lifetimeSeconds * 1000 };

    return token;
}

function bearer(req) {
    var header = req.headers.authorization || '';

    return header.indexOf('Bearer ') === 0 ? header.slice('Bearer '.length) : null;
}

// Which login a bearer token belongs to, or null when it is unknown or expired.
function ownerOf(token) {
    var entry = state.accessTokens[token] || state.jwts[token];

    if (!entry || entry.expires < Date.now()) {
        return null;
    }

    return entry.owner;
}

function issueAccessToken(owner) {
    return {
        access_token: issue('at', state.accessTokens, state.accessTokenLifetime, owner),
        refresh_token: issue('rt', state.refreshTokens, 86400, owner),
        token_type: 'bearer',
        expires_in: state.accessTokenLifetime
    };
}

var app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

// --- Test control ---

app.get('/__calls', function (req, res) {
    res.json(state.calls);
});

app.post('/__reset', function (req, res) {
    reset();
    res.json({ ok: true });
});

app.post('/__config', function (req, res) {
    ['accessTokenLifetime', 'jwtLifetime', 'studioApiEnabled'].forEach(function (key) {
        if (req.body[key] !== undefined) {
            state[key] = req.body[key];
        }
    });

    res.json({ ok: true });
});

// --- OAuth ---

app.post('/OAuth/Token', function (req, res) {
    var body = req.body || {};

    if (body.grant_type === 'password') {
        // Records who logged in, never the secret or the password.
        record(req, 'oauth', { grant: 'password', clientId: body.client_id, username: body.username });

        if (body.password === 'wrong-password' || body.client_secret === 'wrong-secret') {
            return res.status(401).json({ error: 'invalid_grant' });
        }

        return res.json(issueAccessToken({ clientId: body.client_id, username: body.username }));
    }

    if (body.grant_type === 'refresh_token') {
        var entry = state.refreshTokens[body.refresh_token];

        record(req, 'oauth', { grant: 'refresh_token', known: Boolean(entry) });

        if (!entry) {
            return res.status(400).json({ error: 'invalid_grant' });
        }

        return res.json(issueAccessToken(entry.owner));
    }

    record(req, 'oauth', { grant: body.grant_type || null });
    res.status(400).json({ error: 'unsupported_grant_type' });
});

// The JWT-to-JWT exchange (Authorize.__getJwt).
app.get('/OAuth/Token', function (req, res) {
    var owner = ownerOf(bearer(req));

    record(req, 'oauth', { grant: 'jwt', known: Boolean(owner) });

    if (!owner) {
        return res.status(401).json({ error: 'invalid_token' });
    }

    res.json({ data: { token: issue('jwt', state.jwts, state.jwtLifetime, owner), expires: new Date(Date.now() + state.jwtLifetime * 1000).toISOString() } });
});

// What kind of bearer token a request carried: the fake's own (at-, jwt-), a signed JWT, or VVCore's
// encrypted JWT form (one long segment with no dots, which is what VVCore users/getjwt returns).
function tokenKind(token) {
    if (!token) {
        return null;
    }

    if (token.split('.').length === 3) {
        return 'signed-jwt';
    }

    if (token.length >= 500) {
        return 'vvcore-jwt';
    }

    return token.split('-')[0];
}

// --- Fake StudioApi (.NET): the Completion endpoint (spec §8.2) ---

app.post('/studio/api/v1/Microservices/runs/:runToken/completion', function (req, res) {
    var token = bearer(req);
    // FAKE_ACCEPT_ANY_BEARER=1 when a real VVCore issued the JWT (tier 2): the fake cannot verify it.
    var acceptAny = process.env.FAKE_ACCEPT_ANY_BEARER === '1' && Boolean(token);
    var owner = acceptAny ? { external: true } : ownerOf(token);

    record(req, 'studioapi-completion', {
        runToken: req.params.runToken,
        tokenKind: tokenKind(token),
        owner: owner
    });

    if (!owner) {
        return res.status(401).json({ meta: { status: 401 } });
    }

    if (req.query.action !== 'complete') {
        return res.status(400).json({ meta: { status: 400, errors: [{ code: 'invalid-action' }] } });
    }

    res.json({ meta: { status: 200 }, data: { runToken: req.params.runToken } });
});

// --- VV API ---

var api = express.Router({ mergeParams: true });

api.use(function (req, res, next) {
    var owner = ownerOf(bearer(req));

    if (!owner) {
        record(req, 'vv-api-unauthorized');

        return res.status(401).json({ meta: { status: 401, statusMsg: 'Unauthorized' } });
    }

    req.owner = owner;
    next();
});

api.get('/users/getjwt', function (req, res) {
    record(req, 'getjwt', { owner: req.owner });

    var jwt = issue('jwt', state.jwts, state.jwtLifetime, req.owner);

    res.json({ meta: { status: 200 }, data: { token: jwt, expires: new Date(Date.now() + state.jwtLifetime * 1000).toISOString() } });
});

api.get('/configuration/:name', function (req, res) {
    if (req.params.name === 'studioapi' && state.studioApiEnabled) {
        return res.json({ meta: { status: 200 }, data: { isEnabled: true, studioApiUrl: selfUrl + '/studio' } });
    }

    res.json({ meta: { status: 200 }, data: null });
});

// The legacy Completion (VVCore ScheduledProcess).
api.post('/scheduledProcess/:id', function (req, res) {
    record(req, 'vvcore-completion', { id: req.params.id, owner: req.owner });
    res.json({ meta: { status: 200 }, data: { id: req.params.id } });
});

// Everything else a test script calls: recorded, answered with an empty success envelope.
api.all('*', function (req, res) {
    record(req, 'vv-api', { owner: req.owner, body: req.body });
    res.json({ meta: { status: 200, method: req.method, path: req.path }, data: [] });
});

app.use('/api/v1/:customerAlias/:databaseAlias', api);

app.use(function (req, res) {
    record(req, 'unmatched');
    res.status(404).json({ meta: { status: 404 } });
});

app.listen(port, host, function () {
    console.log('fake VV API listening on ' + selfUrl);
});

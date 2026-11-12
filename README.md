# VisualVault Node.js script server

![Notice: npm package moved](https://img.shields.io/badge/npm%20package-moved-orange)

> This repository holds the VisualVault Node.js script server. The `visualvault-api` npm package it depends on is built from [vv-rest-api-node](https://github.com/VisualVault/vv-rest-api-node); send package updates, issues, and pull requests there.

The server runs customer scripts on behalf of VisualVault. VisualVault posts a script to it over HTTP; the server writes the script to disk, loads it, authenticates to the VisualVault REST API through the `visualvault-api` client, and calls the script's `main()`.

## Requirements

- Node.js 20.0.0 or higher

## Running the server

```bash
npm install
node lib/VVRestApi/VVRestApiNodeJs/app.js
```

The server listens on `PORT`, or 3000 when `PORT` is unset. `GET /` returns a greeting naming the running Node version; use it to confirm the server is up.

## Routes

| Route | Purpose |
|---|---|
| `GET /`, `GET /app.js` | Greeting naming the Node version |
| `POST /scripts`, `GET /scripts` | Run an on-demand script |
| `POST /scheduledscripts` | Run a scheduled script |
| `GET /testscripts/scheduled/:name` | Run a named script from `scripts/test-scripts/scheduled/` |

Every route is also registered under a `/node/` prefix and under the virtual directory alias in `app.js`, which is `vvnodeserver`. A request that omits the alias still matches.

## Where scripts come from

A posted script is written to a `files/` directory beside the server's entry point and required from there, so a script's relative `require` paths resolve against that `files/` directory. The repository also carries sample and test scripts under `scripts/`; they still use the v1 client call patterns, so they are not a current example.

## The client library

The server authenticates with the credentials a script returns from `getCredentials()`, then passes the resulting `visualvault-api` client into the script's `main()`: the first argument for scheduled scripts, the second for form scripts. `package.json` pins the package to an exact version. For the client's own API, see [vv-rest-api-node](https://github.com/VisualVault/vv-rest-api-node).

## Support

For setup and debugging, see [Readme-microservices](https://github.com/VisualVault/nodeJs-rest-client-library/blob/master/Readme-microservices.md).

For more information about the VisualVault API, visit the [VisualVault documentation](https://docs.visualvault.com/).

## License

Use of the VisualVault API requires a customer hosting contract which defines all license terms.

## Repository

[GitHub Repository](https://github.com/VisualVault/nodeJs-rest-client-library)

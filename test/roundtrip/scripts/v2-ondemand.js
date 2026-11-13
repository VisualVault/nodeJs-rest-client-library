// v2 on-demand script: async/await, native promises, no getCredentials (runs as the Run-as user
// unless the runner adds getCredentials), opts out of the v1 shims.
function markRan(name) {
    if (process.env.RT_MARKER_DIR) {
        require('fs').writeFileSync(require('path').join(process.env.RT_MARKER_DIR, name), 'ran');
    }
}

module.exports.clientCompatibility = 'v2';

{{GET_CREDENTIALS}}

module.exports.main = async function (ffCollection, vvClient, response) {
    markRan('{{MARKER}}');

    try {
        const pending = vvClient.users.getUser({ q: "[userid] eq 'nobody'" });
        const nativePromise = pending instanceof Promise;
        const resp = JSON.parse(await pending);

        response.json(200, [
            { name: 'status', value: resp.meta.status },
            { name: 'nativePromise', value: nativePromise },
            { name: 'echo', value: ffCollection.getFormFieldByName('Name') ? ffCollection.getFormFieldByName('Name').value : null }
        ]);
    } catch (err) {
        response.json(200, [{ name: 'error', value: String(err) }]);
    }
};

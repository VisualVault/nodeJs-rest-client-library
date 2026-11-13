// v2 scheduled script: async/await, no getCredentials unless the runner adds it. Answers early, then
// keeps calling the VV API for {{RUN_SECONDS}} seconds, then posts its Completion.
function markRan(name) {
    if (process.env.RT_MARKER_DIR) {
        require('fs').writeFileSync(require('path').join(process.env.RT_MARKER_DIR, name), 'ran');
    }
}

module.exports.clientCompatibility = 'v2';

{{GET_CREDENTIALS}}

module.exports.main = async function (vvClient, response, token) {
    markRan('{{MARKER}}');

    response.json(200, { message: 'v2 scheduled script started' });

    const until = Date.now() + Number('{{RUN_SECONDS}}') * 1000;
    let calls = 0;
    let failures = 0;

    try {
        do {
            try {
                await vvClient.sites.getSites({});
                calls += 1;
            } catch (err) {
                failures += 1;
                console.log('v2 scheduled call failed: ' + err.message);
            }

            if (Date.now() < until) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        } while (Date.now() < until);

        console.log('v2 scheduled summary token=' + token + ' calls=' + calls + ' failures=' + failures);

        const completion = await vvClient.scheduledProcess.postCompletion(token, 'complete', failures === 0, 'calls=' + calls + ' failures=' + failures);

        console.log('v2 scheduled completion token=' + token + ' response=' + String(completion).slice(0, 300));
    } catch (err) {
        console.log('v2 scheduled completion failed: ' + err.message);
    }
};

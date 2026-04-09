/**
 * VV.Form.Global.CallMicroservice
 * Parameters: 2
 * Extracted: 2026-04-09
 */
function (microserviceName, data) {
return (async () => {
  /* ---------------------------- HELPER FUNCTIONS ---------------------------- */
  async function fetchMicroservice(name, body) {
    const url =
      `${VV.BaseAppUrl}api/v1/` +
      `${VV.CustomerAlias}/` +
      `${VV.CustomerDatabaseAlias}/` +
      `scripts?name=${encodeURIComponent(name)}`;

    const requestObj = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    };

    const response = await fetch(url, requestObj);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    try {
      return await response.json();
    } catch (e) {
      return { parseError: true };
    }
  }

  function checkResponse(res) {
    /* ----------------------------- ERROR MESSAGES ----------------------------- */
    const ERROR_MESSAGES = {
      MICROSERVICE_ERROR: (res) => `An error was encountered. ${res.data[1]}`,

      COMMUNICATION_ERROR: (res) =>
        `A status code of ${res.status} returned from the server. There is a communication problem with the web servers. If this continues, please contact the administrator and communicate to them this message and where it occurred.`,

      CLIENT_ERROR: (res) =>
        `A status code of ${res.status} returned from the server. The request could not be processed. If this continues, please contact support.`,

      SERVER_UNAVAILABLE: (res) =>
        `A status code of ${res.statusCode} with a message of '${res.errorMessages[0].message}' returned from the server.  This may mean that the servers to run the business logic are not available.`,

      UNDEFINED_STATUS: (res) =>
        'The status of the response returned as undefined.',

      UNHANDLED_MICROSERVICE_RESPONSE: (res) =>
        `An unhandled response occurred when calling ${microserviceName}. The form will not save at this time.  Please try again or communicate this issue to support.`,

      NODEJS_SERVER_ERROR: (res) =>
        `The following unhandled response occurred while attempting to retrieve data on the server side get data logic: ${res.meta?.statusMsg || res.data?.error || res.message}`,

      JSON_PARSE_ERROR: (res) =>
        `Unable to parse server response. The server may have returned an invalid format.`,

      NETWORK_UNAVAILABLE_ERROR: (res) =>
        `Network unavailable: Unable to connect to the server. Please check your internet connection and try again.`,
    };

    /* ------------------------------ ERROR CHECKS ------------------------------ */

    // Layer 1: Network error
    if (res.name === 'TypeError' && res.message.includes('fetch')) {
      throw new Error(ERROR_MESSAGES.NETWORK_UNAVAILABLE_ERROR());
    }

    // Layer 1: HTTP error (non-2xx status)
    if (typeof res.status !== 'undefined') {
      if (res.status >= 400 && res.status < 500) {
        throw new Error(ERROR_MESSAGES.CLIENT_ERROR(res));
      }
      throw new Error(ERROR_MESSAGES.COMMUNICATION_ERROR(res));
    }

    // Layer 1: JSON parse error
    if (res.parseError) {
      throw new Error(ERROR_MESSAGES.JSON_PARSE_ERROR(res));
    }

    // Layer 2: VisualVault API error
    if (typeof res.statusCode !== 'undefined') {
      throw new Error(ERROR_MESSAGES.SERVER_UNAVAILABLE(res));
    }

    // Layer 3: VisualVault API success path (meta.status == '200')
    if (res.meta && res.meta.status === 200) {
      // Layer 4: Missing data
      if (!res.data || !res.data[0]) {
        throw new Error(ERROR_MESSAGES.UNDEFINED_STATUS(res));
      }

      // Layer 4: Script error
      if (res.data[0] !== 'Success') {
        if (res.data[0] === 'Error') {
          throw new Error(ERROR_MESSAGES.MICROSERVICE_ERROR(res));
        } else {
          throw new Error(ERROR_MESSAGES.UNHANDLED_MICROSERVICE_RESPONSE(res));
        }
      }

      // Success
      return res;
    } else {
      // Layer 3: Node.js server error (fallback - no meta.status == '200')
      throw new Error(ERROR_MESSAGES.NODEJS_SERVER_ERROR(res));
    }
  }



  /* ---------------------------------- MAIN ---------------------------------- */

  if (!microserviceName) {
    throw new Error('Microservice name is required');
  }

  const msTimeout = 20000; // Default 20s. Increase it if there are file uploads

  const microserviceResp = await VV.Form.Global.retry(() =>
    VV.Form.Global.timeout(fetchMicroservice(microserviceName, data), msTimeout)
  );

  return checkResponse(microserviceResp);
})();

}

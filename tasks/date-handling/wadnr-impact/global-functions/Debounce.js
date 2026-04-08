/**
 * VV.Form.Global.Debounce
 * Parameters: 2
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (func, delay) {
/*
    Script Name:   Debounce
    Purpose:       Instantiates a "debounced" version of a function that limits and delays its execution up to a 
                   specific number of milliseconds

    Parameters:    func (Function, Required)
                   delay (Number, Required) - Time to delay, in ms

    Return Value:  A promise that resolves to the return value of the delayed function

    Date of Dev: 02/04/2026
    Revision Notes:
    02/04/2026 - Moises Savelli: Script created
    02/27/2026 - John Sevilla: Fix error that could occur when delayed function returns a promise
*/
let pendingPromise, resolve, reject, timeoutId;
resetInstanceVariables();

function resetInstanceVariables() {
  pendingPromise = null;
  resolve = null;
  reject = null;
  timeoutId = null;
}

return function () {
  const context = this; // Important when func is created by .bind (e.g. func.bind(VV.Form))
  const args = arguments;

  // Initialize promise that resolves when func executes
  if (!pendingPromise) {
    pendingPromise = new Promise((res, rej) => {
      resolve = res;
      reject = rej
    });
  }

  // Delay execution of function (if not already delayed)
  if (!timeoutId) {
    timeoutId = setTimeout(() => {
      // Execute func then resolve with its return value
      Promise.resolve(func.apply(context, args)).then((result) => {
        resolve(result);
      }).catch((error) => {
        const formattedErrorMessage = `Unable to resolve debounced ${func.name || 'function'}! ${error.message}`;
        if (typeof reject === 'function') {
          reject(formattedErrorMessage);
        } else {
          console.error(formattedErrorMessage);
        }
      }).finally(() => {
        resetInstanceVariables(); // sets timeoutId to null*
      });
    }, delay);
  }

  return pendingPromise;
};

}

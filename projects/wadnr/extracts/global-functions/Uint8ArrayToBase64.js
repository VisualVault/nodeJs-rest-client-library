/**
 * VV.Form.Global.Uint8ArrayToBase64
 * Parameters: 1
 * Extracted: 2026-04-10
 */
function (blobdata) {

//pass in data

function uint8ArrayToBase64() {
    console.log("Inside uint8ArrayToBase64!");

    let binaryString = '';
    const chunkSize = 0x8000; // 32KB
    for (let i = 0; i < blobdata.length; i += chunkSize) {
      binaryString += String.fromCharCode.apply(
        null,
        blobdata.subarray(i, i + chunkSize)
      );
    }
    console.log("Returning back base64");

    return btoa(binaryString);
  }
}

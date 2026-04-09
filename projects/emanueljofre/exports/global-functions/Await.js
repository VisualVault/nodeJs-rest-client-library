/**
 * VV.Form.Global.Await
 * Parameters: 1
 * Extracted: 2026-04-09
 */
function (fn) {
return fn().then((res)=>{
    console.log("res ", res)
    return res
})
}

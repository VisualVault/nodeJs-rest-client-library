/**
 * VV.Form.Global.CustomCSS
 * Parameters: 0
 * Extracted: 2026-04-10
 */
function () {
var bootstrapCSS = '.tt-input, \/* UPDATE: newer versions use tt-input instead of tt-query *\/\r\n.tt-hint {\r\n  width: 396px;\r\n  height: 30px;\r\n  padding: 8px 12px;\r\n  font-size: 24px;\r\n  line-height: 30px;\r\n  border: 2px solid #ccc;\r\n  border-radius: 8px;\r\n  outline: none;\r\n}\r\n\r\n.tt-input {\r\n  \/* UPDATE: newer versions use tt-input instead of tt-query *\/\r\n  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);\r\n}\r\n\r\n.tt-hint {\r\n  color: #999;\r\n}\r\n\r\n.tt-menu {\r\n  \/* UPDATE: newer versions use tt-menu instead of tt-dropdown-menu *\/\r\n  width: 830px;\r\n  margin-top: 12px;\r\n  padding: 8px 0;\r\n  background-color: #fff;\r\n  border: 1px solid #ccc;\r\n  border: 1px solid rgba(0, 0, 0, 0.2);\r\n  border-radius: 8px;\r\n  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);\r\n}\r\n\r\n.tt-suggestion {\r\n  padding: 3px 20px;\r\n  margin-top: 5px;\r\n  font-size: 18px;\r\n  line-height: 24px;\r\n}\r\n\r\n.tt-suggestion.tt-cursor {\r\n  \/* UPDATE: newer versions use .tt-suggestion.tt-cursor *\/\r\n  color: #fff;\r\n  background-color: #2391ec;\r\n}\r\n\r\n.tt-suggestion p {\r\n  margin: 0;\r\n}\r\n'

var bootstrapStyle = document.createElement('style');
bootstrapStyle.innerHTML = bootstrapCSS;
var firstStyle = document.head.getElementsByTagName('style')[0];
// this is done so subsequent styles in DOM override bootstrap styles
document.head.insertBefore(bootstrapStyle, firstStyle);
}

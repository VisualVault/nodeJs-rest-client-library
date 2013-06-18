var VaultCore = (function () {
    function VaultCore() {
        this.VERSION = 'v1.0.0';
        this.ServiceInterface = {
        };
        this.Signers = {
        };
        this.XML = {
        };
    }
    return VaultCore;
})();
;
if(typeof (VV) == 'undefined' || VV == null) {
    VV = new VaultCore();
}
(module).exports = VV;
require('./util');
require('./http');

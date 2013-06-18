///<reference path='dts\node.d.ts' />
///<reference path='dts\express.d.ts' />

/**
 * Copyright 2013 VisualVault.com, Inc. or its affiliates. All Rights Reserved.
 *
 *
 * Copyright 2012-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You
 * may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */

class VaultCore {

     /**  * @constant
   */
  VERSION : string;

  /**
   * @api private
   */
  ServiceInterface : any;

  /**
   * @api private
   */
  Signers : any;

  /**
   * @api private
   */
  XML : any;

  util: any;
  Endpoint: any;
  config: any;
  HttpRequest: any;
  HttpResponse: any;

  constructor() {
            this.VERSION = 'v1.0.0';
            this.ServiceInterface = {};
            this.Signers = {};
            this.XML = {};
  };
	
 
};

if (typeof(VV) == 'undefined' || VV == null) {
    VV = new VaultCore;
}

(module ).exports = VV;

require('./util');
require('./http');
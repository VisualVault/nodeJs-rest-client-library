/**
 * ActivityMapCreateFeatureFromShapefile
 * Category: Workflow
 * Modified: 2026-01-28T22:07:22.05Z by ross.rhone@visualvault.com
 * Script ID: Script Id: d5e3ecb3-4fb4-f011-82ff-991bc11c012d
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
const logger = require('../log');
const { getItem, searchItems } = require('@esri/arcgis-rest-portal');
const { ApplicationCredentialsManager, request, ArcGISRequestError } = require('@esri/arcgis-rest-request');
const { addFeatures, getLayer } = require('@esri/arcgis-rest-feature-service');
const { Blob } = require('node:buffer');

module.exports.getCredentials = function () {
    var options = {};
    options.customerAlias = 'WADNR';
    options.databaseAlias = 'fpOnline';
    options.userId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.password = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    options.clientId = '09f356bb-3f44-49b1-a55f-d2caa2de9cc1';
    options.clientSecret = 'xlzFwRAIHZS9FYC/tqTWs+1IgQFpwG+pWNNW9VQaYSo=';
    return options;
};

module.exports.main = async function (ffCollection, vvClient, response) {
    /*Script Name:   ActivityMapCreateFeatureFromShapeFile
     Customer:       WA FNR: fpOnline
     Purpose:        Take the shapefile uploaded from the activity map and create features on the AGOL hosted feature layer
                     based on the selected layer in the form. That will be displayed on the activity map.
                     The shapefile must have a field named 'fp_id' to link the features to the application.
                      
                     The process will:
                      1° Authenticate with AGOL as an application
                      2° Get the shapefile from the form field
                      3° AGOL Analyze the shapefile to get the publishParameters
                      4° AGOL turn the same uploaded shapefile into a featureCollection
                      5° AGOL Find the hosted feature layer / service by layer title
                      6° AGOL Find the hosted feature table by the feature layer / service id
                      7° AGOL Get & Read layer metadata to know which fields are required and can be null
                      8° Validate and prepare attributes for each feature
                      9° Get & Merge geometries with attributes
                     10° AGOL Add features to the hosted feature layer / service
                     11° Zoom to the features created from the shapefile on the map
  
     Date of Dev:   12/05/2025
     Last Rev Date: 
     Revision Notes:
     12/05/2025 - Ross Rhone:  First Setup of the script

    /* -------------------------------------------------------------------------- */
    /*                    Response and error handling variables                   */
    /* -------------------------------------------------------------------------- */

    // Response array
    let outputCollection = [];
    // Array for capturing error messages that may occur during the process
    let errorLog = [];

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Variables                           */
    /* -------------------------------------------------------------------------- */

    const GIS_CLIENT_ID = 'BKCsdVEsjVpW2zKC';
    const GIS_CLIENT_SECRET = '0b1780b9447c4f0084fafd540104a6a6';

    function getFieldValueByName(fieldName, isOptional = false) {
        /*
    Check if a field was passed in the request and get its value
    Parameters:
        fieldName: The name of the field to be checked
        isOptional: If the field is required or not
    */
        let fieldValue = ''; // Default value

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exits
                fieldValue = 'value' in field ? field.value : fieldValue;

                // Trim the value if it's a string to avoid strings with only spaces like "   "
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                // Check if the field is required and if it has a value. Added a condition to avoid 0 to be considered a falsy value
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                // Check if the field is a dropdown with the default value "Select Item"
                // Some dropdowns have this value as the default one but some others don't
                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            errorLog.push(error.message);
        } finally {
            return fieldValue;
        }
    }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const jitter = (ms) => {
        const d = Math.floor(ms * 0.2); // ±20% jitter
        return ms + Math.floor((Math.random() * 2 - 1) * d);
    };

    // Decide if an error is likely transient vs. permanent
    function isTransient(err) {
        // ArcGIS REST errors
        if (err instanceof ArcGISRequestError) {
            const s = Number(err?.response?.error.code);
            // Retry on rate limits and 5xx
            if (s === 429 || (s >= 500 && s < 600)) return true;
            // Some gateways return 0/undefined; be lenient if there's a network hint
            if (!s && /timeout|network|fetch|failed|ECONNRESET|ETIMEDOUT/i.test(String(err?.message))) return true;
            return false; // other 4xx -> don't retry
        }

        // Generic/network-ish errors
        if (/timeout|network|fetch|failed|ECONNRESET|ETIMEDOUT/i.test(String(err?.message))) return true;
        return false;
    }

    // Generic retry wrapper (exponential backoff + jitter)
    async function withRetry(
        fn,
        {
            retries = 3, // total attempts = 1 + retries
            baseDelayMs = 1000,
            maxDelayMs = 8000,
            label = 'operation',
            onRetry = (err, attempt, nextDelay) => {
                console.warn(
                    `[retry] ${label} attempt ${attempt} failed: ${err?.message || err}. Retrying in ${nextDelay}ms...`
                );
            },
        } = {}
    ) {
        let attempt = 0;
        let delay = baseDelayMs;

        while (true) {
            try {
                return await fn();
            } catch (err) {
                attempt++;
                if (!isTransient(err) || attempt > retries) throw err;
                const wait = jitter(Math.min(delay, maxDelayMs));
                onRetry(err, attempt, wait);
                await sleep(wait);
                delay = Math.min(delay * 2, maxDelayMs);
            }
        }
    }

    // request() with retries
    function requestWithRetry(url, { label = `request(${url})`, retries = 3, ...opts } = {}) {
        return withRetry(() => request(url, opts), { retries, label });
    }

    // function-call wrapper (great for arcgis-rest-js helpers like searchItems/getItem/updateItem)
    function callWithRetry(fn, args, { label = fn.name || 'call', retries = 3 } = {}) {
        return withRetry(() => fn(args), { retries, label });
    }

    async function toBlobFromBase64(b64) {
        const cleaned = String(b64 || '')
            .replace(/^data:.*?;base64,/, '')
            .trim();
        const normalized = cleaned.replace(/-/g, '+').replace(/_/g, '/');
        const buf = Buffer.from(normalized, 'base64');
        const bytes = new Uint8Array(buf);

        return new Blob([bytes], { type: 'application/octet-stream' });
    }

    function setEmptyDefaultValues(attributeType) {
        switch (attributeType) {
            case 'esriFieldTypeString':
                return 'No Value';
            case 'esriFieldTypeInteger':
            case 'esriFieldTypeSmallInteger':
            case 'esriFieldTypeDouble':
                return 0;
            default:
                return null;
        }
    }

    /**
     * Throws if there are no features, or if any feature has null/undefined geometry.
     * Collects all problems and throws once with a readable message.
     */
    function assertGeometriesPresent(fc, { logger, errorLog } = {}) {
        const layers = fc?.featureCollection?.layers ?? [];

        // Gather all features with simple indices/names for messages
        const featuresByLayer = layers.map((layer, li) => ({
            name: layer?.layerDefinition?.name || layer?.title || `Layer ${li}`,
            li,
            features: layer?.featureSet?.features ?? [],
        }));

        // Find missing geometries
        const problems = [];
        for (const layer of featuresByLayer) {
            layer.features.forEach((f, fi) => {
                if (f?.geometry == null) {
                    const objectId =
                        f?.attributes?.OBJECTID ?? f?.attributes?.ObjectID ?? f?.attributes?.objectid ?? 'unknown';
                    problems.push(
                        `Shapefile is missing geometry (layer="${layer.name}", featureIndex=${fi}, OBJECTID=${objectId})`
                    );
                }
            });
        }

        if (problems.length) {
            const msg = problems.join('; ');
            logger?.error?.(msg);
            errorLog?.push?.(msg);
            throw new Error(msg);
        }
    }

    function validateZipHeaders(
        buffer,
        { maxTotalUncompressedMB = 50, maxPerFileUncompressedMB = 25, maxEntries = 100, allowedExts = null } = {}
    ) {
        const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const entries = parseCentralDirectory(u8); // reuse your function verbatim

        if (!entries.length) return { ok: false, reason: 'Empty ZIP' };
        if (entries.length > maxEntries) return { ok: false, reason: `Too many entries (> ${maxEntries})` };

        const allow = Object.create(null);
        if (Array.isArray(allowedExts)) for (const e of allowedExts) allow[e] = true;

        const MAX_PER = Math.floor(maxPerFileUncompressedMB * 1024 * 1024);
        const MAX_TOT = Math.floor(maxTotalUncompressedMB * 1024 * 1024);

        let total = 0;
        for (const e of entries) {
            const name = e.name || '';
            const lower = name.toLowerCase();
            if (lower.includes('..') || lower.startsWith('/') || name.includes('\\'))
                return { ok: false, reason: 'Path traversal detected' };
            if (lower.endsWith('/')) continue;
            if (allowedExts) {
                const dot = lower.lastIndexOf('.');
                const ext = dot >= 0 ? lower.slice(dot) : '';
                if (!allow[ext]) return { ok: false, reason: `Disallowed extension: ${ext || '(none)'}` };
            }
            const uSize = e.uncompressedSize;
            if (!Number.isFinite(uSize)) return { ok: false, reason: `Unknown uncompressed size for ${name}` };
            if (uSize > MAX_PER)
                return { ok: false, reason: `Entry ${name} too large (> ${maxPerFileUncompressedMB} MB)` };
            total += uSize;
            if (total > MAX_TOT)
                return { ok: false, reason: `Total projected uncompressed exceeds ${maxTotalUncompressedMB} MB` };
        }
        return { ok: true, totalProjected: total, entries: entries.length };
    }

    /**
     * parseCentralDirectory
     * Minimal central directory reader supporting classic ZIP and ZIP64 (basic fields).
     * Returns array of { name, uncompressedSize, compressedSize }.
     * No inflation. Throws on malformed structures.
     */
    function parseCentralDirectory(u8) {
        const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        const sigEOCD = 0x06054b50; // End of central dir
        const sigCDH = 0x02014b50; // Central directory header
        const sigZIP64_EOCD = 0x06064b50;
        const sigZIP64_LOC = 0x07064b50;

        // 1) Locate EOCD by scanning last 66KB
        const maxScan = Math.min(u8.length, 66 * 1024);
        let eocdPos = -1;
        for (let i = u8.length - 22; i >= u8.length - maxScan; i--) {
            if (i < 0) break;
            if (dv.getUint32(i, true) === sigEOCD) {
                eocdPos = i;
                break;
            }
        }
        if (eocdPos < 0) throw new Error('EOCD not found');

        // EOCD structure (without comment):
        // [0]  4  signature
        // [4]  2  disk number
        // [6]  2  disk where CD starts
        // [8]  2  number of CD records on this disk
        // [10] 2  total number of CD records
        // [12] 4  size of the central directory
        // [16] 4  offset of start of central directory
        // [20] 2  comment length
        const totalCDRecords = dv.getUint16(eocdPos + 10, true);
        let cdSize = dv.getUint32(eocdPos + 12, true);
        let cdOffset = dv.getUint32(eocdPos + 16, true);
        const comLen = dv.getUint16(eocdPos + 20, true);

        // Optional ZIP64 locator handling (very basic)
        if (totalCDRecords === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
            // Try ZIP64 locator signature near EOCD
            // ZIP64 locator: 4(sig) + 4(disk) + 8(EOCD64 offset) + 4(total disks)
            // Scan small window before EOCD for locator (usually EOCD64 locator is right before EOCD)
            const startScan = Math.max(0, eocdPos - 56);
            for (let p = eocdPos - 4; p >= startScan; p--) {
                if (dv.getUint32(p, true) === sigZIP64_LOC) {
                    const eocd64Offset = Number(dv.getBigUint64(p + 8, true));
                    if (eocd64Offset + 56 <= u8.length && dv.getUint32(Number(eocd64Offset), true) === sigZIP64_EOCD) {
                        // ZIP64 EOCD basic fields:
                        // skip to total records/size/offset (fixed positions within EOCD64)
                        // structure varies; we read the canonical documented offsets
                        const total64 = Number(dv.getBigUint64(Number(eocd64Offset) + 32, true));
                        const size64 = Number(dv.getBigUint64(Number(eocd64Offset) + 40, true));
                        const off64 = Number(dv.getBigUint64(Number(eocd64Offset) + 48, true));
                        if (Number.isFinite(total64)) cdSize = size64;
                        if (Number.isFinite(off64)) cdOffset = off64;
                        // total records can be read but we don't strictly need it
                    }
                    break;
                }
            }
        }

        if (cdOffset + cdSize > u8.length) throw new Error('Central directory out of bounds');

        // 2) Parse central directory entries
        const out = [];
        let p = cdOffset;
        let count = 0;
        while (p < cdOffset + cdSize) {
            if (dv.getUint32(p, true) !== sigCDH) {
                throw new Error('Central directory header signature mismatch');
            }
            // Central directory header layout:
            //  0  4  signature (0x02014b50)
            //  4  2  version made by
            //  6  2  version needed
            //  8  2  flags
            // 10  2  compression
            // 12  2  mod time
            // 14  2  mod date
            // 16  4  crc-32
            // 20  4  compressed size
            // 24  4  uncompressed size
            // 28  2  file name length (n)
            // 30  2  extra length (m)
            // 32  2  comment length (k)
            // 34  2  disk number start
            // 36  2  internal file attrs
            // 38  4  external file attrs
            // 42  4  relative offset of local header
            // 46  n  filename
            // 46+n m  extra
            // 46+n+m k comment
            const compSize32 = dv.getUint32(p + 20, true);
            const uncomp32 = dv.getUint32(p + 24, true);
            const nameLen = dv.getUint16(p + 28, true);
            const extraLen = dv.getUint16(p + 30, true);
            const commLen = dv.getUint16(p + 32, true);

            const nameStart = p + 46;
            const nameEnd = nameStart + nameLen;
            const extraStart = nameEnd;
            const extraEnd = extraStart + extraLen;

            const name = utf8From(u8.subarray(nameStart, nameEnd));

            let compressedSize = compSize32;
            let uncompressedSize = uncomp32;

            // ZIP64 extra field fix-up if needed
            if (compSize32 === 0xffffffff || uncomp32 === 0xffffffff) {
                // Extra field is a sequence of headers: [2:id][2:size][size:data]
                let q = extraStart;
                while (q + 4 <= extraEnd) {
                    const hdrId = dv.getUint16(q, true);
                    const hdrSize = dv.getUint16(q + 2, true);
                    const dataStart = q + 4;
                    const dataEnd = dataStart + hdrSize;
                    if (dataEnd > extraEnd) break;

                    if (hdrId === 0x0001) {
                        // ZIP64 extra: fields present only when corresponding 32-bit value was 0xFFFFFFFF
                        let r = dataStart;
                        if (uncomp32 === 0xffffffff && r + 8 <= dataEnd) {
                            uncompressedSize = Number(dv.getBigUint64(r, true));
                            r += 8;
                        }
                        if (compSize32 === 0xffffffff && r + 8 <= dataEnd) {
                            compressedSize = Number(dv.getBigUint64(r, true));
                            r += 8;
                        }
                        // (we ignore relative header offset/disk start)
                        break;
                    }
                    q = dataEnd;
                }
            }

            out.push({ name, uncompressedSize, compressedSize });
            count++;

            p = extraEnd + commLen; // move to next central directory entry
        }
        return out;

        // utf-8 decode helper
        function utf8From(bytes) {
            if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
            // fallback
            let s = '';
            for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
            try {
                return decodeURIComponent(escape(s));
            } catch {
                return s;
            }
        }
    }

    async function debugRawResponseViaArcgisRequest(url, requestOptions, tag = 'RAW RESPONSE') {
        try {
            // Make the SAME request, but ask for the raw Response object
            const res = await request(url, { ...requestOptions, rawResponse: true });

            // res is a fetch Response-like object
            const ct = res?.headers?.get ? res.headers.get('content-type') || 'unknown' : 'unknown';
            const status = res?.status ?? 'unknown';
            const text = res?.text ? await res.text() : String(res);

            logger.error(
                `[${tag}]\n` +
                    `URL: ${url}\n` +
                    `STATUS: ${status}\n` +
                    `CONTENT-TYPE: ${ct}\n` +
                    `BODY(HEAD): ${String(text).slice(0, 1200)}`
            );
        } catch (e) {
            logger.error(`[${tag}] failed to capture response: ${e?.message || e}`);
        }
    }

    function isUnexpectedTokenHtml(err) {
        const msg = String(err?.message || err);
        return msg.includes('Unexpected token <') && msg.includes('JSON');
    }

    /* -------------------------------------------------------------------------- */
    /*                                  MAIN CODE                                 */
    /* -------------------------------------------------------------------------- */
    try {
        //1° Authenticate with AGOL as an application

        const appManager = ApplicationCredentialsManager.fromCredentials({
            clientId: GIS_CLIENT_ID,
            clientSecret: GIS_CLIENT_SECRET,
            portal: 'https://visualvault.maps.arcgis.com/sharing/rest',
        });

        const appToken = await withRetry(() => appManager.getToken(), {
            label: 'getToken',
            retries: 3,
        });

        // Normalize token to a string (depends on arcgis-rest-request version)
        const tokenStr = typeof appToken === 'string' ? appToken : appToken?.token || appToken?.access_token || '';

        const shapefile = getFieldValueByName('ShapeFile');
        const layer = getFieldValueByName('Layer');
        const layerTitle = getFieldValueByName('LayerTitle');
        const applicationId = getFieldValueByName('ApplicationId');

        const validatedShapeFile = validateZipHeaders(Buffer.from(shapefile, 'base64'), {
            maxTotalUncompressedMB: 10,
            maxPerFileUncompressedMB: 2,
            maxEntries: 100,
            allowedExts: ['.shp', '.shx', '.dbf', '.prj', '.cpg', '.sbn', '.sbx', '.qix', '.xml'],
        });

        // validateZipHeaders returns { ok: true/false, reason: "..."}
        if (!validatedShapeFile?.ok) {
            const errorMessage = validatedShapeFile?.reason || 'Invalid shapefile ZIP';
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        //2° Get the shapefile from the form field
        const shapefileBlob = await toBlobFromBase64(shapefile);

        //3° ANALYZE (wrapped so we can capture raw response if sandbox returns HTML)
        const analyzeUrl = 'https://visualvault.maps.arcgis.com/sharing/rest/content/features/analyze';
        const analyzeOpts = {
            retries: 3,
            authentication: appManager,
            params: {
                f: 'json',
                filetype: 'shapefile',
                file: shapefileBlob,
            },
        };

        let analyzeShapefile;
        try {
            analyzeShapefile = await requestWithRetry(analyzeUrl, analyzeOpts);
        } catch (e) {
            if (isUnexpectedTokenHtml(e)) {
                logger.info('ActivityMapCreateFeatureFromShapeFile: [1] Capturing RAW RESPONSE from ANALYZE step');
                await debugRawResponseViaArcgisRequest(analyzeUrl, analyzeOpts, 'ANALYZE RAW RESPONSE');
            }
            throw e;
        }

        if (!analyzeShapefile?.publishParameters) {
            const errorMessage = `GET AGOL analyze failed : analyzing ${layerTitle} file failed`;
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        //4° GENERATE (wrapped so we can capture raw response if sandbox returns HTML)
        const generateUrl = 'https://visualvault.maps.arcgis.com/sharing/rest/content/features/generate';
        const publishParametersStr = JSON.stringify(analyzeShapefile.publishParameters);

        const generateOpts = {
            retries: 3,
            authentication: appManager,
            params: {
                f: 'json',
                filetype: 'shapefile',
                file: shapefileBlob,
                publishParameters: publishParametersStr,
            },
        };

        let generatedFeatureCollection;
        try {
            generatedFeatureCollection = await requestWithRetry(generateUrl, generateOpts);
        } catch (e) {
            if (isUnexpectedTokenHtml(e)) {
                logger.info('ActivityMapCreateFeatureFromShapeFile: [2] Capturing RAW RESPONSE from GENERATE step');
                await debugRawResponseViaArcgisRequest(generateUrl, generateOpts, 'GENERATE RAW RESPONSE');
            }
            throw e;
        }

        if (!generatedFeatureCollection?.featureCollection?.layers?.length) {
            const errorMessage = `GET AGOL generate failed : no layers generated from shapefile`;
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        if ((generatedFeatureCollection.featureCollection.layers[0]?.featureSet?.features || []).length === 0) {
            const errorMessage = `GET AGOL generate failed : no features generated from shapefile`;
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        assertGeometriesPresent(generatedFeatureCollection, { logger, errorLog });

        logger.log(`ActivityMapCreateFeatureFromShapeFile: [3] Generate featureCollection completed`);

        //5° AGOL Find the hosted feature layer / service by layerTitle
        const { results: svcResults } = await callWithRetry(
            searchItems,
            {
                q: `title:${layerTitle} AND (type:"Feature Service" OR type:"Feature Layer") AND owner:VVAGOL`,
                num: 1,
                authentication: appManager,
            },
            { label: `searchItems(svc:${layerTitle})`, retries: 3 }
        );

        if (!svcResults.length) throw new Error('Hosted feature layer not found');
        logger.log(`ActivityMapCreateFeatureFromShapeFile: [4] SearchItems for feature service completed`);

        const featureItem = svcResults[0]; // has .id and .url

        //6° AGOL Find the hosted feature table by the feature layer / service id
        const tableItem = await callWithRetry(getItem, featureItem.id, {
            label: `getItem(${featureItem.id})`,
            retries: 3, // note: getItem signature is (id, requestOptions)
            // pass as second param:
            // args = featureItem.id (first), requestOptions (second) ? our wrapper expects a single "args" object.
        }).catch(async (e) => {
            // If your getItem helper expects two positional args, do this instead:
            return withRetry(() => getItem(featureItem.id, { authentication: appManager }), {
                retries: 3,
                label: `getItem(${featureItem.id})`,
            });
        });

        logger.log(`ActivityMapCreateFeatureFromShapeFile: [5] getItem for feature service completed`);

        const featureServiceUrl = tableItem.url + '/0'; // e.g. .../FeatureServer

        //7° AGOL Get & Read layer metadata to know which fields are required and can be null
        const layerJson = await getLayer({ url: featureServiceUrl, authentication: appManager });

        logger.log(`ActivityMapCreateFeatureFromShapeFile: [6] getLayer for feature service completed`);

        const nullableFields = [];
        const requiredAttributes = [];

        layerJson.fields.forEach((field) => {
            if (
                !field.nullable &&
                field.name !== layerJson.objectIdField &&
                !field.nullable &&
                field.name !== layerJson.globalIdField
            ) {
                console.log(`Non-nullable field: ${field.name} (${field.type})`);
                nullableFields.push(field);
                requiredAttributes.push({ name: field.name, value: null, type: field.type });
            }
            console.log(`Field: ${field.name}, type: ${field.type}, nullable: ${field.nullable}`);
        });

        //console.log(nullableFields.length + ' non-nullable fields found.');

        // `generated` is the JSON returned by /generate
        const layers = generatedFeatureCollection?.featureCollection?.layers || [];
        const layersStr = JSON.stringify(layers);
        logger.log(`ActivityMapCreateFeatureFromShapeFile: [7] layer ${layersStr}`);

        // 1) forEach over the attributes entries of the FIRST feature
        //******* TODOOOOOOOO *********
        //I need to interate over all features to get all attributes!!!!!
        const feats = layers?.[0]?.featureSet?.features ?? [];
        const featsStr = JSON.stringify(feats);
        const shapefileAttributes = [];
        logger.log(`ActivityMapCreateFeatureFromShapeFile: [8] layer ${featsStr}`);

        //8° Validate and prepare attributes for each feature
        feats.forEach((feat, featureIndex) => {
            const featureAttributes = []; // collect for this feature only
            const nullableFieldsFound = [];
            const attrs = feat?.attributes ?? {};
            Object.entries(attrs).forEach(([name, value], idx) => {
                // find matching nullableField once
                for (nullableField of nullableFields) {
                    if (
                        (name === nullableField.name && value !== null) ||
                        (name === nullableField.name && value !== undefined)
                    ) {
                        nullableFieldsFound.push({ name: name, value: value, type: nullableField.type });
                    }
                }
            });
            //We just finished checking if the shapefile attribute matched any non-nullable field
            //If it did not match any, we need to loop through the requiredAttributes array to add it with a default value
            for (nullableField of nullableFields) {
                if (!nullableFieldsFound.find((attr) => attr.name === nullableField.name)) {
                    featureAttributes.push({
                        name: nullableField.name,
                        value: setEmptyDefaultValues(nullableField.type),
                        type: nullableField.type,
                    });
                }
            }

            // Append found attributes for this feature
            shapefileAttributes.push(...featureAttributes);
        });

        //9° Get & Merge geometries with attributes
        const geometries = layers.flatMap((l) =>
            (l?.featureSet?.features || []).map((f) => f.geometry).filter(Boolean)
        );

        const numFeatures = feats.length;
        // infer how many fields each feature has
        const fieldsPerFeature = Math.floor(shapefileAttributes.length / numFeatures);

        // Build one attributes object per feature
        const mergedShapefileAttributes = Array.from({ length: numFeatures }, () => ({}));

        for (let f = 0; f < numFeatures; f++) {
            const rec = mergedShapefileAttributes[f];
            for (let k = 0; k < fieldsPerFeature; k++) {
                const { name, value } = shapefileAttributes[f * fieldsPerFeature + k];
                rec[name] = name === 'fp_id' ? applicationId : value;
            }
        }

        // Build features WITHOUT cloning attributes (shared live references)
        const n = Math.min(geometries.length, mergedShapefileAttributes.length);
        const features = Array.from({ length: n }, (_, i) => ({
            geometry: geometries[i],
            attributes: mergedShapefileAttributes[i], // no spread — live object
        }));

        // (optional) keep the spatial reference alongside them
        const spatialReference =
            layers[0]?.layerDefinition?.extent?.spatialReference ||
            layers[0]?.layerDefinition?.spatialReference ||
            generatedFeatureCollection?.featureCollection?.spatialReference ||
            null;

        logger.log(
            `ActivityMapCreateFeatureFromShapeFile: [9] prepared ${features.length} features to add: ${featureServiceUrl}`
        );

        const generateOptsAdd = {
            url: featureServiceUrl,
            features: features, // [{attributes, geometry}, ...]
            rollbackOnFailure: true,
            authentication: appManager,
            params: {
                f: 'json',
            },
        };

        let responseAddFeats = '';

        try {
            responseAddFeats = await addFeatures({
                url: featureServiceUrl,
                features: features, // [{attributes, geometry}, ...]
                rollbackOnFailure: true,
                authentication: appManager,
                f: 'json',
            });
        } catch (e) {
            if (isUnexpectedTokenHtml(e)) {
                logger.info('ActivityMapCreateFeatureFromShapeFile: [10] Capturing RAW RESPONSE from GENERATE step');
                await debugRawResponseViaArcgisRequest(featureServiceUrl, generateOptsAdd, 'GENERATE RAW RESPONSE');
            }
            throw e;
        }

        let responseAddFeatsStr = JSON.stringify(responseAddFeats);

        logger.log(`ActivityMapCreateFeatureFromShapeFile: [10] added Feature ${responseAddFeatsStr}`);

        if (responseAddFeats.addResults[0].success !== true) {
            const errorMessage = `${responseAddFeats.addResults[0].error.description}`;
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        //10° Zoom to the features created from the shapefile on the map
        const objectIds = responseAddFeats?.addResults?.flatMap((feat) => feat?.objectId).filter(Number.isFinite);

        outputCollection[0] = 'Success';
        outputCollection[1] = objectIds;
    } catch (error) {
        // Log the data to the console
        logger.info(`ActivityMapCreateFeatureFromShapeFile: Error encountered ${error}`);

        // BUILD THE ERROR RESPONSE ARRAY
        outputCollection[0] = 'Error'; // Don´t change this

        if (errorLog.length > 0) {
            outputCollection[1] = 'Some errors ocurred';
            outputCollection[2] = `Error/s: ${errorLog.join('; ')}`;
        } else {
            const errorDetails = error?.response?.error?.details;
            const errorDetailsText =
                Array.isArray(errorDetails) && errorDetails.length
                    ? errorDetails
                          .map((d) => (typeof d === 'string' ? d : (d?.description ?? d?.message ?? JSON.stringify(d))))
                          .join(' | ')
                    : '';
            const errorMessage = error?.message;
            const errorMsg = errorDetailsText || errorMessage || String(error);
            logger.error(`Unhandled error occurred: ${errorMsg}`);
            outputCollection[1] = errorMsg;
        }
    } finally {
        response.json(200, outputCollection);
    }
};

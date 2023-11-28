// -----------------------------------------------------------------------
// CthTestReflect.js
//
// This module provides a reflection proxy to CthTestFixture.js's cleos()
//   function, so that you can do things like this (instead of composing
//   giant string arguments to cleos() calls yourself).
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// Exported constants
// -----------------------------------------------------------------------

const CONTRACT = 'CONTRACT';
const SELF     = 'SELF';

// -----------------------------------------------------------------------
// getProxyForContract
//
// Return a complete proxy object for the given contract.
// -----------------------------------------------------------------------

function getProxyForContract(contractAccountName) {
    const library = {};
    library.__contractAccountName = contractAccountName;
    library.__logNextAction = false;
    library.__logAllActions = false;
    let abi;
    try {
        const abiString = cleos(`get abi ${contractAccountName}`);
        library.__abiString = abiString;
        abi = JSON.parse(abiString);
    } catch (error) {
        fixtureCrashed(`CthTestReflect: getProxyForContract(): Error fetching and parsing ABI for ${contractAccountName}: ${error}`);
    }
    if (!abi || !abi.actions || !Array.isArray(abi.actions) || !abi.structs || !Array.isArray(abi.structs)) {
        fixtureCrashed(`CthTestReflect: getProxyForContract(${contractAccountName}): ABI format is invalid.`);
    }
    // configure the default field ordering for a struct
    // this allows the caller of a push-action function to instead pass an array where a struct would be expected
    // all of the struct's fields must be specified, with no extraneous, non-existent fields specified
    library.__structMap = new Map(); // struct name --> array of string field names which dictates their order
    library._struct = function (structName, fieldNamesArray) {
        if (fieldNamesArray === undefined || !Array.isArray(fieldNamesArray)) {
            fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::_struct(${structName}, ???): received an invalid fieldNamesArray.`);
        }
        const struct = abi.structs.find((s) => s.name === structName);
        if (!struct) {
            fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::_struct(${structName}, ${fieldNamesArray}): struct not found.`);
        }
        if (fieldNamesArray.length !== struct.fields.length) {
            fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::_struct(${structName}, ${fieldNamesArray}): struct defines ${struct.fields.length} fields, not ${fieldNamesArray.length}.`);
        }
        struct.fields.forEach((field) => {
            // Check if the field exists in the given fieldNamesArray
            if (!fieldNamesArray.includes(field.name)) {
                fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::_struct(${structName}, ${fieldNamesArray}): missing struct field '${field.name}'.`);
            }
        });
        library.__structMap.set(structName, fieldNamesArray);
    }
    // generate push-action functions
    abi.actions.forEach((action) => {
        const actionName = action.name;
        const structName = action.type;
        if (!structName) {
            fixtureCrashed(`CthTestReflect: getProxyForContract(${contractAccountName}): No struct type defined for action "${actionName}".`);
        }
        const struct = abi.structs.find((s) => s.name === structName);
        if (!struct) {
            fixtureCrashed(`CthTestReflect: getProxyForContract(${contractAccountName}): Struct "${structName}" not found for action "${actionName}".`);
        }
        library[actionName] = function (...params) {
            if (params.length !== struct.fields.length) {
                const paramList = params.map(element => JSON.stringify(element)).join(',');
                fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::${actionName}(${paramList})]: expected ${struct.fields.length} parameter(s), got ${params.length}.`);
                return;
            }
            // For each parameter, if it is one of the structs defined in the ABI, check if it's a JSON object
            //   whose field names match the ABI struct's fields. This should catch most errors.
            for (let i = 0; i < params.length; i++) {
                const paramNum = i + 1;
                const paramName = struct.fields[i].name;
                const paramType = struct.fields[i].type;
                if (abi.structs.some((struct) => struct.name === paramType)) {
                    // An object is expected here for params[i], BUT:
                    // Special case: we CAN give an array in place of an object if we have called proxy._struct()
                    //   to configure a default ordering for the struct's fields, in which case we will just
                    //   hack params[i] here to substitute it for an object, and the rest of the method continues
                    //   unmodified.
                    if (Array.isArray(params[i]) && library.__structMap.has(paramType)) {
                        let fieldNamesArray = library.__structMap.get(paramType);
                        if (fieldNamesArray.length == params[i].length) { // element in given array must match in count the elements in the configured field names array for the struct
                            let translatedParam = {};
                            for (let j = 0; j < fieldNamesArray.length; j++) {
                                let fieldName = fieldNamesArray[j];
                                translatedParam[fieldName] = params[i][j];
                            }
                            params[i] = translatedParam; // replace the array e.g. [a,b,c] with object e.g. {"field1":"a","field2":"b","field3":"c"}
                        }// else refuse to translate []->{} and let it blow up "naturally"
                    }
                    // Here either it was an object with fields or should be an object with fields now (NOT an array), else we error out.
                    // The reason this is correct and actually works, I believe, is that there are no ABI types that ARE arrays or are defined
                    //   as arrays; but if that happens, the proxy won't work and this will blow up somewhere. We are assuming that when a
                    //   param's type name appears ipsis literis as a field name in the structs array, that type is not an array itself, and
                    //   there's no situation where both match textually and both are array types, at which point the Array.isArray logic / is
                    //   typeof object logic below would break. But if it does break, it's not the end of the world, and we can figure out
                    //   what to do from there (meanwhile, just don't use the proxy and call cleos() directly).
                    if (typeof params[i] !== 'object' || Array.isArray(params[i])) {
                        const paramList = params.map(element => JSON.stringify(element)).join(',');
                        fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::${actionName}(${paramList})]: Parameter #${paramNum} expected JSON object matching ABI type '${paramType}', instead got '${params[i]}'.`);
                    }
                    const matchingStruct = abi.structs.find((s) => s.name === paramType);
                    if (matchingStruct) {
                        matchingStruct.fields.forEach((field) => {
                            // Check if the field exists in the parameter object
                            if (!(field.name in params[i])) {
                                const paramList = params.map(element => JSON.stringify(element)).join(',');
                                fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::${actionName}(${paramList})]: Parameter #${paramNum} JSON object is missing field '${field.name}' to match ABI type '${paramType}'.`);
                            }
                            // Here we could actually check the type of each field, and if it's also an ABI struct, we could call a
                            //   recursive function from here to do further type checking. Eventually could end up checking on all
                            //   ABI types, including arrays of primitives, of structs, etc.
                            // This is probably overkill; if there's an error in the way the test writer calls the proxy, it will blow
                            //   up in the cleos call, and it's not too much work to map that to the bug location in the proxy call.
                        });
                    }
                }
            }
            const paramObj = {};
            for (let i = 0; i < params.length; i++) {
                const paramName = struct.fields[i].name;
                paramObj[paramName] = params[i];
            }
            const paramString = JSON.stringify(paramObj);

            let cleos_result = cleos(`push action ${contractAccountName} ${actionName} '${paramString}' --force-unique -p ${library.__auth}`);
            if (library.__logAllActions || library.__logNextAction) {
                console.log( cleos_result );
                library.__logNextAction = false;
            }
            return cleos_result;
        };
    });
    // generate get-table functions
    library.__tableIndexInfo = new Map();
    library.__tableScope = new Map();
    abi.tables.forEach((table) => {
        const tableName = table.name;
        library.__tableIndexInfo.set(tableName, []);
        // config object for each index 1-9: [index type, encode type]
        for (let i = 1; i < 9; i++) { library.__tableIndexInfo.get(tableName).push([]); }
        // scope is saved, can be set via "scope":"" option; default is the account name
        library.__tableScope.set(tableName, contractAccountName);
        // Generate table query methods for up to 9 indices
        for (let i = 1; i < 9; i++) {
            // The table function name can be the plain table name, since you cannot have
            //   actions declared with the same name as the table -- that doesn't work.
            //   So for the primary index/key, the function name is the plain table name.
            // However, when adding indices, we need an e.g. "_" to differentiate, because
            //   a "players2" action could exist together with a "players" table. When
            //   using indices > 1 (the primary index/key), it becomes e.g. "players_2".
            let si = '';
            if (i > 1) { si = `_${i}` };
            const tableFunctionName = `${tableName}${si}`;
            library[tableFunctionName] = function (...params) {
                let configWasSet = false;
                let keyTypeWasSet = false;
                let reverse = false;
                let MAX_PAGES_LIMIT = 10000; // absolute maximum to avoid "infinite" loops
                let PAGES_LIMIT = MAX_PAGES_LIMIT; // selected pages limit, if any
                let q = '';
                if (i > 1) { q += ` --index ${i}`; }
                // apply all params to construct an options[0] object
                let posnum = 1;
                let options = [];  // all option objects found
                options.push({});  // reserve [0] for positional options
                for (const param of params) {
                    if (typeof param === 'object' && param !== null) {
                        options.push(param);
                    } else {
                        if (posnum == 1) {
                            options[0]["lower"] = param;
                            options[0]["upper"] = param;
                        } else if (posnum == 2) {
                            options[0]["upper"] = param;
                        } else if (posnum == 3) {
                            options[0]["limit"] = param;
                        } else if (posnum == 4) {
                            options[0]["scope"] = param;
                        } else if (posnum == 5) {
                            options[0]["pages"] = param;
                        } else if (posnum == 6) {
                            options[0]["binary"] = param;
                        } else if (posnum == 7) {
                            options[0]["reverse"] = param;
                        } else if (posnum == 8) {
                            options[0]["show-payer"] = param;
                        } else if (posnum == 9) {
                            options[0]["time-limit"] = param;
                        }
                        posnum += 1;
                    }
                }
                for (let oi = 1; oi < options.length; oi++) {
                    for (const key of Object.keys(options[oi])) {
                        options[0][key] = options[oi][key];
                    }
                }
                // apply resulting options[0] to $q
                for (const key of Object.keys(options[0])) {
                    let value = options[0][key];
                    if (key == "lower") {
                        q += ` --lower ${value}`;
                    } else if (key == "upper") {
                        q += ` --upper ${value}`;
                    } else if (key == "limit") {
                        q += ` --limit ${value}`;
                    } else if (key == "scope") {
                        // special values that conveniently reset to the contract account name
                        //   without having to name it explicitly e.g. {"scope":`meta.${doh_target}`}
                        if (value === undefined || value === 'CONTRACT' || value === 'SELF' || value === '') {
                            library.__tableScope.set(tableName, contractAccountName);
                        } else {
                            library.__tableScope.set(tableName, value);
                        }
                    } else if (key == "pages") {
                        PAGES_LIMIT = value;
                    } else if (key == "binary") {
                        q += " --binary";
                    } else if (key == "reverse") {
                        q += " --reverse";
                        reverse = true;
                    } else if (key == "show-payer") {
                        q += " --show-payer";
                    } else if (key == "time-limit") {
                        q += ` --time-limit ${value}`;
                    } else if (key == "key-type") {
                        // save the key-type for (current and) future use
                        library.__tableIndexInfo.get(tableName)[i][0] = value;
                        configWasSet = true;
                    } else if (key == "encode-type") {
                        // save the encode-type for (current and) future use
                        library.__tableIndexInfo.get(tableName)[i][1] = value;
                        configWasSet = true;
                    }
                }
                // apply tableConfig
                let tableConfig = library.__tableIndexInfo.get(tableName)[i];
                if (tableConfig !== undefined) {
                    if (tableConfig.length > 0 && tableConfig[0] !== undefined && tableConfig[0] !== '') {
                        q += ` --key-type ${tableConfig[0]}`;
                        keyTypeWasSet = true;
                    }
                    if (tableConfig.length > 1 && tableConfig[1] !== undefined && tableConfig[1] !== '') {
                        q += ` --encode-type ${tableConfig[1]}`;
                    }
                }
                // for non-primary indices, cleos requires that the key type be provided
                // if it wasn't filled in yet, then set it to the default
                // if the type is incorrect, it's the proxy user's fault -- should have passed it in
                if (i > 1 && !keyTypeWasSet) {
                    q += ` --key-type i64`;
                }
                // apply scope
                let scope = library.__tableScope.get(tableName);
                // if no lower but set config, will NOT make a query; we are just configuring the proxy
                if (configWasSet && posnum == 1) {
                    return undefined;
                } else {
                    // The javascript/JSON object that we are going to return from our table querier
                    //   will deal automatically with more/nextKey, because in a testing environment
                    //   there are no bandwidth costs. The query IS what you want, and there is no
                    //   concept of query pagination in our definition of an automated test system.
                    //
                    // As a result, the returned object does not conform to (rows, more, next_key),
                    //   and instead it has (rows, query_options, cleos_calls). The new "rows" array is
                    //   exactly like the one returned by cleos, but it pieces together, in the
                    //   order the various paginating cleos calls return it, all javascript
                    //   objects (smart contract multi-index table rows) that answer the query
                    //   that was made to the table.
                    let ro = {
                        rows: [],
                        cleos_calls: [],
                        query_options: options[0]
                    };
                    let page = 0;
                    for (page = 0; page < MAX_PAGES_LIMIT; page++) {
                        let cleos_cmd = `get table ${contractAccountName} ${scope} ${tableName} ${q}`.trim();
                        let str = cleos(cleos_cmd);
                        let o = JSON.parse(str);
                        // if we don't get a well-formed result object in the first place for whatever reason,
                        //   that's an error. Notify it by returning undefined (maybe should throw new Error?)
                        if (o === undefined  || o.more === undefined || o.next_key === undefined || o.rows === undefined || !Array.isArray(o.rows) || typeof o.more !== 'boolean') {
                            const paramList = params.map(element => JSON.stringify(element)).join(',');
                            fixtureCrashed(`CthTestReflect: [PROXY ${contractAccountName}::${tableFunctionName}(${paramList})]: cleos get table call returned a malformed object:\n${o}`);
                            return undefined;
                        }
                        ro.cleos_calls.push(cleos_cmd);
                        ro.rows.push(...o.rows);
                        // check if we are done
                        if (!o.more || (page >= PAGES_LIMIT-1))
                            return ro;
                        // there's more and the easiest way to assemble the next cleos call is to
                        //   just hack the q variable here.
                        let replace;
                        let pattern;
                        if (reverse) {
                            // in reverse mode the next key should be the next upper
                            replace = `--upper ${o.next_key}`;
                            pattern = /--upper\s+\S+/g;
                        } else {
                            // in non-reverse mode the next key should be the next lower
                            replace = `--lower ${o.next_key}`;
                            pattern = /--lower\s+\S+/g;
                        }
                        if (q.match(pattern))
                            q = q.replace(pattern, replace) // replace the lower/upper bound value in existing param
                        else
                            q += ` ${replace}`; // param pattern wasn't there, so just append the new lower/upper bound param
                    }
                    // if loop exited, we reached the limit without reaaching the end of the query
                    const paramList = params.map(element => JSON.stringify(element)).join(',');
                    fixtureLog(`*** WARNING: *** CthTestReflect: [PROXY ${contractAccountName}::${tableFunctionName}(${paramList})]: Table query reached the limit of ${MAX_QUERY_PAGES} cleos calls.`);
                    return ro;
                }
            };
        }
    });
    // define the _auth function, which sets the parameter for subsequent push-action "-p" action-function calls
    // Internal function names must avoid name collision with ABI names ("a-z1-5.", 12 chars)
    library._auth = function (value) {
        // special values that conveniently set the signer to the contract account name.
        // if you need anything other than active permission send it in explicitly.
        if (value === undefined || value === 'CONTRACT' || value === 'SELF' || value === '') {
            library.__auth = contractAccountName;
        } else {
            library.__auth = value;
        }
        return this; // supports chaining
    };
    // "_()" is a shorthand to "_auth()" (closest thing to a functor/operator overloading in JS apparently)
    library._ = function (value) { library._auth(value); return this; } // supports chaining
    // get the contract name
    library._contract = function () { return library.__contractAccountName; }
    // log actions
    library._log    = function () { library.__logNextAction = true; return this; }
    library._logon  = function () { library.__logAllActions = true; return this; }
    library._logoff = function () { library.__logAllActions = false; return this; }
    // default to contract authority
    library._auth();
    // return the proxy
    return library;
}

// -----------------------------------------------------------------------
// End of library.
// -----------------------------------------------------------------------

module.exports = {
    getProxyForContract,
    CONTRACT,
    SELF,
};

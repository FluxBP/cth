// -----------------------------------------------------------------------
// CthTest.js provides functions that help in writing higher-level
//   test logic. It interfaces with CthTestDriver.js to init/finish the
//   best driver available for running tests (currently "hotstart").
// -----------------------------------------------------------------------

const fs = require('fs');
const vm = require('vm');
const child_process = require('child_process');

// -----------------------------------------------------------------------
// Exported constants
// -----------------------------------------------------------------------

const TIME_POINT_MAX = "2106-02-07T06:28:15.000";
const TIME_POINT_MIN = "1970-01-01T00:00:00.000";

const DEVELOPER_PUBLIC_KEY = "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV";

// -----------------------------------------------------------------------
// Management functions
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// init
//
// Helper for initializing the test environment using the CthTestDriver
//  library. Should be the first thing called by the testcase.
//
// startArgs is an argument string passed to hotstart start; use it to
//  e.g. "--chaindir <some-blockchain-data-dir-to-load>".
//
// Defines and writes the following global variables:
//   cth_hotstart_instance_port: P2P port of the started nodeos
//   cth_hotstart_instance_port_http: HTTP port of the started nodeos
// -----------------------------------------------------------------------

function init(startArgs) {
    if (startArgs === undefined)
        startArgs = '';
    console.log("TEST: init(): setting up test environment, startArgs: '" + startArgs + "'");

    let cret = cth_set_cleos_provider("cleos-driver");
    if (cret) {
        console.log("ERROR: TEST: init(): cth_set_cleos_provider failed");
        return 1;
    }

    // Assemble a label for the new instance
    const instance_uid = process.pid + "_" + require.main.filename;

    if (DEBUG_TRACE)
        console.log("TEST: init(): generated instance UID (hotstart --label): " + instance_uid);

    // run hotstart start
    const args = ("start --label '" + instance_uid + "' " + startArgs + " ").trim();
    let [out, ret] = cth_call_driver("hotstart", args);
    if (ret) {
        console.log("ERROR: TEST: init(): cth_call_driver hotstart '" + args + "' failed: " + out);
        return -1;
    }

    // Figure out which port was given to this instance_uid
    const findInstanceArgs = "findinstance " + instance_uid;
    const [outInstance, retInstance] = cth_call_driver("hotstart", findInstanceArgs);
    if (retInstance) {
        console.log("ERROR: TEST: init(): cth_call_driver hotstart '" + findInstanceArgs + "' failed: " + outInstance);
        return -1;
    }

    // save it for a later finish()
    cth_hotstart_instance_port = parseInt(outInstance, 10);

    // point cth_cleos to the correct nodeos URL (hotstart invariant: web port is P2P port + 10000)
    cth_hotstart_instance_port_http = cth_hotstart_instance_port + 10000;
    const retUrl = cth_set_cleos_url("http://127.0.0.1:" + cth_hotstart_instance_port_http);
    if (retUrl) {
        console.log("ERROR: TEST: init(): cth_set_cleos_url failed.");
        return -1;
    }

    console.log("TEST: init(): OK");
    return 0;
}

// -----------------------------------------------------------------------
// finish
//
// Stops and wipes the nodeos instance created by the hotstart driver
//   through init().
//
// Reads the following global variables:
//   hotstart_instance_port: P2P port of the started nodeos
// -----------------------------------------------------------------------

function finish() {
    console.log("TEST: finish(): starting cleanup...");
    if (typeof cth_hotstart_instance_port === 'undefined') {
        console.log("ERROR: TEST: finish(): cannot find cth_hotstart_instance_port; it's likely that init() wasn't called.");
        process.exit(1);
    }

    // run hotstart clear
    const args = "clearinstance --port " + cth_hotstart_instance_port;
    const [out, ret] = cth_call_driver("hotstart", args);
    if (ret) {
        console.log("ERROR: TEST: finish(): cth_call_driver hotstart '" + args + "' failed");
        process.exit(1);
    }

    console.log("TEST: finish(): cleanup OK.");
}

// -----------------------------------------------------------------------
// crashed
//
// Simple test helper function to notify when a testcase has crashed
// -----------------------------------------------------------------------

function crashed() {
    console.log("ERROR: TEST: crashed(): test has crashed.");
    finish();
    process.exit(1);
}

// -----------------------------------------------------------------------
// failed
//
// Simple test helper function to notify when a testcase has failed
// -----------------------------------------------------------------------

function failed() {
    console.log("ERROR: TEST: failed(): test has failed.");
    finish();
    process.exit(1);
}

// -----------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// check
//
// crashes the test if value is undefined, logging varname.
// -----------------------------------------------------------------------

function check(varname, value) {
    if (value === undefined) {
        console.log(`ERROR: TEST: checkDefined(): "${varname}" is undefined.\n`);
        crashed();
    }
}

// -----------------------------------------------------------------------
// epochSecsFromDateString
//
// return seconds from epoch given a typical date string fetched from
//   contracts.
// -----------------------------------------------------------------------

function epochSecsFromDateString(date_string) {
    return child_process.execSync(`TZ=UTC date -d "${date_string}" +"%s"`, { encoding: 'utf-8' }).trim();
}

// -----------------------------------------------------------------------
// Functions that deal with time.
// -----------------------------------------------------------------------

function getCurrentTime() {
    let s = new Date().toISOString();
    if (s.endsWith("Z")) s = s.slice(0, -1); // strip UTC timezone char (last non-digit char if it's there)
    return s;
}

function addSecondsToTime(timeISOStr, secondsToAdd) {
    if (!timeISOStr.endsWith("Z")) timeISOStr += 'Z'; // add the UTC char if it's not there before doing time math
    let date = new Date(timeISOStr);
    date.setSeconds(date.getSeconds() + secondsToAdd);
    let s = date.toISOString();
    if (s.endsWith("Z")) s = s.slice(0, -1); // strip UTC timezone char (last non-digit char if it's there)
    return s;
}

// -----------------------------------------------------------------------
// Miscellaneous functions to help with manipulating eosio::name,
//   128-bit table keys, token symbols, ...
// -----------------------------------------------------------------------

// helper (internal)
function char_to_symbol(c) {
    if (c >= 'a' && c <= 'z') {
        return (c.charCodeAt(0) - 'a'.charCodeAt(0) + 6).toString();
    } else if (c >= '1' && c <= '5') {
        return (c.charCodeAt(0) - '1'.charCodeAt(0) + 1).toString();
    } else {
        return '0';
    }
}

// helper (internal)
function symbol_to_char(symbol) {
    if (symbol >= 6 && symbol <= 31) {
        return String.fromCharCode(symbol + 'a'.charCodeAt(0) - 6);
    } else if (symbol >= 1 && symbol <= 5) {
        return String.fromCharCode(symbol + '1'.charCodeAt(0) - 1);
    } else {
        return '';
    }
}

function to128(hi_u64, lo_u64) {
    if (hi_u64 === undefined) {
        throw new Error("ERROR get_128 hi");
    }
    if (lo_u64 === undefined) {
        throw new Error("ERROR get_128 lo");
    }
    const u128 = BigInt(hi_u64) << BigInt(64) | BigInt(lo_u64);
    return u128.toString();
}

function tohi64(hi) {
    if (hi === undefined) {
        throw new Error("ERROR get_hi64");
    }
    return (BigInt(hi) >> BigInt(64)).toString();
}

const __64bitmask__ = (BigInt(1) << BigInt(64)) - BigInt(1);

function tolo64(lo) {
    if (lo === undefined) {
        throw new Error("ERROR get_lo64");
    }
    return (BigInt(lo) & __64bitmask__).toString();
}

function fromName(str) {
    if (str === undefined) {
        throw new Error("ERROR name_to_u64: undef name");
    }
    if (!isValidName(str)) {
        throw new Error("ERROR name_to_u64: invalid name");
    }
    let n = BigInt(0);
    let i = 0;
    while (i < str.length && i < 12) {
        n |= (BigInt(char_to_symbol(str[i]) & 0x1f) << BigInt(64 - 5 * (i + 1)));
        i++;
    }
    if (i < str.length && i === 12) {
        n |= BigInt(char_to_symbol(str[i]) & 0x0f);
    }
    return n.toString();
}

function toName(n) {
    if (n === undefined) {
        throw new Error("ERROR u64_to_name: undef num");
    }
    let str = '';
    for (let i = 0; i < 12; i++) {
        const shift = 64 - 5 * (i + 1);
        const symbol = (n >> shift) & 0x1f;
        const char = symbol_to_char(symbol);
        if (!char) {
            break;
        }
        str += char;
    }
    return str;
}

function getSymbolCode(str) {
    if (str === undefined) {
        throw new Error("ERROR get_symbol_code: no symbol str");
    }
    if (str.length < 1 || str.length > 7) {
        throw new Error("ERROR get_symbol_code: symbol str must have between 1 and 7 characters");
    }
    let len = str.length;
    let result = BigInt(0);
    for (let i = 0; i < len; i++) {
        if (!str.match(/^[A-Z]+$/)) {
            throw new Error("ERROR: Invalid character in symbol name");
        }
        result |= (BigInt(str.charCodeAt(i)) << (8 * i));
    }
    return result.toString();
}

function getSymbolName(number) {
    if (number === undefined) {
        throw new Error("ERROR get_symbol_name: no symbol number");
    }
    if (number < 0 || number > 72057594037927935) {
        throw new Error("ERROR get_symbol_name: symbol number out of range");
    }
    let result = '';
    for (let i = 0; i < 7; i++) {
        const charCode = (number >> (8 * i)) & 0xFF;
        if (charCode === 0) {
            break;
        }
        if (charCode < 65 || charCode > 90) {
            throw new Error("ERROR: Invalid character in symbol name");
        }
        result += String.fromCharCode(charCode);
    }
    return result;
}

function isValidName(str) {
    if (str.length < 1 || str.length > 12) {
        return false;
    }
    if (!str.match(/^(?!.*[^1-5a-z\.])[1-5a-z\.]+$/)) {
        return false;
    }
    if (str.startsWith('.') || str.endsWith('.') || str.includes('..')) {
        return false;
    }
    return true;
}

// -----------------------------------------------------------------------
// End of library.
// -----------------------------------------------------------------------

module.exports = {

    // Management
    init,
    finish,
    crashed,
    failed,

    // Utility functions
    check,
    epochSecsFromDateString,
    getCurrentTime,
    addSecondsToTime,
    to128,
    tohi64,
    tolo64,
    fromName,
    toName,
    getSymbolCode,
    getSymbolName,
    isValidName,

    // Constants
    TIME_POINT_MAX,
    TIME_POINT_MIN,
    DEVELOPER_PUBLIC_KEY,
};

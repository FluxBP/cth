// -----------------------------------------------------------------------
// CthTestDriver.js is the low-level test library that ultimately allows
//   a test to start and stop nodeos and use cleos. The test specifies
//   which driver(s) it wants to use and how.
// -----------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// -----------------------------------------------------------------------
// GLOBAL variables
// -----------------------------------------------------------------------

// if true, dumps a lot of information to the test output
DEBUG_TRACE = false;

// -----------------------------------------------------------------------
// Private state (not exported)
// -----------------------------------------------------------------------

// No cleos provider configured by default
let cleosProviderDriver;
let cleosProviderWorkingDir;

// No cleos URL argument by default
let cleosUrlParam = '';

// -----------------------------------------------------------------------
// cth_debug_trace
//
// Enable or disable debug trace in the driver library
// -----------------------------------------------------------------------

function cth_debug_trace(value) {
    DEBUG_TRACE = value;
}

// -----------------------------------------------------------------------
// cth_get_root_dir
//
// Returns path to our best guess to what the root directory of the
// running cth installation is.
// This is suddenly an issue because we're now allowing tests to be
// installed "anywhere".
// This added complexity is only needed for the test library functions.
// The driver programs don't call tests, and drivers and tools are all
// still at standard, relative, well-known locations w.r.t. each other.
// -----------------------------------------------------------------------

function cth_get_root_dir() {
    return path.dirname(path.dirname(path.dirname(__filename)));
}

// -----------------------------------------------------------------------
// cth_skip_test
//
// Returns the special test skip code that the cth test runner expects.
// -----------------------------------------------------------------------

function cth_skip_test() {
    console.log("cth_skip_test: ending test with the skip return code (32)");
    process.exit(32);
}

// -----------------------------------------------------------------------
// cth_set_cleos_provider
//
// This configures the library to use the given driver as the cleos
// provider. We assume the standard cth directory structure, so the
// driver name directly translates to its expected directory location.
// Calls to cth_cleos will use the keosd.sock and the default.wallet
// that is in that location.
//
// inputs:
//   driver : name of the driver that creates and runs the wallet when
//     started, e.g. "cleos-driver".
//
// outputs:
//   retval : zero if OK, nonzero if some error (test should fail).
// -----------------------------------------------------------------------

function cth_set_cleos_provider(driver) {
    if (driver === undefined) {
        console.log("ERROR: cth_set_cleos_provider: driver argument is undefined");
        return 1;
    }

    const driverWorkingDir = path.join(cth_get_root_dir(), 'local', driver);

    cleosProviderDriver = driver;
    cleosProviderWorkingDir = path.resolve(driverWorkingDir);

    return 0;
}

// -----------------------------------------------------------------------
// cth_set_cleos_url
//
// This sets the --url= parameter value to be passed to cleos in every
//   subsequent call to cth_cleos().
//
// inputs:
//   $url : nodeos URL
//
// outputs:
//   $retval : 0 on success, 1 on error (given url is undefined)
// -----------------------------------------------------------------------

function cth_set_cleos_url(url) {
    if (url === undefined) {
        console.log("ERROR: cth_set_cleos_url: url argument is undefined");
        return 1;
    }
    if (url === '') {
        cleosUrlParam = '';
    } else {
        cleosUrlParam = `--url=${url}`;
    }
    return 0;
}

// -----------------------------------------------------------------------
// cth_cleos
//
// Use the configured cleos provider to call cleos. Returns zero if all
// went well, otherwise returns nonzero (very bad, test should fail).
//
// inputs:
//   args : arguments to cleos, with the exception of --wallet-url,
//     which is set to the working directory of the configured cleos
//     provider driver, and --url, which is set by cth_set_cleos_url.
//
// outputs:
//  retval : zero if all OK, nonzero if failed.
// -----------------------------------------------------------------------

function cth_cleos(args) {
    if (args === undefined) {
        console.log("ERROR: cth_cleos: args argument is undefined");
        return 1;
    }

    if (cleosProviderDriver === undefined || cleosProviderWorkingDir === undefined) {
        console.log("ERROR: cth_cleos: cleos provider was not set");
        return 1;
    }

    const cmd = `cleos ${cleosUrlParam} --wallet-url unix://${cleosProviderWorkingDir}/keosd.sock --verbose ${args}`;

    if (DEBUG_TRACE)
        console.log(`cth_cleos: run command: ${cmd}`);

    try {
        const output = child_process.execSync(cmd, { stdio: 'pipe' }).toString();

        if (DEBUG_TRACE)
            console.log(`cth_cleos: command successful, output:\n${output}`);

        return 0;
    } catch (error) {

        // Have to print anyway, since this function doesn't return the output
        console.log(`ERROR: cth_cleos: command returned a nonzero (error) code: ${error.status}`);
        console.log("cth_cleos: ----- begin error dump -----");
        console.log(error.toString());
        console.log("cth_cleos: ------ end error dump ------");

        if (error.status == 0)
            return -1;
        else
            return error.status;
    }
}

// -----------------------------------------------------------------------
// cth_cleos_pipe
//
// This is essentially cth_cleos but with support for capturing the
// program result.
// Use the configured cleos provider to call cleos as the first command,
// followed by arguments to cleos, followed by optional piped commands
// that take the result of the first cleos call and post-process it.
// Returns a defined string with the textual output of the command, and
// returns an undefined value on error (very bad, test should fail).
//
// inputs:
//   args : arguments to cleos, with the exception of --wallet-url,
//     which is set to the directory of the configured cleos provider
//     working directory, and --url which is set by cth_set_cleos_url,
//     plus any other piped commands (|) you want to execute.
//
// outputs:
//  output : textual output of command execution if OK, undefined if error.
// -----------------------------------------------------------------------

function cth_cleos_pipe(args) {
    if (args === undefined) {
        console.log("ERROR: cth_cleos_pipe: args argument is undefined");
        return undefined;
    }

    if (cleosProviderDriver === undefined || cleosProviderWorkingDir === undefined) {
        console.log("ERROR: cth_cleos_pipe: cleos provider was not set");
        return undefined;
    }

    const cmd = `cleos ${cleosUrlParam} --wallet-url unix://${cleosProviderWorkingDir}/keosd.sock --verbose ${args}`;

    if (DEBUG_TRACE)
        console.log(`cth_cleos_pipe: run command: ${cmd}`);

    try {
        const output = child_process.execSync(cmd, { stdio: 'pipe' }).toString();

        if (DEBUG_TRACE)
            console.log(`cth_cleos_pipe: command successful, output:\n${output}`);

        return output.trim(); // Trimming output should be benign
    } catch (error) {

        // Have to print anyway, since this function doesn't return the output
        console.log(`ERROR: cth_cleos_pipe: command returned a nonzero (error) code: ${error.status}`);
        console.log("cth_cleos_pipe: ----- begin error dump -----");
        console.log(error.toString());
        console.log("cth_cleos_pipe: ------ end error dump ------");

        return undefined;
    }
}

// -----------------------------------------------------------------------
// cth_cleos_pipe2
//
// Same as cth_cleos_pipe, but returns an array with two elements:
// - First element is the entire output (erroneous or otherwise).
// - Second element is the error code, or 0 if success.
// Useful for "failed successfully" tests where you want to parse the
//   transaction error output.
// -----------------------------------------------------------------------

function cth_cleos_pipe2(args) {
    if (args === undefined) {
        console.log("ERROR: cth_cleos_pipe2: args argument is undefined");
        return ["ERROR", 100000];
    }

    if (cleosProviderDriver === undefined || cleosProviderWorkingDir === undefined) {
        console.log("ERROR: cth_cleos_pipe2: cleos provider was not set");
        return ["ERROR", 100001];
    }

    const cmd = `cleos ${cleosUrlParam} --wallet-url unix://${cleosProviderWorkingDir}/keosd.sock --verbose ${args}`;

    if (DEBUG_TRACE)
        console.log(`cth_cleos_pipe2: run command: ${cmd}`);

    try {
        const output = child_process.execSync(cmd, { stdio: 'pipe' }).toString();

        if (DEBUG_TRACE)
            console.log(`cth_cleos_pipe2: command successful, output:\n${output}`);

        return [output.trim(), 0];
    } catch (error) {

        if (DEBUG_TRACE) {
            console.log(`ERROR: cth_cleos_pipe2: command returned a nonzero (error) code: ${error.status}`);
            console.log("cth_cleos_pipe2: ----- begin error dump -----");
            console.log(error.toString());
            console.log("cth_cleos_pipe2: ------ end error dump ------");
        }

        if (error.status == 0) {
            return [error.toString(), -1];
        } else {
            return [error.toString(), error.status];
        }
    }
}

// -----------------------------------------------------------------------
// cth_assert
//
// Check if an expression evaluates to true. Returns 0 if it is true,
// or 1 if it is false.
// Expression must be a valid Perl expression and should generally not
// reference any variables.
// To use expr + orig effectively, you do something like this:
//   const a = 5;
//   const b = 10;
//   const orig = 'a == b';
//   const expr = orig;
//   const ret = cth_assert("We are checking.", expr, orig);
//
// inputs:
//   desc : assertion description
//   expr : expression to evaluate (with variable substitution applied)
//   orig : (OPTIONAL) original expression (before var. substitution)
//
// output:
//   retval : 0 if assert succeeds, 1 if assert fails
// -----------------------------------------------------------------------

function cth_assert(desc, expr, orig) {
    if (desc === undefined) {
        console.log("ERROR: cth_assert: desc argument is undefined");
        return 1;
    }
    if (expr === undefined) {
        console.log("ERROR: cth_assert: expr argument is undefined");
        return 1;
    }
    expr = expr.trim();
    try {
        const result = eval(expr);
        if (result) {

            if (DEBUG_TRACE)
                console.log(`cth_assert: '${desc}': '${expr}' is true ${orig ? ` ('${orig}')` : ''}.`);

            return 0;
        } else {

            if (DEBUG_TRACE)
                console.log(`cth_assert: '${desc}': '${expr}' is false ${orig ? ` ('${orig}')` : ''}.`);

            return 1;
        }
    } catch (error) {

        // Have to print anyway, since this function doesn't return the output
        console.log(`ERROR: cth_assert: expression evaluation has thrown a ${error.constructor.name}: '${error.message}'`);
        console.log(`  expr: ${expr}`);
        console.log(`  desc: ${desc}`);
        if (orig !== undefined)
            console.log(`  orig:  '${orig}`);

        return 1;
    }
}

// -----------------------------------------------------------------------
// cth_standard_args_parser
//
// A standard command-line argument parser for testcases to use, which
// resolves the arguments that are fed by the cth harness into them
// (or that a manual caller to the test can emulate).
// This method actually throws an error if there is an error because it should not
// be invoked after e.g. drivers are initialized. So there's no cleanup
// to do if this fails.
//
// inputs:
//    switchesStr : space-separated string with a list of switches that
//      the calling test understands.
//    optionsStr : space-separated string with a list of options that
//      the calling test understands.
//
// outputs:
//    switchesRef : JavaScript object with switch key-value pairs where the key is
//      the switch name (key name) and the value is the switch value.
//    optionsRef : JavaScript object with option key-value pairs where the key is
//      the option name (key name) and the value is the option value.
//
// This is called by the test script, which receives the command-line
//    arguments. The arguments are taken directly from the process.argv global.
//
// If the test (caller) has received any switch not listed here, this
//   sub fails, taking the test with it. That means the test is not
//   engineered towards the environment of the test run.
//
// If the test receives any options not listed here, the argument parser
//   will throw an error, but the test will continue. The option will
//   just be ignored.
// -----------------------------------------------------------------------

function cth_standard_args_parser(switchesStr, optionsStr) {
    if (switchesStr === undefined) {
        throw new Error("ERROR: cth_standard_args_parser: switches argument is undefined");
    }
    if (optionsStr === undefined) {
        throw new Error("ERROR: cth_standard_args_parser: options argument is undefined");
    }

    // Split the strings at space characters to create arrays
    const switches = switchesStr.split(/\s+/);
    const options = optionsStr.split(/\s+/);

    const switchesRef = {};
    const optionsRef = {};

    const args = process.argv.slice(2);

    while (args.length > 0) {
        const arg = args.shift();
        if (arg === '-o' || arg === '--option') {
            // Handle -o option=value or --option option=value format
            const nextArg = args.shift();
            if (nextArg && !nextArg.match(/^-/)) {
                if (nextArg.match(/^(\w+)=(.*)/)) {
                    const optName = RegExp.$1;
                    const value = RegExp.$2;
                    optionsRef[optName] = value;
                } else {
                    throw new Error(`ERROR: cth_standard_args_parser: Invalid option: ${nextArg}`);
                }
            } else {
                throw new Error("ERROR: cth_standard_args_parser: Found empty option spec");
            }
        } else if (arg.match(/^--(\w+)=(.*)/)) {
            // Handle --switchname=value format
            const switchName = RegExp.$1;
            const value = RegExp.$2;
            switchesRef[switchName] = value;
        } else if (arg.match(/^--(\w+)/)) {
            // Handle --switchname value format
            const switchName = RegExp.$1;
            const value = args.shift();
            if (value && !value.match(/^-/)) {
                switchesRef[switchName] = value;
            } else {
                throw new Error(`ERROR: cth_standard_args_parser: Missing value for switch ${arg}`);
            }
        } else {
            throw new Error(`ERROR: cth_standard_args_parser: Invalid argument: ${arg}`);
        }
    }

    // Check that all given switches are inside the given array of switches
    for (const switchName in switchesRef) {
        if (!switches.includes(switchName)) {
            throw new Error(`ERROR: cth_standard_args_parser: Unexpected switch: ${switchName}`);
        }
    }

    // Print a warning for any option in the command line not in the given array
    for (const optionName in optionsRef) {
        if (!options.includes(optionName)) {
            console.log(`WARNING: cth_standard_args_parser: Unexpected option '${optionName}' received.`);
        }
    }

    return [switchesRef, optionsRef];
}

// -----------------------------------------------------------------------
// cth_call_driver
//
// Calls the specified program-with-arguments of the specified driver.
// This assumes the cth directory structure is being followed, of course.
//
// inputs:
//    driver : driver name to call (driver directory name)
//    command : command (script/program) to call in the driver
//      directory, plus any parameters.
//
// output (returns a two-element array):
//    output : text output (stdout and stderr) from the command
//    retval : raw integer return code from the system call. If this
//      is not zero, the call has failed, and the test should fail. This
//      sub does not kill the test because it gives a chance for e.g.
//      cleanups to be performed.
// -----------------------------------------------------------------------

function cth_call_driver(driver, command) {
    if (driver === undefined) {
        console.log("ERROR: cth_call_driver: driver argument is undefined");
        return ["ERROR", 100000];
    }
    if (command === undefined) {
        console.log("ERROR: cth_call_driver: command argument is undefined");
        return ["ERROR", 100001];
    }

    const commandPath = path.join(cth_get_root_dir(), 'drivers', driver, command);

    if (DEBUG_TRACE)
        console.log(`cth_call_driver: run command: ${commandPath}`);

    try {
        const output = child_process.execSync(commandPath).toString();

        if (DEBUG_TRACE)
            console.log(`cth_call_driver: command successful, output:\n${output}`);

        return [output, 0];
    } catch (error) {

        if (DEBUG_TRACE) {
            console.log(`ERROR: cth_call_driver: command returned a nonzero (error) code: ${error.status}`);
            console.log("cth_call_driver: ----- begin stdout dump -----");
            console.log(error.stdout.toString());
            console.log("cth_call_driver: ------ end stdout dump ------");
            console.log("cth_call_driver: ----- begin stderr dump -----");
            console.log(error.stderr.toString());
            console.log("cth_call_driver: ------ end stderr dump ------");
            console.log("cth_call_driver: ----- begin error dump -----");
            console.log(error.toString());
            console.log("cth_call_driver: ------ end error dump ------");
        }

        // We are not returning the entire error object with stdout/stderr.
        // This is enough for now. To see these, just set DEBUG_TRACE.
        if (error.status == 0) {
            return [error.toString(), -1];
        } else {
            return [error.toString(), error.status];
        }
    }
}

// -----------------------------------------------------------------------
// cth_generate_account_names
//
// Generates a sequence of EOSIO names from a starting pattern and count.
// Example: ('aaag', 4) will return ref to a 'aaag aaah aaai aaaj' array.
//
// inputs:
//    prefix : starting pattern (included in return value)
//    pattern : number of patterns to generate by incrementing the starting
//      pattern <count> times ("digits" incremented are a-z).
//
// output:
//    patterns : JavaScript array of generated patterns.
// -----------------------------------------------------------------------

function cth_generate_account_names(prefix, pattern, count) {
    const patterns = [];

    // Convert pattern to array of characters
    const chars = pattern.split('');

    // Loop for the specified count
    for (let i = 0; i < count; i++) {
        // Construct the new pattern
        const newPattern = prefix + chars.join('');
        patterns.push(newPattern);

        // Increment the pattern for the next iteration
        let idx = chars.length - 1;
        while (idx >= 0) {
            const ord = chars[idx].charCodeAt(0) + 1;
            if (ord > 'z'.charCodeAt(0)) {
                chars[idx] = 'a';
                idx--;
            } else {
                chars[idx] = String.fromCharCode(ord);
                break;
            }
        }
    }

    return patterns;
}

// -----------------------------------------------------------------------
// End of library.
// -----------------------------------------------------------------------

module.exports = {
    cth_debug_trace,
    cth_get_root_dir,
    cth_skip_test,
    cth_set_cleos_provider,
    cth_set_cleos_url,
    cth_cleos,
    cth_cleos_pipe,
    cth_cleos_pipe2,
    cth_assert,
    cth_standard_args_parser,
    cth_call_driver,
    cth_generate_account_names,
};

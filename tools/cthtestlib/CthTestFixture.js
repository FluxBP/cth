// -----------------------------------------------------------------------
// DoHTestFixture.js
//
// The Test Fixture feature allow a single test script (cth "run" file)
//   to define and run multiple actual tests.
//
// FIXME: comment
// NOTE: fixtureInit() loads DoHTest.js as a convenience to the test
//   script. It's not a dependency of this module per se.
// -----------------------------------------------------------------------

const fs = require('fs');
const vm = require('vm');

// -----------------------------------------------------------------------
// GLOBAL variables
// -----------------------------------------------------------------------

// set the current fixture name (for logging) whenever this module is loaded
//   by anybody during the test flow and the global variable _fixtureCurrent
//   has not been declared or has an undefined value.
// the default value will signal in the run.log file that the current running
//   test is not using the fixtures feature
if (typeof _fixtureCurrent === 'undefined' || _fixtureCurrent === undefined) {
    _fixtureCurrent = 'NO_FIXTURE';
}

// last fixture error from fixtureRun, or undefined if any
fixtureLastError = undefined;

// -----------------------------------------------------------------------
// Private state (not exported)
// -----------------------------------------------------------------------

const fixtureCleanupFile = 'fixtureCleanup.js';

// fixture test name --> fixture result summary string
const fixtureResultMap = new Map();

// fixture tally
let fixturePassedCount = 0;
let fixtureFailedCount = 0;

// -----------------------------------------------------------------------
// cleos
//
// Wrapper to cth_cleos_pipe2 that throws a Javascript exception (error)
//   with the output as the error message, instead of returning the error
//   codes to the caller for crashing/failing the entire process.
//
// Since fixture testing runs multiple tests in the same process, an
//   error in one fixture test cannot simply exit the process.
//
// This also works EVEN if the test writer isn't using fixtures, since
//   if you throw an error and you don't catch it, it's going to crash
//   the process (good news for the createXXXGame() functions).
//
// This function will throw a ContractCheckError instead of a generic
//   Error if it can detect from the cleos command output that what
//   failed the contract was a check() that returned false.
// -----------------------------------------------------------------------

class ContractCheckError extends Error {
  constructor(code, message) {
    super(`Contract check failed with error code: ${code}, message: ${message}`);
    this.name = 'ContractCheckError';
    this.code = code;
    this.message = message;
  }
}

function cleos(args) {
  let [output, error] = cth_cleos_pipe2(args);
  if (error !== 0) {
      // Check if we can extract an integer error code check() failure in the contract
      const errorCodePattern = /assertion failure with error code: (\d+)(\n|\r|$)/;
      const match = output.match(errorCodePattern);
      if (match) {
          const code = match[1];
          let message = getError(code);
          throw new ContractCheckError(code, message);
      } else {
          const errorMessagePattern = /assertion failure with message: (.+)(\n|\r|$)/;
          const matchMsg = output.match(errorMessagePattern);
          if (matchMsg) {
              let msg = matchMsg[1];
              throw new ContractCheckError(0, msg);
          } else {
              throw new Error(output);
          }
      }
  }
  return output;
}

// -----------------------------------------------------------------------
// cleosNoThrow
//
// Just an alias to cth_cleos_pipe2.
// -----------------------------------------------------------------------

function cleosNoThrow(args) { return cth_cleos_pipe2(args); }

// -----------------------------------------------------------------------
// assert
//
// Non-garbage version of cth_assert().
// Throws Error on any failure. Companion to cleos(), above.
//
// NOTE: expr comes first, then the descriptive string, which is optional.
// -----------------------------------------------------------------------

function assert(expr, desc) {
    if (expr === undefined) {
        throw new Error("assert(): expr argument is undefined");
    }
    if (desc === undefined) {
        desc = '';
    } else if (desc.length > 0) {
        desc = "'" + desc + "': ";
    }
    expr = expr.trim();
    try {
        const result = eval(expr);
        if (result) {
            fixtureLog(`assert(): ${desc}'${expr}' is true.`);
        } else {
            throw new Error(`assert(): ${desc}'${expr}' is false.`);
        }
    } catch (error) {
        throw new Error(`assert(): expression evaluation has thrown ${error.constructor.name}: '${error.message}\nexpr: ${expr}\ndesc: ${desc}\n${error.stack}\n`);
    }
}

// -----------------------------------------------------------------------
// fixtureCrashed
//
// Crash the current running fixture test
// -----------------------------------------------------------------------

function fixtureCrashed(msg) {
    throw new Error(`ERROR: TEST [${_fixtureCurrent}]: fixtureCrashed: ${msg}`);
}

// -----------------------------------------------------------------------
// fixtureFailed
//
// Fail the current running fixture test
// -----------------------------------------------------------------------

function fixtureFailed(msg) {
    throw new Error(`ERROR: TEST [${_fixtureCurrent}]: fixtureFailed: ${msg}`);
}

// -----------------------------------------------------------------------
// fixtureLog
//
// Print msg with the current fixture name as prefix
// -----------------------------------------------------------------------

function fixtureLog(msg) {
    console.log(`TEST [${_fixtureCurrent}]: ${msg}`);
}

// -----------------------------------------------------------------------
// fixtureWarningLog
//
// Print warning msg with the current fixture name as prefix
// -----------------------------------------------------------------------

function fixtureWarningLog(msg) {
    console.log(`WARNING: TEST [${_fixtureCurrent}]: ${msg}`);
}

// -----------------------------------------------------------------------
// fixtureErrorLog
//
// Print error msg with the current fixture name as prefix
// -----------------------------------------------------------------------

function fixtureErrorLog(msg) {
    console.log(`ERROR: TEST [${_fixtureCurrent}]: ${msg}`);
}

// -----------------------------------------------------------------------
// fixtureRunning
//
// Returns true if inside of fixtureRun(), false otherwise.
// -----------------------------------------------------------------------

function fixtureRunning() {
    return (_fixtureCurrent !== 'NO_FIXTURE' && _fixtureCurrent !== 'FIXTURE_INIT' && _fixtureCurrent !== 'FIXTURE_FINISH');
}

// -----------------------------------------------------------------------
// fixtureRun
//
// Marks the start of a new test. If the test name ends with '.js', it
//   will interpret the name as a javascript file name and execute it.
// If there's a "fixtureCleanup.js" file in the test's current directory,
//   it will be loaded and executed before the test.
// -----------------------------------------------------------------------

function fixtureRun(testname) {
    _fixtureCurrent = testname;
    let result = '';
    if (fs.existsSync(fixtureCleanupFile)) {
        console.log(`TEST: fixtureRun(): loading fixture cleanup script '${fixtureCleanupFile}'...`);
        fixtureCleanupScript = fs.readFileSync(fixtureCleanupFile);
        console.log(`TEST: fixtureRun(): clearing fixture before running '${testname}'...`);
        try {
            vm.runInThisContext(fixtureCleanupScript);
        } catch (error) {
            console.log(`ERROR: TEST: fixtureRun(): error clearing fixture before running '${testname}':\n${error.stack}\n`);
            result = `Failed (can't clean up the fixture with '${fixtureCleanupScript}')`;
            fixtureFailedCount++;
        }
    }
    if (result === '') {
        console.log(`TEST: fixtureRun(): running '${testname}'...`);
        try {
            let script = fs.readFileSync(testname);
            vm.runInThisContext(script);
            result = "Passed.";
            fixturePassedCount++;
            fixtureLastError = undefined;
        } catch (error) {
            let checkStr = "";
            if (error instanceof ContractCheckError) {
                let codeLine = "";
                if (error.code > 0) {
                    codeLine = `Code: ${error.code}\n`;
                    checkStr = `, '${error.message}' (${error.code})`;
                } else {
                    checkStr = `, '{error.message}'`;
                }
                console.log(`ERROR: TEST: fixtureRun(): caught ContractCheckError running '${testname}':\n${codeLine}Message: ${error.message}\n${error.stack}\n`);
            } else {
                console.log(`ERROR: TEST: fixtureRun(): caught Error running '${testname}':\n${error.stack}\n`);
            }

            const regex = /at evalmachine\.\<anonymous\>:(\d+):(\d+)/;
            const match = error.stack.match(regex);
            let atStr = "";
            if (match) {
                const lineNumber = match[1];
                const columnNumber = match[2];
                atStr = ` at line ${lineNumber}:${columnNumber}`;
            }

            result = `Failed${atStr}${checkStr}.`;
            fixtureFailedCount++;
            fixtureLastError = error;
        }
    }
    fixtureResultMap.set(testname, result);
    console.log(`TEST: fixtureRun(): ${testname}: ${result}`);
    _fixtureCurrent = "FIXTURE_FINISH";
}

// -----------------------------------------------------------------------
// fixtureCount
//
// Returns the number of passed and failed fixture tests.
// -----------------------------------------------------------------------

function fixtureCount() {
    return [fixturePassedCount, fixtureFailedCount];
}

// -----------------------------------------------------------------------
// fixturePrintSummary
//
// Print fixture testing summary
// -----------------------------------------------------------------------

function fixturePrintSummary() {
    console.log();
    console.log("Fixture testing summary:");
    console.log();
    for (const [key, value] of fixtureResultMap) {
        console.log(`  ${key}: ${value}`);
    }
    console.log();
}

// -----------------------------------------------------------------------
// fixtureInit
//
// Wrapper to init() that resets _fixtureCurrent.
// -----------------------------------------------------------------------

function fixtureInit(startArgs) {

    console.log("TEST: fixtureInit(): initializing test...");

    // starts nodeos (from CthTest.js, loaded in the global scope)
    init(startArgs);

    // to differentiate from 'NO_FIXTURE'.
    _fixtureCurrent = 'FIXTURE_INIT';

    console.log("TEST: fixtureInit(): initialization OK.");
}

// -----------------------------------------------------------------------
// fixtureFinish
//
// Helper function that provides a standard way to finish a test process.
//
// This function exits the process either in success (0) or failure (1).
// -----------------------------------------------------------------------

function fixtureFinish(error) {

    console.log("TEST: fixtureFinish(): finishing test...");

    // clean up the test driver (from CthTest.js, loaded in the global scope)
    finish();

    if (error !== undefined) {
        // If given an error parameter, the summary is NOT printed.
        // Instead, it is assumed that the testcase run file failed entirely.
        console.log(`ERROR: TEST: fixtureFinish(): testcase was aborted by a fatal error: ${error}`);
        console.log("ERROR: TEST: fixtureFinish(): process.exit(1)");
        process.exit(1);
    } else {

        fixturePrintSummary();

        let [passCount, failCount] = fixtureCount();
        totalCount = passCount + failCount;

        if (failCount > 0) {
            console.log(`ERROR: TEST: fixtureFinish(): failed ${failCount} tests of ${totalCount} total.`);
            process.exit(1);
        } else {
            console.log(`TEST: fixtureFinish(): completed all (${totalCount}) tests successfully.`);
        }

        console.log("TEST: fixtureFinish(): process.exit(0)");
        process.exit(0);
    }
}

// -----------------------------------------------------------------------
// End of library.
// -----------------------------------------------------------------------

module.exports = {

    // Functions
    cleos,
    cleosNoThrow,
    assert,
    fixtureLog,
    fixtureWarningLog,
    fixtureErrorLog,
    fixtureCrashed,
    fixtureFailed,
    fixtureRunning,
    fixtureRun,
    fixtureCount,
    fixturePrintSummary,
    fixtureInit,
    fixtureFinish,

    // Exceptions
    ContractCheckError,
};

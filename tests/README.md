This is the default tests directory for cth, which contains sample tests.

Each testcase should go into its own subdirectory of the tests directory. The name of the testcase subdirectory is the name of test.

Tests should have an executable file called `run` in their subdirectory, which runs the test. The return value of `run` determines whether the test has succeeded or failed. A return value of zero indicates success, and any other value is a failure. The special return code `32` means the test has market itself as a skipped test (that is, it refused to run).

Tests should work the same whether they are invoked individually from the command-line or by automation. Good tests also work irrespective of the directory they are invoked from.

Tests can receive command-line arguments from cth, namely cth switches (`--switch, -s`) and options (`--option, -o`), which provide a way to configure or customize test runs.

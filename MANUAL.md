# cth

cth was designed to be a simple and extensible testing harness.

cth is a program that essentially scans potential test directories for executable files named `run`, following some simple rules, and once it gets a list of those test directories, which are the names of tests, it runs their `run` files if they pass a simple name filter (by defaults, it runs all of them).

So, tests are basically executables. They can be shebang scripts or binaries; cth does not care.

If the return of a `run` file is `0`, that test has passed. If it is `32`, the test has been skipped. If it is anything else, the test has failed.

## Writing tests

cth tests can be anything, but if they are Javascript or Perl 5 scripts, they can use the test libraries provided by cth, which allows one to write tests that interact with a `nodeos` instance using `cleos`, that is, to write tests for the Antelope Leap software stack.

## Finding and loading test libaries

cth will help the `run` scripts load libraries by doctoring the environment variables `NODE_PATH` and `PERL5LIB` to include the path to all Perl and Javascript libraries that it finds.

cth looks for these library directories in three places:

* Under `cth/tools/`;
* Under a `tools/` subdirectory of the directory where cth is invoked from;
* Under a `tools/` subdirectory under the directory specified by the `cth --plugin <dir>` option.

## Drivers

cth drivers are collections of scripts that implement the concept of a test driver.

A test driver is a collection of executable programs that can be called by a `run` executable test program to bring up and tear down the test environment.

cth comes with two drivers:

* `coldstart`: a driver that knows how to start and stop a single Leap blockchain node (a `nodeos` instance) at the default local ports from scratch.
* `hotstart`: a driver that knows how to start multiple Leap blockchain nodes (multiple `nodeos` instances) at various local ports from a saved snapshot (it has an internal snapshot for a generic Leap blockchain, but it can also start from a snapshot computed by an application tester / plugin).

The driver programs are under the `drivers/` directory. You can change into these directories and call the various scripts manually.

## Internal architecture

Mostly, cth works by having a predefined directory structure. A particular driver program knows that it can find the tools directory by doing `../../tools/`, for example, and vice-versa. And when cth is invoked, it can know where it is by checking `$0`. Once cth finds itself, and once a driver or tool finds itself, it is easy to find the other components via relative paths. The rest can be found under an user's `$PATH`, e.g. the Leap installation.

Users should place their cth directory in their `$PATH`, so they can invoke cth from anywhere.

## Extending cth with a custom application tester

You can create a `myapp-tester` project on its own project directory and repository to extend cth to your Leap dapp.

Usually, you will want to create a `tools/` subdirectory under that project directory, and write an e.g. Javascript library (not a module; just a plain .js file, for example, that can be `require()`'d) that provides functions that can be invoked by the shebang Javascript `run` files that implement your automated tests. Note that those custom libraries will already have access to all cth test libraries by default, since those would already be in the e.g. `NODE_PATH` so your test libraries can just load them, just like the test `run` scripts would. This allows your app's test library to wrap cth's test library calls, allowing you to provide e.g. a custom test initialization and test finish calls that would manage calling the cth init and finish functions internally, while adding more to the init and finish events.

## cth scripts

cth has an `-e` option which allows cth to run "scripts". Scripts are just executables, just like the `run` files of tests, but they are not tests, so they do not have e.g. pass/fail summaries. Otherwise, they have the `NODE_PATH` and `PERL5LIB` environment variables set for them, and if they are Javascript or Perl 5 scripts, they can load the test libraries and use them to call the test drivers to perform various tasks, such as the generation of custom Leap snapshots/data-directories.

## local subdirectory

the `local/` subdirectory inside of cth is the work directory, where drivers, scripts, tools, tests, etc. can all save and load data as needed. A good practice is for each component to create a subdirectory inside of `local/` that has its own component name, and under that, place other directories and files that it needs, but that is not mandatory. 

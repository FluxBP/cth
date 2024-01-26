# cth: Contract Test Harness for Antelope

cth is a collection of command-line tools that can be customized to build an automated test system for a set of Antelope contracts.

# Requirements

- Perl 5 (already installed by default in Ubuntu)
- NodeJS (taken care of by `install_dependencies.sh`)
- `git`, `cmake`, `make`, `wget`, `jq` (taken care of by `install_dependencies.sh`)
- Antelope Leap 4+ (cleos, keosd, nodeos) (https://github.com/antelopeio/leap/releases)
- Antelope CDT 4+ (https://github.com/antelopeio/cdt/releases)
- All programs and data required by your Antelope contracts at compile time and runtime

# Installation

```
git clone --recursive https://github.com/FluxBP/cth
cd cth
sudo ./install_dependencies.sh
```

# Usage

`cth -i -f` will install the test drivers, which compiles the Antelope system contracts and caches the blockchain data directory for quickly starting tests later, while `-f` forces the running of the sample tests under `tests` after installation.

`cth` without arguments runs the tests (test drivers must have already been installed once).

`cth --help` displays usage instructions.

# Troubleshooting

The `coldstart` driver binds to local TCP ports `8888` (for the `nodeos` HTTP API port) and `10000` (for the `nodeos` P2P port) when starting, and it will refuse to start if either of these local TCP ports is already taken. In that case, just make sure to free up these local TCP ports beforehand by terminating the competing processes.

Port `8888` is also the default `nodeos` HTTP API port, so if that local TCP port is bound to another `nodeos` instance, one quick solution is to run the following command, which kills ALL running `nodeos` processes on your machine:

```
cth --reset
```

# Customization

`cth` can be customized with additional test libraries that are specific to your application through a cth plugin. To do that, create a project directory or repository for your plugin, such as `mydapp-tester`, then create a `mydapp-tester/tools/` subdirectory in it, and inside that subdirectory, place Javascript or Perl libraries in it, following a similar organization to that of `cth/tools/`. Afterwards, all you have to do is use `cth --plugin <mydapp-tester-diretory-absolute-path>`, and your application's custom test libraries will be available for loading inside your testcases.

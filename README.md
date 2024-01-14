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

`cth --help` displays the manual.

# Troubleshooting

If `cth` seems to hang, you can run the following to kill all running `nodeos` processes on your machine:

```
cth --reset
```

This kills ALL `nodeos` processes, not just the ones started by `cth`. This remedies a known issue with the `coldstart` driver, which is currently hardcoded to use the default `nodeos` HTTP API port (8888).

# Customization

The `cth` distribution is a template. You can fork it to include your own drivers, libraries, and tools for your own project.

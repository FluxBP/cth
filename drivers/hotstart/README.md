`hotstart` is a driver that `start`s nodeos from a nodeos data directory that already has the system contracts deployed. It also supports parallel test execution by starting and stopping nodeos using specific local ports.

`start` will start one new instance under a new `/local/hotstart/<p2p-port-number>` and return that p2p port value to the caller.

`stopinstance` takes as argument the p2p port number of the instance to stop (`--port <num>`). It does not erase the data directory.

`clearinstance` takes as argument the p2p port number of the instance to clear (`--port <num>`). This will call `stopinstance` to ensure the instance is stopped, and then clear its data directory.

`stop` will stop all instances.

`clear` will clear all instances.

`reset` will forcibly destroy ALL `hotstart` instances in the system and erase all data in `/local/hotstart/`.

`install` must be called after the installation of the `coldstart` driver, and will build and cache a nodeos data directory at `/local/hotstart/nodeos-template` that allows tests to be quickly started with a predeployed blockchain state.

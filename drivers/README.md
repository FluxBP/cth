The `drivers` directory contains scripts that conform to the expected test driver interface. They are responsible for starting and stopping the test environment, i.e. the blockchain node and its state, such as the system contracts, and/or perhaps contracts and data for the project under testing (depends on the driver).

Each test will typically invoke the specific driver that it is written for, to instantiate the blockchain/contract testing environment that it is designed for. This is usually done via calls to functions provided by a test library.

Test drivers can also be developed in separate repositories and downloaded as submodules.

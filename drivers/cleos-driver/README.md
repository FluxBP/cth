
The cleos-driver is a simple driver that can be 'start'ed to provide a running keosd daemon with a default.wallet that has the standard "EOSIO developer key" in it.

For example, this is used both by the 'coldstart' driver and the 'dcs-combat-test' test. The latter will start the wallet if the test is running in remote mode (since in remote blockchain mode it does not run coldstart, and coldstart will not start the wallet). The wallet is smart enough to know that it is already started, and in that case 'start' just succeeds again. dcs-combat-test needs to call cleos and needs a configured wallet (with the developer key) to execute all its test actions in the DoH contracts. 

The wallet is unlocked and ready for use. All you have to do is point the wallet-url of cleos to this directory to find the keosd.sock file.

'clear' will kill the specific keosd running on the local keosd.sock and wipe the wallet files.

The wallet is unlocked for the default duration while idle, but since it is constantly used during testing, it should not lock. If it does lock, need to increase the wallet timeout when starting it (in the 'start' script).


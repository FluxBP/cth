#include <eosio/eosio.hpp>
#include <eosio/print.hpp>
using namespace eosio;

CONTRACT mycontract : public contract {
public:
    using contract::contract;

    ACTION helloworld() {
       print("Hello, world!\n");
    }

    mycontract(name receiver, name code, datastream<const char*> ds)
       : contract(receiver, code, ds)
    {
    }
};

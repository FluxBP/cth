// -----------------------------------------------------------------------
// CthTestLib.js
//
// Loads all Javascript test libraries in the global object.
//
// The module.exports of all these libraries is just pushed into the
//   global scope.
// -----------------------------------------------------------------------

Object.assign(global, require('CthTestDriver'));
Object.assign(global, require('CthTestFixture'));
Object.assign(global, require('CthTest'));
Object.assign(global, require('CthTestReflect'));

// -----------------------------------------------------------------------
// CthTestLib.js
//
// Loads all Javascript test libraries in the global object.
//
// These modules are actually fake modules, 
// -----------------------------------------------------------------------

Object.assign(global, require('CthTestDriver'));
Object.assign(global, require('CthTestFixture'));
Object.assign(global, require('CthTest'));
Object.assign(global, require('CthTestReflect'));

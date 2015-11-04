/*! ${name}.js ${version}

#include "LICENSE.md"
 */
/* eslint strict:0 */
(function(root) {
  var component = require('./twilio-common-bundle');
  /* globals define */
  if (typeof define === 'function' && define.amd) {
    define([], function() { return component; });
  } else {
    root.Twilio = root.Twilio || function Twilio() {};
    for (var componentName in component) {
      root.Twilio[componentName] = component[componentName];
    }
  }
})(window || global || this);

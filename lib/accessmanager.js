/* @flow */
'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

/**
 * Construct an {@link AccessManager} from an initial Access Token.
 * @class
 * @classdesc An {@link AccessManager} manages everything necessary for a
 *   Twilio Client to access Twilio. Namely, the {@link AccessManager} manages
 *   Access Tokens, and raises Access Token expiration events in the form of
 *   {@link AccessManager#event:tokenExpired}.
 * @param {string} initialToken - The initial Access Token
 * @property {?string} identity - The identity granted by the current Access
 *   Token; this value is populated asynchronously and is initially null
 * @property {string} token - The current Access Token
 * @property {boolean} isExpired - Whether or not the current Access Token is
 *   expired
 * @property {?Date} expires - The time at which he current Access Token
 *   expires; this value is populated asynchronously and is initially null
 * @fires AccessManager#error
 * @fires AccessManager#tokenExpired
 * @fires AccessManager#tokenUpdated
 */
/* ::
declare class AccessManager extends EventEmitter {
  _expires: ?Date;
  _identity: ?string;
  _isExpired: boolean;
  _pendingUpdate: ?Promise<this>;
  _token: string;
  _tokenExpiredTimer: ?number;
  _tokenUpdatedTimer: ?number;
  _tokenPayload: ?Object;
  expires: ?Date;
  identity: ?string;
  isExpired: boolean;
  token: string;
  updateToken: (newToken: string) => Promise<this>;
}
*/
function AccessManager(initialToken /* : string */) {
  if (!(this instanceof AccessManager)) {
    return new AccessManager(initialToken);
  }
  if (EventEmitter instanceof Function) {
    EventEmitter.call(this);
  }
  var expires = null;
  var identity = null;
  var isExpired = false;
  var pendingUpdate = null;
  var token = initialToken;
  var tokenExpiredTimer = null;
  var tokenUpdatedTimer = null;
  var tokenPayload = null;
  Object.defineProperties(this, {
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _expires: {
      get: function() {
        return expires;
      },
      set: function(_expires) {
        expires = _expires;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _identity: {
      get: function() {
        return identity;
      },
      set: function(_identity) {
        identity = _identity;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _isExpired: {
      get: function() {
        return isExpired;
      },
      set: function(_isExpired) {
        isExpired = _isExpired;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _pendingUpdate: {
      get: function() {
        return pendingUpdate;
      },
      set: function(_pendingUpdate) {
        pendingUpdate = _pendingUpdate;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _token: {
      get: function() {
        return token;
      },
      set: function(_token) {
        token = _token;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _tokenExpiredTimer: {
      get: function() {
        return tokenExpiredTimer;
      },
      set: function(_tokenExpiredTimer) {
        tokenExpiredTimer = _tokenExpiredTimer;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _tokenUpdatedTimer: {
      get: function() {
        return tokenUpdatedTimer;
      },
      set: function(_tokenUpdatedTimer) {
        tokenUpdatedTimer = _tokenUpdatedTimer;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    _tokenPayload: {
      get: function() {
        return tokenPayload;
      },
      set: function(_tokenPayload) {
        tokenPayload = _tokenPayload;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    expires: {
      enumerable: true,
      get: function() {
        return expires;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    identity: {
      enumerable: true,
      get: function() {
        return identity;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    isExpired: {
      enumerable: true,
      get: function() {
        return isExpired;
      }
    },
    // $FlowFixMe: https://github.com/facebook/flow/issues/285
    token: {
      enumerable: true,
      get: function() {
        return token;
      }
    }
  });
  var _pendingUpdate = this.updateToken(initialToken);
  _pendingUpdate.catch(function(error) {
    if (this._pendingUpdate === _pendingUpdate) {
      this.emit('error', error);
    }
  }.bind(this));
}

inherits(AccessManager, EventEmitter);

/**
 * Update the {@link AccessManager}'s current Access Token.
 * @param {string} newToken - A new Access Token
 * @returns {Promise<this>}
 * @fires AccessManager#tokenUpdated
 */
AccessManager.prototype.updateToken = function updateToken(newToken) {
  var self = this;

  var pendingUpdate = new Promise(function(resolve) {

    var payload = parsePayload(newToken);

    // Set the identity.
    self._identity = getIdentity(payload);

    // Emit the tokenUpdated event after the Promise resolves.
    clearTimeout(self._tokenUpdatedTimer);
    self._tokenUpdatedTimer = setTimeout(function tokenUpdated() {
      self._tokenUpdatedTimer = null;
      self.emit('tokenUpdated', self);
    });

    // Set expires, isExpired, and tokenExpired timer.
    self._expires = new Date(payload.exp * 1000);
    self._isExpired = Date.now() >= self.expires;
    clearTimeout(self._tokenExpiredTimer);
    self._tokenExpiredTimer = setTimeout(function tokenExpiredTimer() {
      self._isExpired = true;
      self._tokenExpiredTimer = null;
      self.emit('tokenExpired', self);
    }, self.expires - Date.now());

    // Update the token and tokenPayload.
    self._token = newToken;
    self._tokenPayload = payload;

    resolve(self);
  });

  this._pendingUpdate = pendingUpdate;

  return pendingUpdate;
};

/**
 * Parse the payload of a JSON Web Token (JWT).
 * @private
 * @param {string} jwt
 * @returns {object}
 */
function parsePayload(jwt /* : string */) /* : Object */ {
  var segments = jwt.split('.');
  if (segments.length !== 3) {
    throw new Error('Token is invalid or malformed');
  }
  var encodedPayloadString = segments[1];
  var payloadString = decodeBase64URL(encodedPayloadString);
  var payload = JSON.parse(payloadString);
  return payload;
}

/**
 * Decode a base64url-encoded string.
 * @private
 * @param {string} encoded
 * @returns {string}
 */
function decodeBase64URL(encoded /* : string */) /* : string */ {
  var remainder = encoded.length % 4;
  if (remainder > 0) {
    var padlen = 4 - remainder;
    encoded += new Array(padlen + 1).join('=');
  }
  encoded = encoded.replace(/-/g, '+')
                   .replace(/_/g, '/');
  return decodeBase64(encoded);
}

/**
 * Decode a base64-encoded string.
 * @private
 * @param {string} encoded
 * @returns {string}
 */
function decodeBase64(encoded /* : string */) /* : string */ {
  return new Buffer(encoded, 'base64').toString();
}

/* :: type CapabilityToken = { scope: string } */
/* :: type ScopedAccessToken = { grants: Array<{ res: string }> } */
/* :: type FirstPersonAccessToken = { grants: { identity?: string } } */

/**
 * Get the identity from the payload of an Access Token.
 * @private
 * @param {object} payload
 * @returns {?string}
 */
function getIdentity(payload /* : CapabilityToken | ScopedAccessToken | FirstPersonAccessToken */) /* : ?string */ {
  var identity = null;
  if (!payload.grants && payload.scope) {
    identity = getIdentityFromCapabilityTokenScope(payload.scope);
  } else if (payload.grants instanceof Array) {
    identity = getIdentityFromSATGrants(payload.grants);
  } else if (typeof payload.grants === 'object') {
    identity = getIdentityFromFPAGrants(payload.grants);
  }
  return identity;
}

/**
 * Get the identity from a Capability Token's Scope.
 * @private
 * @param {String} scope
 * @returns {?string}
 */
// TODO(rrowland): Remove this function as soon as we move to FPA.
function getIdentityFromCapabilityTokenScope(scope /* : string */) /* : ?string */ {
  var match = decodeURIComponent(scope).match(/identity=(.*?)(&|$)/i);
  return match && decodeURIComponent(match[1]);
}

/**
 * Get the identity from Scoped Access Token (SAT) grants.
 * @private
 * @param {Array<Object>} grants
 * @returns {?string}
 */
// TODO(mroberts): Remove this function as soon as we move to FPA.
function getIdentityFromSATGrants(grants /* : Array<{ res: string }> */) /* : ?string */ {
  var identity = null;
  for (var i = 0; i < grants.length; i++) {
    var grant = grants[i];
    if (grant && typeof grant.res === 'string') {
      var match = grant.res.match(/^sip:(.*)@/);
      if (match) {
        identity = decodeURIComponent(match[1]);
        break;
      }
    }
  }
  return identity;
}

/**
 * Get the identity from First-Person Access Token (FPA) grants.
 * @private
 * @param {object} grants
 * @returns {?string}
 */
function getIdentityFromFPAGrants(grants /* : { identity?: string } */) /* : ?string */ {
  return grants.identity || null;
}

/**
 * An error occurred.
 * @param {Error} error
 * @event AccessManager#error
 */

/**
 * The Access Token expired.
 * @param {AccessManager} manager
 * @event AccessManager#tokenExpired
 */

/**
 * The Access Token was updated.
 * @param {AccessManager} manager
 * @event AccessManager#tokenUpdated
 */

module.exports = AccessManager;

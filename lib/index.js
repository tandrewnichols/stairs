var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('stairs');
var slice = Array.prototype.slice;

exports = module.exports = Stairs;

exports.version = require('./../package.json').version;

function Stairs (title) {

  if (!(this instanceof Stairs)) {
    return new Stairs(title);
  }

  function stairs () {
    stairs.run.apply(stairs, slice.call(arguments));
    return stairs;
  }

  EventEmitter.call(this);

  stairs.__proto__ = Stairs.prototype;

  stairs.title = (title && 'string' === typeof title ? title : 'Untitled');

  return stairs;

}

util.inherits(Stairs, EventEmitter);

/**
 * Begins the processing of running through each step
 * given an optional context.  This method can be invoked
 * with out side effects.
 *
 * @param {Object} scope
 * @return Stairs
 */

Stairs.prototype.run = function () {
  debug('running %s', this.title);
  var self = this;
  var scope = slice.call(arguments).filter(function (arg) { return typeof arg !== 'undefined' && arg !== null });
  if (!scope.length) scope[0] = {};
  function next(scope, i, steps) {
    if ('function' !== typeof steps[i]) {
      self.emit.apply(self, ['done'].concat(scope));
      return;
    }
    steps[i].apply(steps[i], scope.concat(function (err) {
      if (err) {
        self.emit.apply(self, ['error', err].concat(scope));
        return;
      }
      next(scope, i + 1, steps);
    }));
  }
  process.nextTick(function () {next(scope, 0, self.steps());});
  return this;
};

/**
 * Adds a step
 *
 * @api public
 * @param {String} title *optional
 * @param {Function} fn
 */

Stairs.prototype.step = function (title, fn) {
  if (typeof title === 'function') {
    fn = title;
    title = 'Untitled Step ' + (this.steps().length);
  }
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }
  fn.title = title;
  this.steps().push(fn);
  return this;
};

/**
 * The steps
 *
 * @api private
 * @return Array
 */

Stairs.prototype.steps = function () {
  if (!util.isArray(this._steps)) {
    this._steps = [];
  }
  return this._steps;
};
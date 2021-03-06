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
  var scope = slice.call(arguments).filter(function (arg) { return typeof arg !== 'undefined' && arg !== null });
  if (!scope.length) scope[0] = {};

  var context = {
    state: {
      instance: this,
      scope: scope,
      i: -1,
      steps: this.steps().slice(0),
      end: false,
      done: (typeof scope[scope.length - 1] === 'function' ? scope.pop() : function () { debug('done'); })
    },
    interface: {
      
      /**
       * The title of these Stairs
       *
       * @argument String
       */

      title: this.title,

      /**
       * This method will end the execution of the process
       *
       * @api public
       * @return void
       */

      end: function () {
        if (context.state.end) return;
        context.state.end = true;
        context.state.instance.emit.apply(context.state.instance, ['done'].concat(context.state.scope));
        context.state.done.apply(context.state.done, context.state.scope);
      },

      /**
       * This method will call the next handler
       *
       * @api public
       * @param {Error} err *optional
       * @return void
       */

      next: function (err) {
        process.nextTick(function () {
          context.state.i++;
          debug('next %s / %s', context.state.i + 1, context.state.steps.length);
          if (context.state.end) return;
          if (err) return context.state.instance.emit.apply(context.state.instance, ['error', err].concat(context.state.scope));
          if ('function' !== typeof context.state.steps[context.state.i]) return context.interface.end();
          var step = context.state.steps[context.state.i];
          context.state.instance.emit('step', step.title, context.state.i + 1, context.state.steps.length);
          step.apply(context.interface, context.state.scope.concat(context.interface.next));
        });
      },

      /**
       * Skips to a step given a name even if it is a previous step
       *
       * @api public
       * @param {String} title The title of the step to skip 
       * @return void
       */

      skip: function (title) {
        var i = -1;
        do {
          if ('function' === typeof context.state.steps[i + 1] &&
              context.state.steps[i + 1].title === title) {
            context.state.i = i;
            this.next();
            break;
          }
        }
        while (++i < context.state.steps.length);
      }
    }
  };

  context.interface.next();

  return this;
};

/**
 * Adds a step
 *
 * @api public
 * @param {String} title *optional
 * @param {Function} fn
 */

Stairs.prototype.step = function (title, exclude, fn) {
  if (arguments.length === 1) {
    fn = title;
    exclude = false;
    title = 'Untitled Step ' + (this.steps().length);
  } else if (arguments.length === 2) {
    fn = exclude;
    if (typeof title === 'boolean') {
      exclude = title;
      title = 'Untitled Step ' + (this.steps().length);
    } else {
      exclude = false;
    }
  }
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }
  if (!exclude) {
    fn.title = title;
    this.steps().push(fn);
  }
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

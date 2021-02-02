import Base from './base.js'

/**
 * A sequence of effects to apply, treated as one effect. This can be useful
 * for defining reused effect sequences as one effect.
 */
class Stack extends Base {
  constructor (effects) {
    super()

    this._effectsBack = []
    this._effects = new Proxy(this._effectsBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(this, argumentsList)
      },
      deleteProperty: function (target, property) {
        const value = target[property]
        value.detach() // Detach effect from movie
        delete target[property]
        return true
      },
      set: function (target, property, value) {
        if (!isNaN(property)) { // if property is a number (index)
          if (target[property]) {
            target[property].detach() // Detach old effect from movie
          }
          value.attach(this._target) // Attach effect to movie
        }
        target[property] = value
        return true
      }
    })
    effects.forEach(effect => this.effects.push(effect))
  }

  attach (movie) {
    super.attach(movie)
    this.effects.forEach(effect => {
      effect.detach()
      effect.attach(movie)
    })
  }

  detach () {
    super.detach()
    this.effects.forEach(effect => {
      effect.detach()
    })
  }

  apply (target, reltime) {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      effect.apply(target, reltime)
    }
  }

  /**
   * @type module:effect.Base[]
   */
  get effects () {
    return this._effects
  }

  /**
   * Convenience method for chaining
   * @param {module:effect.Base} effect - the effect to append
   */
  addEffect (effect) {
    this.effects.push(effect)
    return this
  }
}

export default Stack

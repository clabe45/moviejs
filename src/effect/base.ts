import { watchPublic } from '../util.js'
import { publish, subscribe } from '../event.js'

/**
 * Modifies the visual contents of a layer.
 *
 * <em>Note: At this time, simply use the <code>actx</code> property of the movie to add audio nodes to a
 * layer's media. TODO: add more audio support, including more types of audio nodes, probably in a
 * different module.</em>
 */
class Base {
  constructor () {
    const newThis = watchPublic(this) // proxy that will be returned by constructor

    newThis.enabled = true
    newThis._target = null

    // Propogate up to target
    subscribe(newThis, 'effect.change.modify', event => {
      if (!newThis._target) {
        return
      }
      const type = `${newThis._target.type}.change.effect.modify`
      publish(newThis._target, type, { ...event, target: newThis._target, source: newThis, type })
    })

    return newThis
  }

  attach (target) {
    this._target = target
  }

  detach () {
    this._target = null
  }

  // subclasses must implement apply
  /**
   * Apply this effect to a target at the given time
   *
   * @param {module:movie|module:layer.Base} target
   * @param {number} reltime - the movie's current time relative to the layer
   * (will soon be replaced with an instance getter)
   * @abstract
   */
  apply (target, reltime) {
    throw new Error('No overriding method found or super.apply was called')
  }

  /**
   * The current time of the target
   * @type number
   */
  get currentTime () {
    return this._target ? this._target.currentTime : undefined
  }

  get parent () {
    return this._target
  }

  get movie () {
    return this._target ? this._target.movie : undefined
  }
}
// id for events (independent of instance, but easy to access when on prototype
// chain)
Base.prototype.type = 'effect'
Base.prototype.publicExcludes = []
Base.prototype.propertyFilters = {}

export default Base

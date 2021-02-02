import { publish, subscribe } from '../event.js'
import { watchPublic, applyOptions } from '../util.js'

/**
 * A layer outputs content for the movie
 */
class Base {
  /**
   * Creates a new empty layer
   *
   * @param {object} options
   * @param {number} options.startTime - when to start the layer on the movie's
   * timeline
   * @param {number} options.duration - how long the layer should last on the
   * movie's timeline
   */
  constructor (options) {
    // Set startTime and duration properties manually, because they are
    // readonly. applyOptions ignores readonly properties.
    this._startTime = options.startTime
    this._duration = options.duration

    // Proxy that will be returned by constructor (for sending 'modified'
    // events).
    const newThis = watchPublic(this)
    // Don't send updates when initializing, so use this instead of newThis
    applyOptions(options, this)

    // Whether this layer is currently being rendered
    this._active = false
    this.enabled = true

    this._movie = null

    // Propogate up to target
    subscribe(newThis, 'layer.change', event => {
      const typeOfChange = event.type.substring(event.type.lastIndexOf('.') + 1)
      const type = `movie.change.layer.${typeOfChange}`
      publish(newThis._movie, type, { ...event, target: newThis._movie, type })
    })

    return newThis
  }

  attach (movie) {
    this._movie = movie
  }

  detach () {
    this._movie = null
  }

  /**
   * Called when the layer is activated
   */
  start () {}

  /**
   * Called when the movie renders and the layer is active
   */
  render () {}

  /**
  * Called when the layer is deactivated
   */
  stop () {}

  get parent () {
    return this._movie
  }

  /**
   * If the attached movie's playback position is in this layer
   * @type boolean
   */
  get active () {
    return this._active
  }

  /**
   * @type number
   */
  get startTime () {
    return this._startTime
  }

  set startTime (val) {
    this._startTime = val
  }

  /**
   * The current time of the movie relative to this layer
   * @type number
   */
  get currentTime () {
    return this._movie ? this._movie.currentTime - this.startTime
      : undefined
  }

  /**
   * @type number
   */
  get duration () {
    return this._duration
  }

  set duration (val) {
    this._duration = val
  }

  get movie () {
    return this._movie
  }

  getDefaultOptions () {
    return {
      startTime: undefined, // required
      duration: undefined // required
    }
  }
}
// id for events (independent of instance, but easy to access when on prototype
// chain)
Base.prototype.type = 'layer'
Base.prototype.publicExcludes = []
Base.prototype.propertyFilters = {}

export default Base

import { subscribe } from '../event.js'
import { applyOptions, val } from '../util.js'
import Base from './base.js'

/**
 * Video or audio
 * @mixin AudioSourceMixin
 */
// TODO: Implement playback rate
const AudioSourceMixin = superclass => {
  if (superclass !== Base && !(superclass.prototype instanceof Base)) {
    throw new Error('AudioSourceMixin can only be applied to subclasses of Base')
  }

  class Media extends superclass {
    /**
     * @param {object} options
     * @param {HTMLVideoElement} options.source
     * @param {function} options.onload
     * @param {number} [options.sourceStartTime=0] - at what time in the audio
     * the layer starts
     * @param {numer} [options.duration=media.duration-options.sourceStartTime]
     * @param {boolean} [options.muted=false]
     * @param {number} [options.volume=1]
     * @param {number} [options.playbackRate=1]
     */
    constructor (options = {}) {
      const onload = options.onload
      // Don't set as instance property
      delete options.onload
      super(options)
      this._initialized = false
      // Set media manually, because it's readonly.
      this._source = options.source
      this._sourceStartTime = options.sourceStartTime || 0
      applyOptions(options, this)

      const load = () => {
        // TODO:              && ?
        if ((options.duration || (this.source.duration - this.sourceStartTime)) < 0) {
          throw new Error('Invalid options.duration or options.sourceStartTime')
        }
        this._unstretchedDuration = options.duration || (this.source.duration - this.sourceStartTime)
        this.duration = this._unstretchedDuration / (this.playbackRate)
        // onload will use `this`, and can't bind itself because it's before
        // super()
        onload && onload.bind(this)(this.source, options)
      }
      if (this.source.readyState >= 2) {
        // this frame's data is available now
        load()
      } else {
        // when this frame's data is available
        this.source.addEventListener('loadedmetadata', load)
      }
      this.source.addEventListener('durationchange', () => {
        this.duration = options.duration || (this.source.duration - this.sourceStartTime)
      })

      // TODO: on unattach?
      subscribe(this, 'movie.audiodestinationupdate', event => {
        // Connect to new destination if immeidately connected to the existing
        // destination.
        if (this._connectedToDestination) {
          this.audioNode.disconnect(this.movie.actx.destination)
          this.audioNode.connect(event.destination)
        }
      })
    }

    attach (movie) {
      super.attach(movie)

      subscribe(movie, 'movie.seek', () => {
        const time = movie.currentTime
        if (time < this.startTime || time >= this.startTime + this.duration) {
          return
        }
        this.source.currentTime = time - this.startTime
      })
      // connect to audiocontext
      this._audioNode = movie.actx.createMediaElementSource(this.source)

      // Spy on connect and disconnect to remember if it connected to
      // actx.destination (for Movie#record).
      const oldConnect = this._audioNode.connect.bind(this.audioNode)
      this._audioNode.connect = (destination, outputIndex, inputIndex) => {
        this._connectedToDestination = destination === movie.actx.destination
        return oldConnect(destination, outputIndex, inputIndex)
      }
      const oldDisconnect = this._audioNode.disconnect.bind(this.audioNode)
      this._audioNode.disconnect = (destination, output, input) => {
        if (this.connectedToDestination &&
        destination === movie.actx.destination) {
          this._connectedToDestination = false
        }
        return oldDisconnect(destination, output, input)
      }

      // Connect to actx.destination by default (can be rewired by user)
      this.audioNode.connect(movie.actx.destination)
    }

    start (reltime) {
      this.source.currentTime = reltime + this.sourceStartTime
      this.source.play()
    }

    render (reltime) {
      super.render(reltime)
      // TODO: implement Issue: Create built-in audio node to support built-in
      // audio nodes, as this does nothing rn
      this.source.muted = val(this, 'muted', reltime)
      this.source.volume = val(this, 'volume', reltime)
      this.source.playbackRate = val(this, 'playbackRate', reltime)
    }

    stop () {
      this.source.pause()
    }

    /**
     * The raw html media element
     * @type HTMLMediaElement
     */
    get source () {
      return this._source
    }

    /**
     * The audio source node for the media
     * @type MediaStreamAudioSourceNode
     */
    get audioNode () {
      return this._audioNode
    }

    get playbackRate () {
      return this._playbackRate
    }

    set playbackRate (value) {
      this._playbackRate = value
      if (this._unstretchedDuration !== undefined) {
        this.duration = this._unstretchedDuration / value
      }
    }

    get startTime () {
      return this._startTime
    }

    set startTime (val) {
      this._startTime = val
      if (this._initialized) {
        const mediaProgress = this._movie.currentTime - this.startTime
        this.source.currentTime = this.sourceStartTime + mediaProgress
      }
    }

    set sourceStartTime (val) {
      this._sourceStartTime = val
      if (this._initialized) {
        const mediaProgress = this._movie.currentTime - this.startTime
        this.source.currentTime = mediaProgress + this.sourceStartTime
      }
    }

    /**
     * Timestamp in the media where the layer starts at
     * @type number
     */
    get sourceStartTime () {
      return this._sourceStartTime
    }

    getDefaultOptions () {
      return {
        ...superclass.prototype.getDefaultOptions(),
        source: undefined, // required
        /**
         * @name module:layer~Media#sourceStartTime
         * @type number
         * @desc Timestamp in the media where the layer starts at
         */
        sourceStartTime: 0,
        /**
         * @name module:layer~Media#duration
         * @type number
         */
        duration: undefined, // important to include undefined keys, for applyOptions
        /**
         * @name module:layer~Media#muted
         * @type boolean
         */
        muted: false,
        /**
         * @name module:layer~Media#volume
         * @type number
         */
        volume: 1,
        /**
         * @name module:layer~Media#playbackRate
         * @type number
         * @todo <strong>Implement</strong>
         */
        playbackRate: 1
      }
    }
  };

  return Media // custom mixin class
}

export default AudioSourceMixin

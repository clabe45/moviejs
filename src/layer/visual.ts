import { val, applyOptions } from '../util.js'
import Base from './base.js'

/** Any layer that renders to a canvas */
class Visual extends Base {
  /**
   * Creates a visual layer
   *
   * @param {object} options - various optional arguments
   * @param {number} [options.width=null] - the width of the entire layer
   * @param {number} [options.height=null] - the height of the entire layer
   * @param {number} [options.x=0] - the offset of the layer relative to the
   * movie
   * @param {number} [options.y=0] - the offset of the layer relative to the
   * movie
   * @param {string} [options.background=null] - the background color of the
   * layer, or <code>null</code>
   *  for a transparent background
   * @param {object} [options.border=null] - the layer's outline, or
   * <code>null</code> for no outline
   * @param {string} [options.border.color] - the outline's color; required for
   * a border
   * @param {string} [options.border.thickness=1] - the outline's weight
   * @param {number} [options.opacity=1] - the layer's opacity; <code>1</cod>
   * for full opacity and <code>0</code> for full transparency
   */
  constructor (options) {
    super(options)
    // Only validate extra if not subclassed, because if subclcass, there will
    // be extraneous options.
    applyOptions(options, this)

    this._canvas = document.createElement('canvas')
    this._vctx = this.canvas.getContext('2d')

    this._effectsBack = []
    const that = this
    this._effects = new Proxy(this._effectsBack, {
      apply: function (target, thisArg, argumentsList) {
        return thisArg[target].apply(this, argumentsList)
      },
      deleteProperty: function (target, property) {
        const value = target[property]
        value.detach()
        delete target[property]
        return true
      },
      set: function (target, property, value, receiver) {
        if (!isNaN(property)) {
          // The property is a number (index)
          if (target[property]) {
            target[property].detach()
          }
          value.attach(that)
        }
        target[property] = value
        return true
      }
    })
  }

  /**
   * Render visual output
   */
  render (reltime) {
    this.beginRender(reltime)
    this.doRender(reltime)
    this.endRender(reltime)
  }

  beginRender (reltime) {
    this.canvas.width = val(this, 'width', reltime)
    this.canvas.height = val(this, 'height', reltime)
    this.vctx.globalAlpha = val(this, 'opacity', reltime)
  }

  doRender (reltime) {
    /*
     * If this.width or this.height is null, that means "take all available
     * screen space", so set it to this._move.width or this._movie.height,
     * respectively canvas.width & canvas.height are already interpolated
     */
    if (this.background) {
      this.vctx.fillStyle = val(this, 'background', reltime)
      // (0, 0) relative to layer
      this.vctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.border && this.border.color) {
      this.vctx.strokeStyle = val(this, 'border.color', reltime)
      // This is optional.. TODO: integrate this with defaultOptions
      this.vctx.lineWidth = val(this, 'border.thickness', reltime) || 1
    }
  }

  endRender (reltime) {
    const w = val(this, 'width', reltime) || val(this._movie, 'width', this.startTime + reltime)
    const h = val(this, 'height', reltime) || val(this._movie, 'height', this.startTime + reltime)
    if (w * h > 0) {
      this._applyEffects()
    }
    // else InvalidStateError for drawing zero-area image in some effects, right?
  }

  _applyEffects () {
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i]
      if (effect.enabled) {
        // Pass relative time
        effect.apply(this, this._movie.currentTime - this.startTime)
      }
    }
  }

  /**
   * Convienence method for <code>effects.push()</code>
   * @param {BaseEffect} effect
   * @return {module:layer.Visual} the layer (for chaining)
   */
  addEffect (effect) {
    this.effects.push(effect); return this
  }

  /**
   * The layer's rendering canvas
   * @type HTMLCanvasElement
   */
  get canvas () {
    return this._canvas
  }

  /**
   * The context of {@link module:layer.Visual#canvas}
   * @type CanvasRenderingContext2D
   */
  get vctx () {
    return this._vctx
  }

  /**
   * @type effect.Base[]
   */
  get effects () {
    // Private because it's a proxy
    return this._effects
  }

  getDefaultOptions () {
    return {
      ...Base.prototype.getDefaultOptions(),
      /**
       * @name module:layer.Visual#x
       * @type number
       * @desc The offset of the layer relative to the movie
       */
      x: 0,
      /**
       * @name module:layer.Visual#y
       * @type number
       * @desc The offset of the layer relative to the movie
       */
      y: 0,
      /**
       * @name module:layer.Visual#width
       * @type number
       */
      width: null,
      /**
       * @name module:layer.Visual#height
       * @type number
       */
      height: null,
      /**
       * @name module:layer.Visual#background
       * @type string
       * @desc The CSS color code for the background, or <code>null</code> for
       * transparency
       */
      background: null,
      /**
       * @name module:layer.Visual#border
       * @type string
       * @desc The CSS border style, or <code>null</code> for no border
       */
      border: null,
      /**
       * @name module:layer.Visual#opacity
       * @type number
       */
      opacity: 1
    }
  }
}
Visual.prototype.publicExcludes = Base.prototype.publicExcludes.concat(['canvas', 'vctx', 'effects'])
Visual.prototype.propertyFilters = {
  ...Base.propertyFilters,
  /*
   * If this.width or this.height is null, that means "take all available screen
   * space", so set it to this._move.width or this._movie.height, respectively
   */
  width: function (width) {
    return width != undefined ? width : this._movie.width // eslint-disable-line eqeqeq
  },
  height: function (height) {
    return height != undefined ? height : this._movie.height // eslint-disable-line eqeqeq
  }
}

export default Visual

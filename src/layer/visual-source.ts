import { val, applyOptions } from '../util.js'
import Visual from './visual.js'

/**
 * Image or video
 * @mixin VisualSourceMixin
 */
const VisualSourceMixin = superclass => {
  if (superclass !== Visual && !(superclass.prototype instanceof Visual)) {
    throw new Error('VisualSourceMixin can only be applied to subclasses of Visual')
  }

  class VisualSource extends superclass {
    /**
     * @param {number} startTime
     * @param {number} endTime
     * @param {(HTMLImageElement|HTMLVideoElement)} media
     * @param {object} [options]
     * @param {number} [options.sourceX=0] - image source x
     * @param {number} [options.sourceY=0] - image source y
     * @param {number} [options.sourceWidth=undefined] - image source width, or
     * <code>undefined</code> to fill the entire layer
     * @param {number} [options.sourceHeight=undefined] - image source height,
     * or <code>undefined</code> to fill the entire layer
     * @param {number} [options.destX=0] - offset of the image relative to the
     * layer
     * @param {number} [options.destY=0] - offset of the image relative to the
     * layer
     * @param {number} [options.destWidth=undefined] - width to render the
     * image at
     * @param {number} [options.destHeight=undefined] - height to render the
     * image at
     */
    constructor (options) {
      super(options)
      // Set readonly property manually
      this._source = options.source
      applyOptions(options, this)
    }

    doRender (reltime) {
      // Clear/fill background
      super.doRender(reltime)

      /*
       * Source dimensions crop the image. Dest dimensions set the size that
       * the image will be rendered at *on the layer*. Note that this is
       * different than the layer dimensions (`this.width` and `this.height`).
       * The main reason this distinction exists is so that an image layer can
       * be rotated without being cropped (see iss #46).
       */
      this.vctx.drawImage(
        this.source,
        val(this, 'sourceX', reltime), val(this, 'sourceY', reltime),
        val(this, 'sourceWidth', reltime), val(this, 'sourceHeight', reltime),
        // `destX` and `destY` are relative to the layer
        val(this, 'destX', reltime), val(this, 'destY', reltime),
        val(this, 'destWidth', reltime), val(this, 'destHeight', reltime)
      )
    }

    /**
     * The raw html media element
     * @type HTMLMediaElement
     */
    get source () {
      return this._source
    }

    getDefaultOptions () {
      return {
        ...superclass.prototype.getDefaultOptions(),
        source: undefined, // required
        /**
         * @name module:layer.VisualSource#sourceX
         * @type number
         */
        sourceX: 0,
        /**
         * @name module:layer.VisualSource#sourceY
         * @type number
         */
        sourceY: 0,
        /**
         * @name module:layer.VisualSource#sourceWidth
         * @type number
         * @desc How much to render of the source, or <code>undefined</code> to
         * render the entire width
         */
        sourceWidth: undefined,
        /**
         * @name module:layer.VisualSource#sourceHeight
         * @type number
         * @desc How much to render of the source, or <code>undefined</code> to
         * render the entire height
         */
        sourceHeight: undefined,
        /**
         * @name module:layer.VisualSource#destX
         * @type number
         */
        destX: 0,
        /**
         * @name module:layer.VisualSource#destY
         * @type number
         */
        destY: 0,
        /**
         * @name module:layer.VisualSource#destWidth
         * @type number
         * @desc Width to render the source at, or <code>undefined</code> to
         * use the layer's width
         */
        destWidth: undefined,
        /**
         * @name module:layer.VisualSource#destHeight
         * @type number
         * @desc Height to render the source at, or <code>undefined</code> to
         * use the layer's height
         */
        destHeight: undefined
      }
    }
  };
  VisualSource.prototype.propertyFilters = {
    ...Visual.propertyFilters,

    /*
     * If no layer width was provided, fall back to the dest width.
     * If no dest width was provided, fall back to the source width.
     * If no source width was provided, fall back to `source.width`.
     */
    sourceWidth: function (sourceWidth) {
      // != instead of !== to account for `null`
      const width = this.source instanceof HTMLImageElement
        ? this.source.width
        : this.source.videoWidth
      return sourceWidth != undefined ? sourceWidth : width // eslint-disable-line eqeqeq
    },
    sourceHeight: function (sourceHeight) {
      const height = this.source instanceof HTMLImageElement
        ? this.source.height
        : this.source.videoHeight
      return sourceHeight != undefined ? sourceHeight : height // eslint-disable-line eqeqeq
    },
    destWidth: function (destWidth) {
      // I believe reltime is redundant, as element#currentTime can be used
      // instead. (TODO: fact check)
      /* eslint-disable eqeqeq */
      return destWidth != undefined
        ? destWidth : val(this, 'sourceWidth', this.currentTime)
    },
    destHeight: function (destHeight) {
      /* eslint-disable eqeqeq */
      return destHeight != undefined
        ? destHeight : val(this, 'sourceHeight', this.currentTime)
    },
    width: function (width) {
      /* eslint-disable eqeqeq */
      return width != undefined
        ? width : val(this, 'destWidth', this.currentTime)
    },
    height: function (height) {
      /* eslint-disable eqeqeq */
      return height != undefined
        ? height : val(this, 'destHeight', this.currentTime)
    }
  }

  return VisualSource
}

export default VisualSourceMixin

/**
 * @module util
 */

import { publish } from './event.js'

/**
 * Gets the first matching property descriptor in the prototype chain, or
 * undefined.
 * @param {Object} obj
 * @param {string|Symbol} name
 */
function getPropertyDescriptor (obj, name) {
  do {
    const propDesc = Object.getOwnPropertyDescriptor(obj, name)
    if (propDesc) {
      return propDesc
    }
    obj = Object.getPrototypeOf(obj)
  } while (obj)
  return undefined
}

/**
 * Merges `options` with `defaultOptions`, and then copies the properties with
 * the keys in `defaultOptions` from the merged object to `destObj`.
 *
 * @return {undefined}
 */
// TODO: Make methods like getDefaultOptions private
export function applyOptions (options, destObj) {
  const defaultOptions = destObj.getDefaultOptions()

  // Validate; make sure `keys` doesn't have any extraneous items
  for (const option in options) {
    // eslint-disable-next-line no-prototype-builtins
    if (!defaultOptions.hasOwnProperty(option)) {
      throw new Error("Invalid option: '" + option + "'")
    }
  }

  // Merge options and defaultOptions
  options = { ...defaultOptions, ...options }

  // Copy options
  for (const option in options) {
    const propDesc = getPropertyDescriptor(destObj, option)
    // Update the property as long as the property has not been set (unless if it has a setter)
    if (!propDesc || propDesc.set) {
      destObj[option] = options[option]
    }
  }
}

// This must be cleared at the start of each frame
const valCache = new WeakMap()
function cacheValue (element, path, value) {
  // Initiate movie cache
  if (!valCache.has(element.movie)) {
    valCache.set(element.movie, new WeakMap())
  }
  const movieCache = valCache.get(element.movie)

  // Iniitate element cache
  if (!movieCache.has(element)) {
    movieCache.set(element, {})
  }
  const elementCache = movieCache.get(element)

  // Cache the value
  elementCache[path] = value
  return value
}
function hasCachedValue (element, path) {
  return valCache.has(element.movie) &&
    valCache.get(element.movie).has(element) &&
    path in valCache.get(element.movie).get(element)
}
function getCachedValue (element, path) {
  return valCache.get(element.movie).get(element)[path]
}
export function clearCachedValues (movie) {
  valCache.delete(movie)
}

export class KeyFrame {
  constructor (...value) {
    this.value = value
  }

  withKeys (keys) {
    this.interpolationKeys = keys
    return this
  }

  evaluate (time) {
    if (this.value.length === 0) {
      throw new Error('Empty keyframe')
    }
    if (time === undefined) {
      throw new Error('|time| is undefined or null')
    }
    const firstTime = this.value[0][0]
    if (time < firstTime) {
      throw new Error('No keyframe point before |time|')
    }
    // I think reduce are slow to do per-frame (or more)?
    for (let i = 0; i < this.value.length; i++) {
      const [startTime, startValue, interpolate = linearInterp] = this.value[i]
      if (i + 1 < this.value.length) {
        const endTime = this.value[i + 1][0]
        const endValue = this.value[i + 1][1]
        if (startTime <= time && time < endTime) {
          // No need for endValue if it is flat interpolation
          // TODO: support custom interpolation for 'other' types?
          if (!(typeof startValue === 'number' || typeof endValue === 'object')) {
            return startValue
          } else if (typeof startValue !== typeof endValue) {
            throw new Error('Type mismatch in keyframe values')
          } else {
            // Interpolate
            const percentProgress = (time - startTime) / (endTime - startTime)
            return interpolate(startValue, endValue, percentProgress, this.interpolationKeys)
          }
        }
      } else {
        // Repeat last value forever
        return startValue
      }
    }
  }
}

/**
 * Calculates the value of keyframe set <code>property</code> at
 * <code>time</code> if <code>property</code> is an array, or returns
 * <code>property</code>, assuming that it's a number.
 *
 * @param {(*|module:util.KeyFrames)} property - value or map of time-to-value
 * pairs for keyframes
 * @param {object} element - the object to which the property belongs
 * @param {number} time - time to calculate keyframes for, if necessary
 *
 * Note that only values used in keyframes that numbers or objects (including
 * arrays) are interpolated. All other values are taken sequentially with no
 * interpolation. JavaScript will convert parsed colors, if created correctly,
 * to their string representations when assigned to a CanvasRenderingContext2D
 * property.
 *
 * @typedef {Object} module:util.KeyFrames
 * @property {function} interpolate - the function to interpolate between
 * keyframes, defaults to {@link module:util.linearInterp}
 * @property {string[]} interpolationKeys - keys to interpolate for objects,
 * defaults to all own enumerable properties
 */
// TODO: Is this function efficient?
// TODO: Update doc @params to allow for keyframes
export function val (element, path, time) {
  if (hasCachedValue(element, path)) {
    return getCachedValue(element, path)
  }

  // Get property of element at path
  const pathParts = path.split('.')
  let property = element
  while (pathParts.length > 0) {
    property = property[pathParts.shift()]
  }
  // Property filter function
  const process = element.propertyFilters[path]

  let value
  if (property instanceof KeyFrame) {
    value = property.evaluate(time)
  } else if (typeof property === 'function') {
    value = property(element, time) // TODO? add more args
  } else {
    // Simple value
    value = property
  }
  return cacheValue(element, path, process ? process.call(element, value) : value)
}

/* export function floorInterp(x1, x2, t, objectKeys) {
    // https://stackoverflow.com/a/25835337/3783155 (TODO: preserve getters/setters, etc?)
    return !objectKeys ? x1 : objectKeys.reduce((a, x) => {
        if (x1.hasOwnProperty(x)) a[x] = o[x];  // ignore x2
        return a;
    }, Object.create(Object.getPrototypeOf(x1)));
} */

export function linearInterp (x1, x2, t, objectKeys) {
  if (typeof x1 !== typeof x2) {
    throw new Error('Type mismatch')
  }
  if (typeof x1 !== 'number' && typeof x1 !== 'object') {
    // Flat interpolation (floor)
    return x1
  }
  if (typeof x1 === 'object') { // to work with objects (including arrays)
    // TODO: make this code DRY
    if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) {
      throw new Error('Prototype mismatch')
    }
    // Preserve prototype of objects
    const int = Object.create(Object.getPrototypeOf(x1))
    // Take the intersection of properties
    const keys = Object.keys(x1) || objectKeys
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // eslint-disable-next-line no-prototype-builtins
      if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
        continue
      }
      int[key] = linearInterp(x1[key], x2[key], t)
    }
    return int
  }
  return (1 - t) * x1 + t * x2
}

export function cosineInterp (x1, x2, t, objectKeys) {
  if (typeof x1 !== typeof x2) {
    throw new Error('Type mismatch')
  }
  if (typeof x1 !== 'number' && typeof x1 !== 'object') {
    // Flat interpolation (floor)
    return x1
  }
  if (typeof x1 === 'object' && typeof x2 === 'object') { // to work with objects (including arrays)
    if (Object.getPrototypeOf(x1) !== Object.getPrototypeOf(x2)) {
      throw new Error('Prototype mismatch')
    }
    // Preserve prototype of objects
    const int = Object.create(Object.getPrototypeOf(x1))
    // Take the intersection of properties
    const keys = Object.keys(x1) || objectKeys
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // eslint-disable-next-line no-prototype-builtins
      if (!x1.hasOwnProperty(key) || !x2.hasOwnProperty(key)) {
        continue
      }
      int[key] = cosineInterp(x1[key], x2[key], t)
    }
    return int
  }
  const cos = Math.cos(Math.PI / 2 * t)
  return cos * x1 + (1 - cos) * x2
}

/**
 * An RGBA color, for proper interpolation and shader effects
 */
export class Color {
  /**
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} a
   */
  constructor (r, g, b, a = 1.0) {
    /** @type number */
    this.r = r
    /** @type number */
    this.g = g
    /** @type number */
    this.b = b
    /** @type number */
    this.a = a
  }

  /**
   * Converts to a CSS color
   */
  toString () {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`
  }
}

const parseColorCanvas = document.createElement('canvas')
parseColorCanvas.width = parseColorCanvas.height = 1
const parseColorCtx = parseColorCanvas.getContext('2d')
/**
 * Converts a CSS color string to a {@link module:util.Color} object
 * representation.
 * @param {string} str
 * @return {module:util.Color} the parsed color
 */
export function parseColor (str) {
  // TODO - find a better way to deal with the fact that invalid values of "col"
  // are ignored.
  parseColorCtx.clearRect(0, 0, 1, 1)
  parseColorCtx.fillStyle = str
  parseColorCtx.fillRect(0, 0, 1, 1)
  const data = parseColorCtx.getImageData(0, 0, 1, 1).data
  return new Color(data[0], data[1], data[2], data[3] / 255)
}

/**
 * A font, for proper interpolation
 */
export class Font {
  /**
   * @param {number} size
   * @param {string} family
   * @param {string} sizeUnit
   */
  constructor (size, sizeUnit, family, style = 'normal', variant = 'normal',
    weight = 'normal', stretch = 'normal', lineHeight = 'normal') {
    this.size = size
    this.sizeUnit = sizeUnit
    this.family = family
    this.style = style
    this.variant = variant
    this.weight = weight
    this.stretch = stretch
    this.lineHeight = lineHeight
  }

  /**
   * Converts to CSS font syntax
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
   */
  toString () {
    let s = ''
    if (this.style !== 'normal') s += this.style + ' '
    if (this.variant !== 'normal') s += this.variant + ' '
    if (this.weight !== 'normal') s += this.weight + ' '
    if (this.stretch !== 'normal') s += this.stretch + ' '
    s += `${this.size}${this.sizeUnit} `
    if (this.lineHeight !== 'normal') s += this.lineHeight + ' '
    s += this.family

    return s
  }
}

const parseFontEl = document.createElement('div')
/**
 * Converts a CSS font string to a {@link module:util.Font} object
 * representation.
 * @param {string} str
 * @return {module:util.Font} the parsed font
 */
export function parseFont (str) {
  // Assign css string to html element
  parseFontEl.setAttribute('style', `font: ${str}`)
  const {
    fontSize, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight
  } = parseFontEl.style
  parseFontEl.removeAttribute('style')

  const size = parseFloat(fontSize)
  const sizeUnit = fontSize.substring(size.toString().length)
  return new Font(size, sizeUnit, fontFamily, fontStyle, fontVariant, fontWeight, lineHeight)
}

/**
 * @param {*} mapper
 * @param {*} canvas
 * @param {*} ctx
 * @param {*} x
 * @param {*} y
 * @param {*} width
 * @param {*} height
 * @param {*} flush
 * @deprecated Use {@link effect.Shader} instead
 */
export function mapPixels (mapper, canvas, ctx, x, y, width, height, flush = true) {
  x = x || 0
  y = y || 0
  width = width || canvas.width
  height = height || canvas.height
  const frame = ctx.getImageData(x, y, width, height)
  for (let i = 0, l = frame.data.length; i < l; i += 4) {
    mapper(frame.data, i)
  }
  if (flush) {
    ctx.putImageData(frame, x, y)
  }
}

/**
 * <p>Emits "change" event when public properties updated, recursively.
 * <p>Must be called before any watchable properties are set, and only once in
 * the prototype chain.
 *
 * @param {object} target - object to watch
 */
export function watchPublic (target) {
  const getPath = (receiver, prop) =>
    (receiver === proxy ? '' : (paths.get(receiver) + '.')) + prop
  const callback = function (prop, val, receiver) {
    // Public API property updated, emit 'modify' event.
    publish(proxy, `${target.type}.change.modify`, { property: getPath(receiver, prop), newValue: val })
  }
  const check = prop => !(prop.startsWith('_') || target.publicExcludes.includes(prop))

  // The path to each child property (each is a unique proxy)
  const paths = new WeakMap()

  const handler = {
    set (obj, prop, val, receiver) {
      // Recurse
      if (typeof val === 'object' && val !== null && !paths.has(val) && check(prop)) {
        val = new Proxy(val, handler)
        paths.set(val, getPath(receiver, prop))
      }

      const was = prop in obj
      // Set property or attribute
      // Search prototype chain for the closest setter
      let objProto = obj
      while ((objProto = Object.getPrototypeOf(objProto))) {
        const propDesc = Object.getOwnPropertyDescriptor(objProto, prop)
        if (propDesc && propDesc.set) {
          // Call setter, supplying proxy as this (fixes event bugs)
          propDesc.set.call(receiver, val)
          break
        }
      }
      if (!objProto) {
        // Couldn't find setter; set value on instance
        obj[prop] = val
      }
      // Check if it already existed and if it's a valid property to watch, if
      // on root object.
      if (obj !== target || (was && check(prop))) {
        callback(prop, val, receiver)
      }
      return true
    }
  }

  const proxy = new Proxy(target, handler)
  return proxy
}

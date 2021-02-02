import { val } from '../util.js'
import Stack from './stack.js'
import Shader from './shader.js'

/**
 * Applies a Gaussian blur
 */
// TODO: Improve performance
// TODO: Make sure this is truly gaussian even though it doens't require a
// standard deviation
export class GaussianBlur extends Stack {
  constructor (radius) {
    // Divide into two shader effects (use the fact that gaussian blurring can
    // be split into components for performance benefits)
    super([
      new GaussianBlurHorizontal(radius),
      new GaussianBlurVertical(radius)
    ])
  }
}

/**
 * Shared class for both horizontal and vertical gaussian blur classes.
 */
// TODO: If radius == 0, don't affect the image (right now, the image goes black).
class GaussianBlurComponent extends Shader {
  /**
   * @param {string} src - fragment source code (specific to which component -
   * horizontal or vertical)
   * @param {number} radius - only integers are currently supported
   */
  constructor (src, radius) {
    super(src, {
      radius: '1i'
    }, {
      shape: { minFilter: 'NEAREST', magFilter: 'NEAREST' }
    })
    /**
     * @type number
     */
    this.radius = radius
    this._radiusCache = undefined
  }

  apply (target, reltime) {
    const radiusVal = val(this, 'radius', reltime)
    if (radiusVal !== this._radiusCache) {
      // Regenerate gaussian distribution canvas.
      this.shape = GaussianBlurComponent.render1DKernel(
        GaussianBlurComponent.gen1DKernel(radiusVal)
      )
    }
    this._radiusCache = radiusVal

    super.apply(target, reltime)
  }
}
GaussianBlurComponent.prototype.publicExcludes = Shader.prototype.publicExcludes.concat(['shape'])
/**
 * Render Gaussian kernel to a canvas for use in shader.
 * @param {number[]} kernel
 * @private
 *
 * @return {HTMLCanvasElement}
 */
GaussianBlurComponent.render1DKernel = kernel => {
  // TODO: Use Float32Array instead of canvas.
  // init canvas
  const canvas = document.createElement('canvas')
  canvas.width = kernel.length
  canvas.height = 1 // 1-dimensional
  const ctx = canvas.getContext('2d')

  // draw to canvas
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  for (let i = 0; i < kernel.length; i++) {
    imageData.data[4 * i + 0] = 255 * kernel[i] // Use red channel to store distribution weights.
    imageData.data[4 * i + 1] = 0 // Clear all other channels.
    imageData.data[4 * i + 2] = 0
    imageData.data[4 * i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)

  return canvas
}
GaussianBlurComponent.gen1DKernel = radius => {
  const pascal = GaussianBlurComponent.genPascalRow(2 * radius + 1)
  // don't use `reduce` and `map` (overhead?)
  let sum = 0
  for (let i = 0; i < pascal.length; i++) {
    sum += pascal[i]
  }
  for (let i = 0; i < pascal.length; i++) {
    pascal[i] /= sum
  }
  return pascal
}
GaussianBlurComponent.genPascalRow = index => {
  if (index < 0) {
    throw new Error(`Invalid index ${index}`)
  }
  let currRow = [1]
  for (let i = 1; i < index; i++) {
    const nextRow = []
    nextRow.length = currRow.length + 1
    // edges are always 1's
    nextRow[0] = nextRow[nextRow.length - 1] = 1
    for (let j = 1; j < nextRow.length - 1; j++) {
      nextRow[j] = currRow[j - 1] + currRow[j]
    }
    currRow = nextRow
  }
  return currRow
}

/**
 * Horizontal component of gaussian blur
 */
export class GaussianBlurHorizontal extends GaussianBlurComponent {
  /**
   * @param {number} radius
   */
  constructor (radius) {
    super(`
      #define MAX_RADIUS 250

      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;   // pixel dimensions of input and output
      uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
      uniform int u_Radius;   // TODO: support floating-point radii

      varying highp vec2 v_TextureCoord;

      void main() {
          /*
           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1
           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)
           * So, normalize by accumulating all the weights and dividing by that.
           */
          float totalWeight = 0.0;
          vec4 avg = vec4(0.0);
          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
              if (i >= 2 * u_Radius + 1)
                  break;  // GLSL can only use constants in for-loop declaration, so we break here.
              // (2 * u_Radius + 1) is the width of u_Shape, by definition
              float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format
              totalWeight += weight;
              vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(i - u_Radius, 0.0) / vec2(u_Size));
              avg += weight * sample;
          }
          gl_FragColor = avg / totalWeight;
      }
    `, radius)
  }
}

/**
 * Vertical component of gaussian blur
 */
export class GaussianBlurVertical extends GaussianBlurComponent {
  /**
   * @param {number} radius
   */
  constructor (radius) {
    super(`
      #define MAX_RADIUS 250

      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;   // pixel dimensions of input and output
      uniform sampler2D u_Shape;  // pseudo one-dimension of blur distribution (would be 1D but webgl doesn't support it)
      uniform int u_Radius;   // TODO: support floating-point radii

      varying highp vec2 v_TextureCoord;

      void main() {
          /*
           * Ideally, totalWeight should end up being 1, but due to rounding errors, it sometimes ends up less than 1
           * (I believe JS canvas stores values as integers, which rounds down for the majority of the Gaussian curve)
           * So, normalize by accumulating all the weights and dividing by that.
           */
          float totalWeight = 0.0;
          vec4 avg = vec4(0.0);
          // GLSL can only use constants in for-loop declaration, so start at zero, and stop before 2 * u_Radius + 1,
          // opposed to starting at -u_Radius and stopping _at_ +u_Radius.
          for (int i = 0; i < 2 * MAX_RADIUS + 1; i++) {
              if (i >= 2 * u_Radius + 1)
                  break;  // GLSL can only use constants in for-loop declaration, so we break here.
              // (2 * u_Radius + 1) is the width of u_Shape, by definition
              float weight = texture2D(u_Shape, vec2(float(i) / float(2 * u_Radius + 1), 0.5)).r;   // TODO: use single-channel format
              totalWeight += weight;
              vec4 sample = texture2D(u_Source, v_TextureCoord + vec2(0.0, i - u_Radius) / vec2(u_Size));
              avg += weight * sample;
          }
          gl_FragColor = avg / totalWeight;
      }
    `, radius)
  }
}

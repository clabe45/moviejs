import { val } from '../util.js'
import Shader from './shader.js'

/**
 * Makes the target look pixelated
 */
// TODO: just resample with NEAREST interpolation? but how?
class Pixelate extends Shader {
  /**
   * @param {number} pixelSize
   */
  constructor (pixelSize = 1) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform ivec2 u_Size;
      uniform int u_PixelSize;

      varying highp vec2 v_TextureCoord;

      void main() {
          int ps = u_PixelSize;

          // Snap to nearest block's center
          vec2 loc = vec2(u_Size) * v_TextureCoord; // pixel-space
          vec2 snappedLoc = float(ps) * floor(loc / float(ps));
          vec2 centeredLoc = snappedLoc + vec2(float(u_PixelSize) / 2.0 + 0.5);
          vec2 clampedLoc = clamp(centeredLoc, vec2(0.0), vec2(u_Size));
          gl_FragColor = texture2D(u_Source, clampedLoc / vec2(u_Size));
      }
    `, {
      pixelSize: '1i'
    })
    /**
     * @type number
     */
    this.pixelSize = pixelSize
  }

  apply (target, reltime) {
    const ps = val(this, 'pixelSize', reltime)
    if (ps % 1 !== 0 || ps < 0) {
      throw new Error('Pixel size must be a nonnegative integer')
    }

    super.apply(target, reltime)
  }
}

export default Pixelate

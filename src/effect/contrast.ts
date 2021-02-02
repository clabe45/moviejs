import Shader from './shader.js'

/**
 * Changes the contrast
 */
class Contrast extends Shader {
  /**
   * @param {number} [contrast=1] - the contrast multiplier
   */
  constructor (contrast = 1.0) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform float u_Contrast;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          vec3 rgb = clamp(u_Contrast * (color.rgb - 0.5) + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(rgb, color.a);
      }
    `, {
      contrast: '1f'
    })
    /**
     * The contrast multiplier
     * @type number
     */
    this.contrast = contrast
  }
}

export default Contrast

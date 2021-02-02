import Shader from './shader.js'

/**
 * Reduces alpha for pixels which are close to a specified target color
 */
class ChromaKey extends Shader {
  /**
   * @param {module:util.Color} [target={r: 0, g: 0, b: 0}] - the color to
   * remove
   * @param {number} [threshold=0] - how much error is allowed
   * @param {boolean} [interpolate=false] - <code>true</code> to interpolate
   * the alpha channel, or <code>false</code> value for no smoothing (i.e. an
   * alpha of either 0 or 255)
   * @param {number} [smoothingSharpness=0] - a modifier to lessen the
   * smoothing range, if applicable
   */
  // TODO: Use <code>smoothingSharpness</code>
  constructor (target = { r: 0, g: 0, b: 0 }, threshold = 0, interpolate = false/*, smoothingSharpness=0 */) {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec3 u_Target;
      uniform float u_Threshold;
      uniform bool u_Interpolate;

      varying highp vec2 v_TextureCoord;

      void main() {
          vec4 color = texture2D(u_Source, v_TextureCoord);
          float alpha = color.a;
          vec3 dist = abs(color.rgb - u_Target / 255.0);
          if (!u_Interpolate) {
              // Standard way that most video editors probably use (all-or-nothing method)
              float thresh = u_Threshold / 255.0;
              bool transparent = dist.r <= thresh && dist.g <= thresh && dist.b <= thresh;
              if (transparent)
                  alpha = 0.0;
          } else {
              /*
                  better way IMHO:
                  Take the average of the absolute differences between the pixel and the target for each channel
              */
              float transparency = (dist.r + dist.g + dist.b) / 3.0;
              // TODO: custom or variety of interpolation methods
              alpha = transparency;
          }
          gl_FragColor = vec4(color.rgb, alpha);
      }
    `, {
      target: '3fv',
      threshold: '1f',
      interpolate: '1i'
    })
    /**
     * The color to remove
     * @type module:util.Color
     */
    this.target = target
    /**
     * How much error is alloed
     * @type number
     */
    this.threshold = threshold
    /**
     * True value to interpolate the alpha channel,
     *  or false value for no smoothing (i.e. 255 or 0 alpha)
     * @type boolean
     */
    this.interpolate = interpolate
    // this.smoothingSharpness = smoothingSharpness;
  }
}

export default ChromaKey

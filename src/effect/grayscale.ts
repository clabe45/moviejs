import Shader from './shader.js'

class Grayscale extends Shader {
  constructor () {
    super(`
      precision mediump float;

      uniform sampler2D u_Source;
      uniform vec4 u_Factors;

      varying highp vec2 v_TextureCoord;

      float max3(float x, float y, float z) {
        return max(x, max(y, z));
      }

      float min3(float x, float y, float z) {
        return min(x, min(y, z));
      }

      void main() {
        vec4 color = texture2D(u_Source, v_TextureCoord);
        // Desaturate
        float value = (max3(color.r, color.g, color.b) + min3(color.r, color.g, color.b)) / 2.0;
        gl_FragColor = vec4(value, value, value, color.a);
      }
    `, {})
  }
}

export default Grayscale

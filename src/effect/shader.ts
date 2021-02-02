import { val } from '../util.js'
import Base from './base.js'

/**
 * A hardware-accelerated pixel mapping
 */
// TODO: can `v_TextureCoord` be replaced by `gl_FragUV`?
class Shader extends Base {
  /**
   * @param {string} fragmentSrc
   * @param {object} [userUniforms={}]
   * @param {object[]} [userTextures=[]]
   * @param {object} [sourceTextureOptions={}]
   */
  constructor (fragmentSrc = Shader._IDENTITY_FRAGMENT_SOURCE, userUniforms = {}, userTextures = [], sourceTextureOptions = {}) {
    super()
    // TODO: split up into multiple methods

    const gl = this._initGl()
    this._program = Shader._initShaderProgram(gl, Shader._VERTEX_SOURCE, fragmentSrc)
    this._buffers = Shader._initRectBuffers(gl)

    this._initTextures(userUniforms, userTextures, sourceTextureOptions)
    this._initAttribs()
    this._initUniforms(userUniforms)
  }

  _initGl () {
    this._canvas = document.createElement('canvas')
    const gl = this._canvas.getContext('webgl')
    if (gl === null) {
      throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
    }
    this._gl = gl
    return gl
  }

  _initTextures (userUniforms, userTextures, sourceTextureOptions) {
    const gl = this._gl
    const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    if (userTextures.length > maxTextures) {
      console.warn('Too many textures!')
    }
    this._userTextures = {}
    for (const name in userTextures) {
      const userOptions = userTextures[name]
      // Apply default options.
      const options = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...userOptions }

      if (options.createUniform) {
        /*
         * Automatically, create a uniform with the same name as this texture,
         * that points to it. This is an easy way for the user to use custom
         * textures, without having to define multiple properties in the effect
         * object.
         */
        if (userUniforms[name]) {
          throw new Error(`Texture - uniform naming conflict: ${name}!`)
        }
        // Add this as a "user uniform".
        userUniforms[name] = '1i' // texture pointer
      }
      this._userTextures[name] = options
    }
    this._sourceTextureOptions = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...sourceTextureOptions }
  }

  _initAttribs () {
    const gl = this._gl
    this._attribLocations = {
      textureCoord: gl.getAttribLocation(this._program, 'a_TextureCoord')
      // a_VertexPosition ?? somehow it works without it though...
    }
  }

  _initUniforms (userUniforms) {
    const gl = this._gl
    this._uniformLocations = {
      source: gl.getUniformLocation(this._program, 'u_Source'),
      size: gl.getUniformLocation(this._program, 'u_Size')
    }
    // The options value can just be a string equal to the type of the variable,
    // for syntactic sugar. If this is the case, convert it to a real options
    // object.
    this._userUniforms = {}
    for (const name in userUniforms) {
      const val = userUniforms[name]
      this._userUniforms[name] = typeof val === 'string' ? { type: val } : val
    }
    for (const unprefixed in userUniforms) {
      // property => u_Property
      const prefixed = 'u_' + unprefixed.charAt(0).toUpperCase() + (unprefixed.length > 1 ? unprefixed.slice(1) : '')
      this._uniformLocations[unprefixed] = gl.getUniformLocation(this._program, prefixed)
    }
  }

  // Not needed, right?
  /* watchWebGLOptions() {
        const pubChange = () => {
            this.publish("change", {});
        };
        for (let name in this._userTextures) {
            watch(this, name, pubChange);
        }
        for (let name in this._userUniforms) {
            watch(this, name, pubChange);
        }
    } */

  apply (target, reltime) {
    this._checkDimensions(target)
    this._refreshGl()

    this._enablePositionAttrib()
    this._enableTexCoordAttrib()
    this._prepareTextures(target, reltime)

    this._gl.useProgram(this._program)

    this._prepareUniforms(target, reltime)

    this._draw(target)
  }

  _checkDimensions (target) {
    const gl = this._gl
    // TODO: Change target.canvas.width => target.width and see if it breaks
    // anything.
    if (this._canvas.width !== target.canvas.width || this._canvas.height !== target.canvas.height) { // (optimization)
      this._canvas.width = target.canvas.width
      this._canvas.height = target.canvas.height

      gl.viewport(0, 0, target.canvas.width, target.canvas.height)
    }
  }

  _refreshGl () {
    const gl = this._gl
    // Clear to black; fragments can be made transparent with the blendfunc
    // below.
    gl.clearColor(0, 0, 0, 1)
    // gl.clearDepth(1.0);         // clear everything
    // not sure why I can't multiply rgb by zero
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.SRC_ALPHA, gl.ONE, gl.ZERO)
    gl.enable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
    // gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  }

  _enablePositionAttrib () {
    const gl = this._gl
    // Tell WebGL how to pull out the positions from buffer
    const numComponents = 2
    // The data in the buffer is 32bit floats
    const type = gl.FLOAT
    // Don't normalize
    const normalize = false
    // How many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const stride = 0
    // How many bytes inside the buffer to start from
    const offset = 0
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.position)
    gl.vertexAttribPointer(
      this._attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset)
    gl.enableVertexAttribArray(
      this._attribLocations.vertexPosition)
  }

  _enableTexCoordAttrib () {
    const gl = this._gl
    // tell webgl how to pull out the texture coordinates from buffer
    const numComponents = 2 // every coordinate composed of 2 values (uv)
    const type = gl.FLOAT // the data in the buffer is 32 bit float
    const normalize = false // don't normalize
    const stride = 0 // how many bytes to get from one set to the next
    const offset = 0 // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.textureCoord)
    gl.vertexAttribPointer(this._attribLocations.textureCoord, numComponents, type, normalize, stride, offset)
    gl.enableVertexAttribArray(this._attribLocations.textureCoord)
  }

  _prepareTextures (target, reltime) {
    const gl = this._gl
    // TODO: figure out which properties should be private / public

    // Tell WebGL we want to affect texture unit 0
    // Call `activeTexture` before `_loadTexture` so it won't be bound to the
    // last active texture.
    gl.activeTexture(gl.TEXTURE0)
    this._inputTexture = Shader._loadTexture(gl, target.canvas, this._sourceTextureOptions)
    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this._inputTexture)

    let i = 0
    for (const name in this._userTextures) {
      const options = this._userTextures[name]
      /*
       * Call `activeTexture` before `_loadTexture` so it won't be bound to the
       * last active texture.
       * TODO: investigate better implementation of `_loadTexture`
       */
      gl.activeTexture(gl.TEXTURE0 + (Shader.INTERNAL_TEXTURE_UNITS + i)) // use the fact that TEXTURE0, TEXTURE1, ... are continuous
      const preparedTex = Shader._loadTexture(gl, val(this, name, reltime), options) // do it every frame to keep updated (I think you need to)
      gl.bindTexture(gl[options.target], preparedTex)
      i++
    }
  }

  _prepareUniforms (target, reltime) {
    const gl = this._gl
    // Set the shader uniforms.

    // Tell the shader we bound the texture to texture unit 0.
    // All base (Shader class) uniforms are optional.
    if (this._uniformLocations.source) {
      gl.uniform1i(this._uniformLocations.source, 0)
    }

    // All base (Shader class) uniforms are optional.
    if (this._uniformLocations.size) {
      gl.uniform2iv(this._uniformLocations.size, [target.canvas.width, target.canvas.height])
    }

    for (const unprefixed in this._userUniforms) {
      const options = this._userUniforms[unprefixed]
      const value = val(this, unprefixed, reltime)
      const preparedValue = this._prepareValue(value, options.type, reltime, options)
      const location = this._uniformLocations[unprefixed]
      // haHA JavaScript (`options.type` is "1f", for instance)
      gl['uniform' + options.type](location, preparedValue)
    }
    gl.uniform1i(this._uniformLocations.test, 0)
  }

  _draw (target) {
    const gl = this._gl

    const offset = 0
    const vertexCount = 4
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount)

    // clear the target, in case the effect outputs transparent pixels
    target.vctx.clearRect(0, 0, target.canvas.width, target.canvas.height)
    // copy internal image state onto target
    target.vctx.drawImage(this._canvas, 0, 0)
  }

  /**
   * Converts a value of a standard type for javascript to a standard type for
   * GLSL
   * @param value - the raw value to prepare
   * @param {string} outputType - the WebGL type of |value|; example:
   * <code>1f</code> for a float
   * @param {number} reltime - current time, relative to the target
   * @param {object} [options] - Optional config
   */
  _prepareValue (value, outputType, reltime, options = {}) {
    const def = options.defaultFloatComponent || 0
    if (outputType === '1i') {
      /*
       * Textures are passed to the shader by both providing the texture (with
       * texImage2D) and setting the |sampler| uniform equal to the index of
       * the texture. In vidar shader effects, the subclass passes the names of
       * all the textures ot this base class, along with all the names of
       * uniforms. By default, corresponding uniforms (with the same name) are
       * created for each texture for ease of use. You can also define
       * different texture properties in the javascript effect by setting it
       * identical to the property with the passed texture name. In WebGL, it
       * will be set to the same integer texture unit.
       *
       * To do this, test if |value| is identical to a texture. If so, set it
       * to the texture's index, so the shader can use it.
       */
      let i = 0
      for (const name in this._userTextures) {
        const testValue = val(this, name, reltime)
        if (value === testValue) {
          value = Shader.INTERNAL_TEXTURE_UNITS + i // after the internal texture units
        }
        i++
      }
    }

    if (outputType === '3fv') {
      // allow 4-component vectors; TODO: why?
      if (Array.isArray(value) && (value.length === 3 || value.length === 4)) {
        return value
      }
      // kind of loose so this can be changed if needed
      if (typeof value === 'object') {
        return [
          value.r !== undefined ? value.r : def,
          value.g !== undefined ? value.g : def,
          value.b !== undefined ? value.b : def
        ]
      }

      throw new Error(`Invalid type: ${outputType} or value: ${value}`)
    }

    if (outputType === '4fv') {
      if (Array.isArray(value) && value.length === 4) {
        return value
      }
      // kind of loose so this can be changed if needed
      if (typeof value === 'object') {
        return [
          value.r !== undefined ? value.r : def,
          value.g !== undefined ? value.g : def,
          value.b !== undefined ? value.b : def,
          value.a !== undefined ? value.a : def
        ]
      }

      throw new Error(`Invalid type: ${outputType} or value: ${value}`)
    }

    return value
  }
}
// Shader.prototype.getpublicExcludes = () =>
Shader._initRectBuffers = gl => {
  const position = [
    // the screen/canvas (output)
    -1.0, 1.0,
    1.0, 1.0,
    -1.0, -1.0,
    1.0, -1.0
  ]
  const textureCoord = [
    // the texture/canvas (input)
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0
  ]

  return {
    position: Shader._initBuffer(gl, position),
    textureCoord: Shader._initBuffer(gl, textureCoord)
  }
}
/**
 * Creates the quad covering the screen
 */
Shader._initBuffer = (gl, data) => {
  const buffer = gl.createBuffer()

  // Select the buffer as the one to apply buffer operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)

  return buffer
}
/**
 * Creates a webgl texture from the source.
 * @param {object} [options] - optional WebGL config for texture
 * @param {number} [options.target=gl.TEXTURE_2D]
 * @param {number} [options.level=0]
 * @param {number} [options.internalFormat=gl.RGBA]
 * @param {number} [options.srcFormat=gl.RGBA]
 * @param {number} [options.srcType=gl.UNSIGNED_BYTE]
 * @param {number} [options.wrapS=gl.CLAMP_TO_EDGE]
 * @param {number} [options.wrapT=gl.CLAMP_TO_EDGE]
 * @param {number} [options.minFilter=gl.LINEAR]
 * @param {number} [options.magFilter=gl.LINEAR]
 */
Shader._loadTexture = (gl, source, options = {}) => {
  // Apply default options, just in case.
  options = { ...Shader._DEFAULT_TEXTURE_OPTIONS, ...options }
  // When creating the option, the user can't access `gl` so access it here.
  const target = gl[options.target]
  const level = options.level
  const internalFormat = gl[options.internalFormat]
  const srcFormat = gl[options.srcFormat]
  const srcType = gl[options.srcType]
  const wrapS = gl[options.wrapS]
  const wrapT = gl[options.wrapT]
  const minFilter = gl[options.minFilter]
  const magFilter = gl[options.magFilter]
  // TODO: figure out how wrap-s and wrap-t interact with mipmaps
  // (for legacy support)
  // let wrapS = options.wrapS ? options.wrapS : gl.CLAMP_TO_EDGE,
  //     wrapT = options.wrapT ? options.wrapT : gl.CLAMP_TO_EDGE;

  const tex = gl.createTexture()
  gl.bindTexture(target, tex)

  // gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true) // premultiply alpha

  // TODO: figure out how this works with layer width/height

  // TODO: support 3d textures (change texImage2D)
  // set to `source`
  gl.texImage2D(target, level, internalFormat, srcFormat, srcType, source)

  /*
   * WebGL1 has different requirements for power of 2 images vs non power of 2
   * images so check if the image is a power of 2 in both dimensions. Get
   * dimensions by using the fact that all valid inputs for texImage2D must have
   * `width` and `height` properties except videos, which have `videoWidth` and
   * `videoHeight` instead and `ArrayBufferView`, which is one dimensional (so
   * don't worry about mipmaps)
   */
  const w = target instanceof HTMLVideoElement ? target.videoWidth : target.width
  const h = target instanceof HTMLVideoElement ? target.videoHeight : target.height
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
  if ((w && isPowerOf2(w)) && (h && isPowerOf2(h))) {
    // Yes, it's a power of 2. All wrap modes are valid. Generate mips.
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)
    gl.generateMipmap(target)
  } else {
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    if (wrapS !== gl.CLAMP_TO_EDGE || wrapT !== gl.CLAMP_TO_EDGE) {
      console.warn('Wrap mode is not CLAMP_TO_EDGE for a non-power-of-two texture. Defaulting to CLAMP_TO_EDGE')
    }
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  return tex
}
const isPowerOf2 = value => (value && (value - 1)) === 0
Shader._initShaderProgram = (gl, vertexSrc, fragmentSrc) => {
  const vertexShader = Shader._loadShader(gl, gl.VERTEX_SHADER, vertexSrc)
  const fragmentShader = Shader._loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc)

  const shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  // Check program creation status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.warn('Unable to link shader program: ' + gl.getProgramInfoLog(shaderProgram))
    return null
  }

  return shaderProgram
}
Shader._loadShader = (gl, type, source) => {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  // Check compile status
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('An error occured compiling shader: ' + gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}
/**
 * WebGL texture units consumed by {@link Shader}
 */
Shader.INTERNAL_TEXTURE_UNITS = 1
Shader._DEFAULT_TEXTURE_OPTIONS = {
  createUniform: true,
  target: 'TEXTURE_2D',
  level: 0,
  internalFormat: 'RGBA',
  srcFormat: 'RGBA',
  srcType: 'UNSIGNED_BYTE',
  minFilter: 'LINEAR',
  magFilter: 'LINEAR',
  wrapS: 'CLAMP_TO_EDGE',
  wrapT: 'CLAMP_TO_EDGE'
}
Shader._VERTEX_SOURCE = `
  attribute vec4 a_VertexPosition;
  attribute vec2 a_TextureCoord;

  varying highp vec2 v_TextureCoord;

  void main() {
      // no need for projection or model-view matrices, since we're just rendering a rectangle
      // that fills the screen (see position values)
      gl_Position = a_VertexPosition;
      v_TextureCoord = a_TextureCoord;
  }
`
Shader._IDENTITY_FRAGMENT_SOURCE = `
  precision mediump float;

  uniform sampler2D u_Source;

  varying highp vec2 v_TextureCoord;

  void main() {
      gl_FragColor = texture2D(u_Source, v_TextureCoord);
  }
`

export default Shader

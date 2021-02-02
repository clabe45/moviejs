import { val } from '../util.js'
import Base from './base.js'

/**
 * Transforms a layer or movie using a transformation matrix. Use {@link
 * Transform.Matrix} to either A) calculate those values based on a series of
 * translations, scalings and rotations) or B) input the matrix values
 * directly, using the optional argument in the constructor.
 */
class Transform extends Base {
  /**
   * @param {module:effect.Transform.Matrix} matrix - how to transform the
   * target
   */
  constructor (matrix) {
    super()
    /**
     * How to transform the target
     * @type module:effect.Transform.Matrix
     */
    this.matrix = matrix
    this._tmpMatrix = new Transform.Matrix()
    this._tmpCanvas = document.createElement('canvas')
    this._tmpCtx = this._tmpCanvas.getContext('2d')
  }

  apply (target, reltime) {
    if (target.canvas.width !== this._tmpCanvas.width) {
      this._tmpCanvas.width = target.canvas.width
    }
    if (target.canvas.height !== this._tmpCanvas.height) {
      this._tmpCanvas.height = target.canvas.height
    }
    // Use data, since that's the underlying storage
    this._tmpMatrix.data = val(this, 'matrix.data', reltime)

    this._tmpCtx.setTransform(
      this._tmpMatrix.a, this._tmpMatrix.b, this._tmpMatrix.c,
      this._tmpMatrix.d, this._tmpMatrix.e, this._tmpMatrix.f
    )
    this._tmpCtx.drawImage(target.canvas, 0, 0)
    // Assume it was identity for now
    this._tmpCtx.setTransform(1, 0, 0, 0, 1, 0, 0, 0, 1)
    target.vctx.clearRect(0, 0, target.canvas.width, target.canvas.height)
    target.vctx.drawImage(this._tmpCanvas, 0, 0)
  }
}
/**
 * @class
 * A 3x3 matrix for storing 2d transformations
 */
Transform.Matrix = class Matrix {
  constructor (data) {
    this.data = data || [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]
  }

  identity () {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = Transform.Matrix.IDENTITY.data[i]
    }

    return this
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [val]
   */
  cell (x, y, val) {
    if (val !== undefined) {
      this.data[3 * y + x] = val
    }
    return this.data[3 * y + x]
  }

  /* For canvas context setTransform */
  get a () {
    return this.data[0]
  }

  get b () {
    return this.data[3]
  }

  get c () {
    return this.data[1]
  }

  get d () {
    return this.data[4]
  }

  get e () {
    return this.data[2]
  }

  get f () {
    return this.data[5]
  }

  /**
   * Combines <code>this</code> with another matrix <code>other</code>
   * @param other
   */
  multiply (other) {
    // copy to temporary matrix to avoid modifying `this` while reading from it
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        let sum = 0
        for (let i = 0; i < 3; i++) {
          sum += this.cell(x, i) * other.cell(i, y)
        }
        TMP_MATRIX.cell(x, y, sum)
      }
    }
    // copy data from TMP_MATRIX to this
    for (let i = 0; i < TMP_MATRIX.data.length; i++) {
      this.data[i] = TMP_MATRIX.data[i]
    }
    return this
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  translate (x, y) {
    this.multiply(new Transform.Matrix([
      1, 0, x,
      0, 1, y,
      0, 0, 1
    ]))

    return this
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  scale (x, y) {
    this.multiply(new Transform.Matrix([
      x, 0, 0,
      0, y, 0,
      0, 0, 1
    ]))

    return this
  }

  /**
   * @param {number} a - the angle or rotation in radians
   */
  rotate (a) {
    const c = Math.cos(a); const s = Math.sin(a)
    this.multiply(new Transform.Matrix([
      c, s, 0,
      -s, c, 0,
      0, 0, 1
    ]))

    return this
  }
}
/**
 * The identity matrix
 */
Transform.Matrix.IDENTITY = new Transform.Matrix()
const TMP_MATRIX = new Transform.Matrix()

export default Transform

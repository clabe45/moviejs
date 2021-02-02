/**
 * @module effect
 */

// TODO: Investigate why an effect might run once in the beginning even if its layer isn't at the beginning
// TODO: Add audio effect support
// TODO: Move shader source to external files
// TODO: implement directional blur
// TODO: implement radial blur
// TODO: implement zoom blur

import Base from './base.js'
import Brightness from './brightness.js'
import Channels from './channels.js'
import ChromaKey from './chroma-key.js'
import Contrast from './contrast.js'
import EllipticalMask from './elliptical-mask.js'
import { GaussianBlur, GaussianBlurHorizontal, GaussianBlurVertical } from './gaussian-blur.js'
import Grayscale from './grayscale.js'
import Pixelate from './pixelate.js'
import Shader from './shader.js'
import Stack from './stack.js'
import Transform from './transform.js'

export {
  Base,
  Brightness,
  Channels,
  ChromaKey,
  Contrast,
  EllipticalMask,
  GaussianBlur,
  GaussianBlurHorizontal,
  GaussianBlurVertical,
  Grayscale,
  Pixelate,
  Shader,
  Stack,
  Transform
}

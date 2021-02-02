import Visual from './visual.js'
import VisualSourceMixin from './visual-source.js'
import AudioSourceMixin from './audio-source.js'

// Use mixins instead of `extend`ing two classes (which isn't supported by
// JavaScript).
/**
 * @extends module:layer~Media
 */
class Video extends AudioSourceMixin(VisualSourceMixin(Visual)) {}

export default Video

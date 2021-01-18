/**
 * Contains all layers and movie information
 * 
 * Implements a sub/pub system (adapted from https://gist.github.com/lizzie/4993046)
 */
declare class Movie {
  /**
   * Creates a new `Movie` instance (project)
   *
   * @param canvas - the canvas to display image data on
   * @param [options] - various optional arguments
   * @param [options.audioContext=new AudioContext()]
   * @param [options.background="#000"] - the background color of the movijse,
   *  or `null` for a transparent background
   * @param [options.repeat=false] - whether to loop playbackjs
   * @param [options.autoRefresh=true] - whether to call `.refresh()` on init and when relevant layers
   *  are added/removed
   */
  constructor (canvas: HTMLCanvasElement, options?: Partial<{
    audioContext: BaseAudioContext;
    background: string;
    repeat: boolean;
    autoRefresh: boolean;
  }>);

  /**
   * Plays the movie
   * @return fulfilled when done playing, never fails
   */
  play (): Promise<void>;
  
  /**
   * Plays the movie in the background and records it
   *
   * @param framerate
   * @param [options]
   * @param [options.video=true] - whether to include video in recording
   * @param [options.audio=true] - whether to include audio in recording
   * @param [options.mediaRecorderOptions=undefined] - options to pass to the `MediaRecorder`
   * @param [options.type='video/webm'] - MIME type for exported video
   *  constructor
   * @return resolves when done recording, rejects when internal media recorder errors
   */
  record (framerate: number, options?: Partial<{
    video: boolean;
    audio: boolean;
    mediaRecorderOptions: object;
    type: string;
  }>): Promise<void>;

  /**
   * Stops the movie, without reseting the playback position
   * @return the movie (for chaining)
   */
  pause (): this;

  /**
   * Stops playback and resets the playback position
   * @return the movie (for chaining)
   */
  stop (): this;

  /**
   * Refreshes the screen (only use this if auto-refresh is disabled)
   * @return resolves when the frame is loaded
   */
  refresh (): Promise<void>;

  /**
   * If the movie is playing, recording or refreshing
   */
  get rendering(): boolean;

  /**
   * If the movie is refreshing current frame
   */
  get renderingFrame(): boolean;

  /**
   * If the movie is recording
   */
  get recording(): boolean;

  /**
   * The combined duration of all layers
   */
  get duration(): number;

  get layers(): Base[];

  /**
   * Convienence method for `layers.push()`
   * @param layer
   * @return the movie (for chaining)
   */
  addLayer (layer: Base): this;
  
  get effects(): EffectBase[];

  /**
   * Convienence method for `effects.push()`
   * @param effect
   * @return the movie (for chaining)
   */
  addEffect (effect: EffectBase): this;

  get paused(): boolean;

  /**
   * If the playback position is at the end of the movie
   */
  get ended(): boolean;

  /**
   * The current playback position
   */
  get currentTime(): number;

  /**
   * Sets the current playback position. This is a more powerful version of `set currentTime`.
   *
   * @param time - the new cursor's time value in seconds
   * @param [refresh=true] - whether to render a single frame to match new time or not
   * @return resolves when the current frame is rendered if `refresh` is true,
   *  otherwise resolves immediately
   */
  setCurrentTime (time: number, refresh?: number): Promise<void>;

  set currentTime (time: number);

  /**
   * The rendering canvas
   */
  get canvas (): HTMLCanvasElement;

  /**
   * The rendering canvas's context
   */
  get vctx (): CanvasRenderingContext2D;

  /**
   * The audio context to which audio is played
   */
  get actx (): BaseAudioContext;

  /**
   * The width of the rendering canvas
   */
  get width (): number;

  /**
   * The height of the rendering canvas
   */
  get height (): number;

  set width (width: number);

  set height (height: number);

  get movie (): this;

  getDefaultOptions (): {
    /**
     * @name module:movie#background
     * @desc The css color for the background, or `null` for transparency
     */
    background: string | null;

    /**
     * @name module:movie#repeat
     */
    repeat: boolean;

    /**
     * @name module:movie#autoRefresh
     * @desc Whether to refresh when changes are made that would effect the current frame
     */
    autoRefresh: boolean;
  }

  static type: string;

  static publicExcludes: string[];

  static propertyFilters: object;
}

/**
 * A layer is a piece of content for the movie
 */
declare class Base {
  /**
   * Creates a new empty layer
   *
   * @param startTime - when to start the layer on the movie's timeline
   * @param duration - how long the layer should last on the movie's timeline
   * @param [options] - no options, here for consistency
   */
  constructor (startTime: number, duration: number, options?: object);

  attach (movie: Movie): void;

  detach (): void;

  /**
   * Called when the layer is activated
   */
  start (reltime: number): void;

  /**
   * Called when the movie renders and the layer is active
   */
  render (reltime?: number): void;

  /**
  * Called when the layer is deactivated
   */
  stop (): void;

  get parent (): Movie;

  /**
   * If the attached movie's playback position is in this layer
   */
  get active (): boolean;
  
  get startTime (): number;

  set startTime (val: number);

  /**
   * The current time of the movie relative to this layer
   */
  get currentTime (): number;

  get duration (): number;

  set duration (val: number)

  get movie (): Movie;

  getDefaultOptions (): object;

  static type: string;
  
  static publicExcludes: string[];

  static propertyFilters: object;
}

/** Any layer that renders to a canvas */
declare class Visual extends Base {
  /**
   * Creates a visual layer
   *
   * @param startTime - when to start the layer on the movie's timeline
   * @param duration - how long the layer should last on the movie's timeline
   * @param [options] - various optional arguments
   * @param [options.width=null] - the width of the entire layer
   * @param [options.height=null] - the height of the entire layer
   * @param [options.x=0] - the offset of the layer relative to the movie
   * @param [options.y=0] - the offset of the layer relative to the movie
   * @param [options.background=null] - the background color of the layer, or `null`
   *  for a transparent background
   * @param [options.border=null] - the layer's outline, or `null` for no outline
   * @param [options.border.color] - the outline's color; required for a border
   * @param [options.border.thickness=1] - the outline's weight
   * @param [options.opacity=1] - the layer's opacity; `1</cod> for full opacity
   *  and `0` for full transparency
   */
  constructor (startTime: number, duration: number, options?: Partial<{
    width: number | null;
    height: number | null;
    x: number;
    y: number;
    background: string | null;
    border: Partial<{
      color: string;
      thickness: string;
    }> | null;
    opacity: number;
  }>);

  /**
   * Render visual output
   */
  render (reltime: number): void;

  beginRender (reltime: number): void;

  doRender (reltime: number): void;

  endRender (reltime: number): void;

  /**
   * Convienence method for `effects.push()`
   * @param effect
   * @return the layer (for chaining)
   */
  addEffect (effect: EffectBase): this;

  /**
   * The intermediate rendering canvas
   */
  get canvas (): HTMLCanvasElement;

  /**
   * The context of {@link module:layer.Visual#canvas}
   */
  get vctx (): CanvasRenderingContext2D;
  
  get effects (): unknown[];

  getDefaultOptions (): VisualOptions | object;

  static publicExcludes: string[];

  static propertyFilters: object;
}

declare class Text extends Visual {
  /**
   * Creates a new text layer
   *
   * @param startTime
   * @param duration
   * @param text - the text to display
   * @param width - the width of the entire layer
   * @param height - the height of the entire layer
   * @param [options] - various optional arguments
   * @param [options.x=0] - the horizontal position of the layer (relative to the movie)
   * @param [options.y=0] - the vertical position of the layer (relative to the movie)
   * @param [options.background=null] - the background color of the layer, or `null`
   *  for a transparent background
   * @param [options.border=null] - the layer's outline, or `null` for no outline
   * @param [options.border.color] - the outline"s color; required for a border
   * @param [options.border.thickness=1] - the outline"s weight
   * @param [options.opacity=1] - the layer"s opacity; `1</cod> for full opacity
   *  and `0` for full transparency
   * @param [options.font="10px sans-serif"]
   * @param [options.color="#fff"]
   * @param [options.textX=0] - the text's horizontal offset relative to the layer
   * @param [options.textY=0] - the text's vertical offset relative to the layer
   * @param [options.maxWidth=null] - the maximum width of a line of text
   * @param [options.textAlign="start"] - horizontal align
   * @param [options.textBaseline="top"] - vertical align
   * @param [options.textDirection="ltr"] - the text direction
   */
  constructor (startTime: number, duration: number, text: string, options?: Partial<{
    x: number;
    y: number;
    background: string;
    border: Partial<{
      color: string;
      thickness: number;
    }>;
    opacity: number;
    font: string;
    color: string;
    textX: number;
    textY: number;
    maxWidth: number;
    textAlign: string;
    textBaseline: string;
    textDirection: string;
  }>);

  doRender (reltime: number): void;

  getDefaultOptions (): Partial<VisualOptions> & {
    background: string | null;

    /**
     * @name module:layer.Text#font
     * @desc The css font to render with
     */
    font: string;

    /**
     * @name module:layer.Text#font
     * @desc The css color to render with
     */
    color: string;

    /**
     * @name module:layer.Text#textX
     * @desc Offset of the text relative to the layer
     */
    textX: number;

    /**
     * @name module:layer.Text#textY
     * @type number
     * @desc Offset of the text relative to the layer
     */
    textY: number;

    /**
     * @name module:layer.Text#maxWidth
     */
    maxWidth: number | null;

    /**
     * @name module:layer.Text#textAlign
     * @desc The horizontal alignment
     * @see [`CanvasRenderingContext2D#textAlign`]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign}
     */
    textAlign: string;

    /**
     * @name module:layer.Text#textAlign
     * @desc the vertical alignment
     * @see [`CanvasRenderingContext2D#textBaseline`]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
     */
    textBaseline: string;

    /**
     * @name module:layer.Text#textDirection
     * @see [`CanvasRenderingContext2D#direction`]{@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textBaseline}
     */
    textDirection: string;
  }
}

declare class Image extends Visual {
  /**
   * Creates a new image layer
   *
   * @param {number} startTime
   * @param {number} duration
   * @param {HTMLImageElement} image
   * @param {object} [options]
   * @param {number} [options.x=0] - the offset of the layer relative to the movie
   * @param {number} [options.y=0] - the offset of the layer relative to the movie
   * @param {string} [options.background=null] - the background color of the layer, or `null`
   *  for transparency
   * @param {object} [options.border=null] - the layer"s outline, or `null` for no outline
   * @param {string} [options.border.color] - the outline"s color; required for a border
   * @param {string} [options.border.thickness=1] - the outline"s weight
   * @param {number} [options.opacity=1] - the layer"s opacity; `1</cod> for full opacity
   *  and `0` for full transparency
   * @param {number} [options.clipX=0] - image source x
   * @param {number} [options.clipY=0] - image source y
   * @param {number} [options.clipWidth=undefined] - image source width, or `undefined` to fill the entire layer
   * @param {number} [options.clipHeight=undefined] - image source height, or `undefined` to fill the entire layer
   */
  constructor (startTime: number, duration: number, image: HTMLImageElement, options?: Partial<{
    x: number;
    y: number;
    background: string;
    border: Partial<{
      color: string;
      thickness: number;
    }>;
    opacity: number;
    clipX: number;
    clipY: number;
    clipWidth: number;
    clipHeight: number;
  }>);

  width: number;
  height: number;

  doRender (reltime: number): void;

  get image (): HTMLImageElement;

  getDefaultOptions (): Partial<VisualOptions> & {
    /**
     * @name module:layer.Image#clipX
     * @desc Image source x
     */
    clipX: number;

    /**
     * @name module:layer.Image#clipY
     * @desc Image source y
     */
    clipY: number;
    /**
     * @name module:layer.Image#clipWidth
     * @desc Image source width, or `undefined` to fill the entire layer
     */
    clipWidth: number;

    /**
     * @name module:layer.Image#clipHeight
     * @desc Image source height, or `undefined` to fill the entire layer
     */
    clipHeight: number;
  }
}

declare class Media extends Base {
  /**
   * @param startTime
   * @param media
   * @param [options]
   * @param [options.mediaStartTime=0] - at what time in the audio the layer starts
   * @param [options.duration=media.duration-options.mediaStartTime]
   * @param [options.muted=false]
   * @param [options.volume=1]
   * @param [options.playbackRate=1]
   */
  constructor (startTime: number, media: HTMLVideoElement, onload?: Function, options?: Partial<{
    mediaStartTime: number;
    duration: number;
    muted: boolean;
    volume: number;
    playbackRate: number;
  }>);

  attach (movie: Movie): void;

  start (reltime: number): void;

  render (reltime: number): void;

  stop (): void;

  /**
   * The raw html media element
   */
  get media (): HTMLMediaElement;

  /**
   * The audio source node for the media
   */
  get source (): MediaStreamAudioSourceNode;

  get playbackRate (): number;

  set playbackRate (value: number);

  get startTime (): number;

  set startTime (val: number);

  set mediaStartTime (val: number);

  /**
   * Where in the media the layer starts at
   */
  get mediaStartTime (): number;

  getDefaultOptions (): Partial<VisualOptions> & {
    /**
     * @name module:layer~Media#mediaStartTime
     * @desc Where in the media the layer starts at
     */
    mediaStartTime: number;

    /**
     * @name module:layer~Media#duration
     */
    duration: number | undefined; // important to include undefined keys, for applyOptions

    /**
     * @name module:layer~Media#muted
     */
    muted: boolean;

    /**
     * @name module:layer~Media#volume
     */
    volume: number;
    /**
     * @name module:layer~Media#playbackRate
     * @todo <strong>Implement</strong>
     */
    playbackRate: number;
  }
}

/**
 * Video or audio
 * @mixin MediaMixin
 */
declare function MediaMixin<T extends typeof Base>(superclass: T): new () => Media;

// use mixins instead of `extend`ing two classes (which doens't work); see below class def
/**
 * @extends module:layer~Media
 */
declare class Video extends MediaMixin(Visual) {
  /**
   * Creates a new video layer
   *
   * @param startTime
   * @param media
   * @param [options]
   * @param [options.mediaStartTime=0] - at what time in the audio the layer starts
   * @param [options.duration=media.duration-options.mediaStartTime]
   * @param [options.muted=false]
   * @param [options.volume=1]
   * @param [options.speed=1] - the audio's playerback rate
   * @param [options.mediaStartTime=0] - at what time in the video the layer starts
   * @param [options.duration=media.duration-options.mediaStartTime]
   * @param [options.clipX=0] - video source x
   * @param [options.clipY=0] - video source y
   * @param [options.clipWidth] - video destination width
   * @param [options.clipHeight] - video destination height
   */
  constructor (startTime: number, media: HTMLVideoElement, options?: Partial<{
    mediaStartTime: number;
    duration: number;
    muted: boolean;
    volume: number;
    speed: number;
    clipX: number;
    clipY: number;
    clipWidth: number;
    clipHeight: number;
  }>);

  doRender (reltime: number): void;

  getDefaultOptions (): Partial<VisualOptions> & {
    /**
     * @name module:layer.Video#clipX
     * @desc Video source x
     */
    clipX: number;

    /**
     * @name module:layer.Video#clipY
     * @desc Video source y
     */
    clipY: number;

    /**
     * @name module:layer.Video#clipWidth
     * @desc Video source width, or `undefined` to fill the entire layer
     */
    clipWidth: number | undefined;

    /**
     * @name module:layer.Video#clipHeight
     * @type number
     * @desc Video source height, or `undefined` to fill the entire layer
     */
    clipHeight: number | undefined;
  }
}

/**
 * @extends module:layer~Media
 */
declare class Audio extends MediaMixin(Base) {
  /**
   * Creates an audio layer
   *
   * @param startTime
   * @param media
   * @param [options]
   * @param [options.mediaStartTime=0] - at what time in the audio the layer starts
   * @param [options.duration=media.duration-options.mediaStartTime]
   * @param [options.muted=false]
   * @param [options.volume=1]
   * @param [options.speed=1] - the audio's playerback rate
   */
  constructor (startTime: number, media: HTMLAudioElement, options?: Partial<{
    mediaStartTime: number;
    duration: number;
    muted: boolean;
    volume: number;
    speed: number;
  }>);

  getDefaultOptions (): object;
}

interface VidarLayers {
  Base: Base;
  Visual: Visual;
  Text: Text;
  Image: Image;
  Media: Media;
  MediaMixin: typeof MediaMixin;
  Video: Video;
  Audio: Audio;
}

type VisualOptions = {
  /**
   * @name module:layer.Visual#x
   * @desc The offset of the layer relative to the movie
   */
  x: number;

  /**
   * @name module:layer.Visual#y
   * @desc The offset of the layer relative to the movie
   */
  y: number;

  /**
   * @name module:layer.Visual#width
   */
  width: number | null;

  /**
   * @name module:layer.Visual#height
   */
  height: number | null;

  /**
   * @name module:layer.Visual#background
   * @desc The css color code for the background, or `null` for transparency
   */
  background: string | null;

  /**
   * @name module:layer.Visual#border
   * @desc The css border style, or `null` for no border
   */
  border: string | null;

  /**
   * @name module:layer.Visual#opacity
   */
  opacity: number;
}

declare class EffectBase {
  constructor ()

  attach (target: object): void;

  detach (): void;

  /**
   * Apply this effect to a target at the given time
   *
   * @param target
   * @param reltime - the movie's current time relative to the layer (will soon be replaced with an instance getter)
   * @abstract
   */
  apply (target: Movie | Base, reltime: number): void;

  /**
   * The current time of the target
   * @type number
   */
  get currentTime (): number;

  get parent (): object;

  get movie (): Movie;

  static type: string;
  static publicExcludes: string[];
  static propertyFilters: string[];
}

/**
 * A sequence of effects to apply, treated as one effect. This can be useful for defining reused effect sequences as one effect.
 */
declare class Stack extends EffectBase {
  constructor (effects: EffectBase[]);

  attach (movie: Movie): void;

  detach (): void;

  apply (target: Movie | Base, reltime: number): void;

  get effects (): EffectBase[];

  /**
   * Convenience method for chaining
   * @param effect - the effect to append
   */
  addEffect (effect: EffectBase): this;

}

/**
 * A hardware-accelerated pixel mapping
 */
declare class Shader extends Base {
  /**
   * @param fragmentSrc
   * @param [userUniforms={}]
   * @param [userTextures=[]]
   * @param [sourceTextureOptions={}]
   */
  constructor (fragmentSrc: string, userUniforms?: object, userTextures?: object[], sourceTextureOptions?: object);

  apply (target: object, reltime: number): void;

  /**
   * WebGL texture units consumed by `Shader`
   */
  static INTERNAL_TEXTURE_UNITS: number;
}

/**
 * Changes the brightness
 */
declare class Brightness extends Shader {
  /**
   * @param [brightness=0] - the value to add to each pixel's channels [-255, 255]
   */
  constructor (brightness?: number);

}

/**
 * Changes the contrast
 */
declare class Contrast extends Shader {
  /**
   * @param [contrast=1] - the contrast multiplier
   */
  constructor (contrast?: number);

  /**
   * The contrast multiplier
   */
  contrast: number;
}

declare class Grayscale extends Shader {
  constructor ();
}

/**
 * Multiplies each channel by a different number
 */
declare class Channels extends Shader {
  /**
   * @param {module:util.Color} factors - channel factors, each defaulting to 1
   */
  constructor (factors?: object);

  /**
   * Channel factors, each defaulting to 1
   */
  factors: object;
}

/**
 * Reduces alpha for pixels which are close to a specified target color
 */
declare class ChromaKey extends Shader {
  /**
   * @param [target={r: 0, g: 0, b: 0}] - the color to remove
   * @param [threshold=0] - how much error is allowed
   * @param [interpolate=false] - true value to interpolate the alpha channel,
   *  or false value for no smoothing (i.e. 255 or 0 alpha)
   * @param [smoothingSharpness=0] - a modifier to lessen the smoothing range, if applicable
   * @todo Use <code>smoothingSharpness</code>
   */
  constructor (target?: object, threshold?: number, interpolate?: boolean, smoothingSharpness?: number);

  /**
   * The color to remove
   */
  target: object;

  /**
   * How much error is alloed
   */
  threshold: number;

  /**
   * True value to interpolate the alpha channel,
   *  or false value for no smoothing (i.e. 255 or 0 alpha)
   */
  interpolate: boolean;
}

/**
 * Applies a Gaussian blur
 */
declare class GaussianBlur extends Stack {
  constructor (radius: number);
}

/**
 * Shared class for both horizontal and vertical gaussian blur classes.
 */
declare class GaussianBlurComponent extends Shader {
  /**
   * @param {string} src - fragment src code specific to which component (horizontal or vertical)
   * @param {number} radius
   */
  constructor (src: string, radius: number);

  apply (target: object, reltime: number): void;

  static publicExcludes: string[];
}

/**
 * Horizontal component of gaussian blur
 */
declare class GaussianBlurHorizontal extends GaussianBlurComponent {
  /**
   * @param radius
   */
  constructor (radius: number);
}

/**
 * Vertical component of gaussian blur
 */
declare class GaussianBlurVertical extends GaussianBlurComponent {
  /**
   * @param radius
   */
  constructor (radius: number);
}

/**
 * Makes the target look pixelated
 */
declare class Pixelate extends Shader {
  /**
   * @param pixelSize
   */
  constructor (pixelSize: number);

  pixelSize: number;

  apply (target: object, reltime: number): void;
}

/**
 * Transforms a layer or movie using a transformation matrix. Use {@link Transform.Matrix}
 * to either A) calculate those values based on a series of translations, scalings and rotations)
 * or B) input the matrix values directly, using the optional argument in the constructor.
 */
declare class Transform extends Base {
  /**
   * @param matrix - how to transform the target
   */
  constructor (matrix: Matrix);

  /**
   * How to transform the target
   */
  matrix: Matrix;

  apply (target: object, reltime: number): void;
}
/**
 * A 3x3 matrix for storing 2d transformations
 */
declare class Matrix {
  constructor (data: number[]);

  identity (): this;

  /**
   * @param x
   * @param y
   * @param [val]
   */
  cell (x: number, y: number, val?: number): unknown;

  /* For canvas context setTransform */
  get a (): number;

  get b (): number;

  get c (): number;

  get d (): number;

  get e (): number;

  get f (): number;

  /**
   * Combines <code>this</code> with another matrix <code>other</code>
   * @param other
   */
  multiply (other: unknown): this;

  /**
   * @param x
   * @param y
   */
  translate (x: number, y: number): this;

  /**
   * @param x
   * @param y
   */
  scale (x: number, y: number): this;

  /**
   * @param a - the angle or rotation in radians
   */
  rotate (a: number): this;

  /**
   * The identity matrix
   */
  static IDENTITY: Matrix;
}

/**
 * Preserves an ellipse of the layer and clears the rest
 */
declare class EllipticalMask extends EffectBase {
  constructor (x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise: boolean);

  apply (target: object, reltime: number): void;
}

interface VidarEffects {
  Base: EffectBase;
  Stack: Stack;
  Shader: Shader;
  Brightness: Brightness;
  Contrast: Contrast;
  Grayscale: Grayscale;
  Channels: Channels;
  ChromaKey: ChromaKey;
  GaussianBlur: GaussianBlur;
  GaussianBlurComponent: GaussianBlurComponent;
  GaussianBlurHorizontal: GaussianBlurHorizontal;
  GaussianBlurVertical: GaussianBlurVertical;
  Pixelate: Pixelate;
  Transform: Transform;
  EllipticalMask: EllipticalMask;
}

/**
 * Emits an event to all listeners
 *
 * @param target - a Vidar object
 * @param type - the id of the type (can contain subtypes, such as "type.subtype")
 * @param listener
 */
declare function subscribe (target: object, type: string, listener: Function): void;

/**
 * Emits an event to all listeners
 *
 * @param target - a Vidar object
 * @param type - the id of the type (can contain subtypes, such as "type.subtype")
 * @param event - any additional event data
 */
declare function publish <T extends object>(target: object, type: string, event: T): T

interface VidarEvent {
  subscribe: typeof subscribe;
  public: typeof publish;
}

/**
 * Merges `options` with `defaultOptions`, and then copies the properties with the keys in `defaultOptions`
 *  from the merged object to `destObj`.
 */
declare function applyOptions (options: object, destObj: object): void;

declare function clearCachedValues (movie: Movie): void;

declare class KeyFrame {
  constructor (...value: unknown[]);

  withKeys (keys: unknown[]): this;

  evaluate (time: number): unknown;
}

/**
 * Calculates the value of keyframe set <code>property</code> at <code>time</code> if
 * <code>property</code> is an array, or returns <code>property</code>, assuming that it's a number.
 *
 * @param {(*|module:util.KeyFrames)} property - value or map of time-to-value pairs for keyframes
 * @param {object} element - the object to which the property belongs
 * @param {number} time - time to calculate keyframes for, if necessary
 *
 * Note that only values used in keyframes that numbers or objects (including arrays) are interpolated.
 * All other values are taken sequentially with no interpolation. JavaScript will convert parsed colors,
 * if created correctly, to their string representations when assigned to a CanvasRenderingContext2D property
 * (I'm pretty sure).
 */
declare function val (element: object, path: string, time: number): unknown;

declare function linearInterp (x1: number, x2: number, t: number, objectKeys: string[]): number;

declare function cosineInterp (x1: number, x2: number, t: number, objectKeys: string[]): number;

/**
 * An rgba color, for proper interpolation and shader effects
 */
declare class Color {
  /**
   * @param r
   * @param g
   * @param b
   * @param a
   */
  constructor (r: number, g: number, b: number, a: number);

  r: number;
  g: number;
  b: number;
  a: number;

  /**
   * Converts to css color
   */
  toString (): string;
}

/**
 * Converts a css color string to a {@link module:util.Color} object representation.
 * @param str
 * @return the parsed color
 */
declare function parseColor (str: string): Color;

/**
 * A font, for proper interpolation
 */
declare class Font {
  /**
   * @param size
   * @param family
   * @param sizeUnit
   */
  constructor (size: number, sizeUnit: string, family: string, style?: string, variant?: string,
    weight?: string, stretch?: string, lineHeight?: string);

  size: number;
  sizeUnit: string;
  family: string;
  style: string;
  variant: string;
  weight: string;
  stretch: string;
  lineHeight: string;

  /**
   * Converts to css font syntax
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
   */
  toString (): string;
}

/**
 * <p>Emits "change" event when public properties updated, recursively
 * <p>Must be called before any watchable properties are set, and only once in the prototype chain
 *
 * @param {object} target - object to watch
 */
declare function watchPublic (target: object): ProxyConstructor;

interface VidarExports {
  Movie: Movie;
  layer: VidarLayers;
  effect: VidarEffects;
  event: VidarEvent;

  // utils
  applyOptions: typeof applyOptions;
  clearCachedValues: typeof clearCachedValues;
  KeyFrame: KeyFrame;
  val: typeof val;
  linearInterp: typeof linearInterp;
  cosineInterp: typeof cosineInterp;
  Color: Color;
  parseColor: typeof parseColor;
  Font: Font;
  watchPublic: typeof watchPublic;
}

declare const vd: VidarExports;
export default vd;

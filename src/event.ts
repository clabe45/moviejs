/**
 * @module event
 */

const listeners = new WeakMap()

/**
 * An event type
 * @private
 */
class TypeId {
  constructor (id) {
    this.parts = id.split('.')
  }

  contains (other) {
    if (other.length > this.length) {
      return false
    }

    for (let i = 0; i < other.parts.length; i++) {
      if (other.parts[i] !== this.parts[i]) {
        return false
      }
    }
    return true
  }

  toString () {
    return this.parts.join('.')
  }
}

/**
 * Emits an event to all listeners
 *
 * @param {object} target - a vidar object
 * @param {string} type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param {function} listener
 */
export function subscribe (target, type, listener) {
  if (!listeners.has(target)) {
    listeners.set(target, [])
  }

  listeners.get(target).push(
    { type: new TypeId(type), listener }
  )
}

/**
 * Emits an event to all listeners
 *
 * @param {object} target - a vidar object
 * @param {string} type - the id of the type (can contain subtypes, such as
 * "type.subtype")
 * @param {object} event - any additional event data
 */
export function publish (target, type, event) {
  event.target = target // could be a proxy
  event.type = type

  const t = new TypeId(type)

  if (!listeners.has(target)) {
    // No event fired
    return null
  }

  // Call event listeners for this event.
  const listenersForType = []
  for (let i = 0; i < listeners.get(target).length; i++) {
    const item = listeners.get(target)[i]
    if (t.contains(item.type)) {
      listenersForType.push(item.listener)
    }
  }

  for (let i = 0; i < listenersForType.length; i++) {
    const listener = listenersForType[i]
    listener(event)
  }

  return event
}

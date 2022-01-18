// @ts-nocheck
import { useEffect, useRef, useState } from 'react'

// Set the name of the hidden property and the change event for visibility
let hidden, visibilityChange
if (typeof document.hidden !== 'undefined') {
  // Opera 12.10 and Firefox 18 and later support
  hidden = 'hidden'
  visibilityChange = 'visibilitychange'
} else if (typeof document.msHidden !== 'undefined') {
  hidden = 'msHidden'
  visibilityChange = 'msvisibilitychange'
} else if (typeof document.webkitHidden !== 'undefined') {
  hidden = 'webkitHidden'
  visibilityChange = 'webkitvisibilitychange'
}

export function usePageVisibility(onChange) {
  const [isPageVisible, setIsPageVisible] = useState(!document[hidden])
  const callBack = useRef(onChange)

  function handleVisibilityChange() {
    setIsPageVisible(!document[hidden])
    // eslint-disable-next-line no-unused-expressions
    callBack.current?.(!document[hidden])
  }
  useEffect(() => {
    document.addEventListener(visibilityChange, handleVisibilityChange, false)
    return () => {
      document.removeEventListener(visibilityChange, handleVisibilityChange)
    }
  }, [])

  return isPageVisible
}

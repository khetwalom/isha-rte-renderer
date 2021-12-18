// @ts-nocheck

/**
 * Isha Shaka Player Module
 *
 * Version: isha-3.1.1-0:
 *          Orig shaka player has been modified to allow disabling of the pause
 *          functionality, as Isha life streams are not allowed to be paused.
 *
 * Dependencies:
 *  [Shaka Player] --> yarn add https://bitbucket.org/thomas_kinder/shaka-player.git#isha-3.1.1-0
 *  [mux.js]       -- yarn add mux.js
 * @callback onErrorCb
 * @param {object} evt -- shaka plyer error event
 *
 * @callback onStartCb
 * @callback onPauseCb
 * @callback onReadyCb
 * @callback onBufferCb
 * @callback onBufferEndCb

 *
 * @param {onErrorCb} onError - Shaka player error handler
 * @param {onStartCb} onStart - called when the play button was pressed by the user
 * @param {onPauseCb} onPause - called when video is paused
 * @param {onReadyCb} onReady - called when vidoe is loaded and ready to be played
 * @param {onBufferCb} onBuffer - called on start of video buffering
 * @param {onBufferEndCb} onBufferEnd - called on end of video buffering
 *
 * @param {string} url - video url accepts *.m3u8 and *.mpd video files
 * @param {string} poster - poster url displayed when no video is loaded
 *
 * @param {boolean} playing - true --> play, false --> pause
 * @param {float} volume - set the players volume range 0.0 to 1.0
 * @param {boolean} autoPlay - set the autoplay attribute of the video element
 * @param {boolean} controls - enable/disable shaka player controls
 * @param {boolean} debug - load the debug Shaka library with more logs
 */

/**
 * @callback onSentryError - error that need to be forwarded to sentry in your project
 * @param {string} eventCode - event code that needs to be passed to sentry's captureMessage as first arg
 * @param {object} data - event data that needs to be passed to sentry's captureMessage as second arg
 */

// Add muxjs, needed for Shaka to play hls streams properly

import muxjs from 'mux.js'
import React, { useEffect, useRef } from 'react'
import { isIOS, isIPad13 } from 'react-device-detect'
import screenfull from 'screenfull'
import 'shaka-player/dist/controls.css'
import shakaSilent from 'shaka-player/dist/shaka-player.ui'
import shakaDebug from 'shaka-player/dist/shaka-player.ui.debug'
import { usePageVisibility } from './customHooks/usePageVisibility'
import { lockToLandscape, lockToPortrait } from './utils'
import './controls.css'
import './custom.css'

window.muxjs = muxjs

// const log = new Logger.Logger('ShakaPlayer --> ', Logger.LOG_LEVEL_DEBUG);
const log = {
  debug: console.log,
  error: console.error
}

let shaka
let player = null
let ui = null
let localPlayer = null
let timesVideoGotStuck = 0
let lastVideoTime = 0
let videoStallDetectorInterval = 0

const ShakaPlayer = ({
  onError,
  onStart,
  onPause,
  onReady,
  onBuffer,
  onSentryError,
  onBufferEnd,
  url,
  poster,
  playing,
  volume,
  autoPlay,
  controls,
  debug,
  videoType
}) => {
  const playerRef = useRef()
  const shakaContainerRef = useRef()
  const streamBufferingRetryTimeoutRef = useRef()
  const streamErrorRetryTimeoutRef = useRef()
  // const [buffering, setBuffering] = useState(false);

  const getPlayerStats = () => {
    const playerState = player?.getStats()
    const switchHistoryObject =
      playerState &&
      playerState.switchHistory &&
      playerState.switchHistory.reduce((acc, item, index) => {
        acc[`switch-${index}`] = JSON.stringify(item)
        return acc
      }, {})
    const stateHistoryObject =
      playerState &&
      playerState.stateHistory &&
      playerState.stateHistory.reduce((acc, item, index) => {
        acc[`state-${index}`] = JSON.stringify(item)
        return acc
      }, {})
    return (
      playerState && {
        ...playerState,
        stateHistory: undefined,
        switchHistory: undefined,
        ...(switchHistoryObject ? switchHistoryObject : {}),
        ...(stateHistoryObject ? stateHistoryObject : {})
      }
    )
  }

  const _onError = (evt) => {
    const code = evt?.detail?.code
    const offline = !window?.navigator?.onLine
    if (!streamErrorRetryTimeoutRef.current && !offline) {
      console.log('-------start timeout on error--------')
      streamErrorRetryTimeoutRef.current = setTimeout(() => {
        onSentryError('SHAKA_RETRY_' + code, { code, ...getPlayerStats() })
        console.log('-------UNLOAD and LOAD after ERROR--------')
        player.unload()
        loadUrl(url)
        streamErrorRetryTimeoutRef.current = undefined
      }, 30000)
    }

    try {
      onSentryError('ERROR_' + code, {
        ...(evt?.detail ? evt?.detail : evt),
        ...getPlayerStats()
      })
      log.debug('_onError --> ', evt)
      if (onError) {
        onError(evt)
      }
    } catch (error) {
      log.error('_onError -->', error)
    }
  }

  const _onUiError = (evt) => {
    try {
      log.debug('_onUiError --> ', evt)
      if (onError) {
        onError(evt)
      }
    } catch (error) {
      log.error('_onUiError -->', error)
    }
  }

  const _onStart = (evt) => {
    try {
      if (typeof onStart === 'function') {
        onStart()
      }
    } catch (error) {
      log.error('_onStart -->', error)
    }
  }

  const _onPause = (evt) => {
    try {
      if (typeof onPause === 'function') {
        onPause()
      }
    } catch (error) {
      log.error('_onStart -->', error)
    }
  }

  const _onLoaded = (evt) => {
    try {
      if (typeof onReady === 'function') {
        onReady(evt)
      }
    } catch (error) {
      log.error('_onStart -->', error)
    }
  }

  const _onBuffering = (evt) => {
    try {
      console.log('SHAKA BUFFER EVENT --> ', evt.buffering)
      if (typeof onBuffer === 'function' && evt.buffering) {
        onBuffer()
      } else if (typeof onBufferEnd === 'function' && !evt.buffering) {
        onBufferEnd()
      }
    } catch (error) {
      log.error('_onStart -->', error)
    }

    try {
      console.log('SHAKA BUFFER EVENT --> ', evt.buffering)
      if (typeof onBuffer === 'function' && evt.buffering) {
        onBuffer()
        if (!streamBufferingRetryTimeoutRef.current) {
          console.log('-------start timeout on buffering--------')
          streamBufferingRetryTimeoutRef.current = setTimeout(() => {
            onSentryError('SHAKA_RETRY_BUFFERING', getPlayerStats())
            console.log('-------UNLOAD and LOAD after buffering--------')
            player.unload()
            loadUrl(url)
            streamBufferingRetryTimeoutRef.current = undefined
          }, 30000)
        }
      } else if (typeof onBufferEnd === 'function' && !evt.buffering) {
        onBufferEnd()
        if (streamBufferingRetryTimeoutRef.current) {
          clearTimeout(streamBufferingRetryTimeoutRef.current)
          streamBufferingRetryTimeoutRef.current = undefined
        }
      }
    } catch (error) {
      log.error('_onStart -->', error)
    }
  }

  const loadUrl = async (url) => {
    try {
      if (url?.endsWith('.m3u8') || url?.endsWith('.mpd')) {
        await player.load(url)
        return true
      }
      return false
    } catch (error) {
      log.error('loadUrl --> ', error)

      const code = error?.code
      onSentryError('SHAKA_LOAD_ERROR_' + code, {
        ...getPlayerStats(),
        ...error
      })

      if (!streamErrorRetryTimeoutRef.current) {
        console.log('-------start timeout on load error--------')
        streamErrorRetryTimeoutRef.current = setTimeout(() => {
          onSentryError('SHAKA_LOAD_RETRY_' + code, {
            code,
            ...getPlayerStats()
          })
          console.log('-------UNLOAD and LOAD after LOAD ERROR--------')
          player.unload()
          loadUrl(url)
          streamErrorRetryTimeoutRef.current = undefined
        }, 30000)
      }
    }
  }

  const playPause = async (forcePause = false) => {
    try {
      if (playing && !forcePause) {
        await playerRef.current.play()
      } else {
        await playerRef.current.pause()
      }
    } catch (error) {
      log.error('on url change --> ', error)
    }
  }

  window.playPause = playPause

  /**
   * Handle  play and pause input
   */
  useEffect(async () => {
    try {
      await playPause()
    } catch (error) {
      log.error('on url change --> ', error)
    }
  }, [url, playing])

  /**
   * Handle volume changes
   */
  useEffect(async () => {
    try {
      playerRef.current.volume = volume
    } catch (error) {
      log.error('on url change --> ', error)
    }
  }, [volume])

  useEffect(() => {
    const init = async () => {
      shaka = debug === true ? shakaDebug : shakaSilent
      shaka.polyfill.installAll()

      if (shaka.Player.isBrowserSupported()) {
        localPlayer = new shaka.Player(playerRef.current)
        let uiConfig = {
          addSeekBar: videoType === 'ON_DEMAND',
          addBigPlayButton: true,
          pauseDisable: videoType !== 'ON_DEMAND',
          controlPanelElements: [
            'mute',
            'volume',
            'spacer',
            'fullscreen',
            'overflow_menu'
          ],
          overflowMenuButtons: ['quality'],
          volumeBarColors: {
            base: 'rgba(66, 133, 244, 0.5)',
            level: 'rgb(66, 133, 244)'
          }
        }

        if (controls === false) {
          uiConfig = {
            addSeekBar: videoType === 'ON_DEMAND',
            addBigPlayButton: false,
            controlPanelElements: [],
            overflowMenuButtons: [],
            doubleClickForFullscreen: false,
            enableKeyboardPlaybackControls: false,
            enableFullscreenOnRotation: false,
            forceLandscapeOnFullscreen: false
          }
        }

        ui = new shaka.ui.Overlay(
          localPlayer,
          shakaContainerRef.current,
          playerRef.current
        )

        ui.configure(uiConfig)
        controls = ui.getControls()
        player = controls.getPlayer()
        player.configure('streaming.jumpLargeGaps', true)
        if (process.env.REACT_APP_ENV !== 'PROD') {
          // TODO: this has not been tested yet
          window.ui = ui
          window.c = controls
          window.shakap = player
          window.shakac = player
        }

        // add player events
        player.addEventListener('error', _onError)
        player.addEventListener('loaded', _onLoaded)
        player.addEventListener('buffering', _onBuffering)

        controls.addEventListener('error', _onUiError)

        await loadUrl(url)

        // add custom spinner
        // eslint-disable-next-line prefer-const
        let spinnerContainer = document.getElementsByClassName(
          'shaka-spinner-container'
        )
        if (spinnerContainer.length > 0) {
          console.log(spinnerContainer)
          // ReactDOM.render(
          //   <Spinner className="w-64 h-64" />,
          //   spinnerContainer[0]
          // );
        }
      } else {
        // This browser does not have the minimum set of APIs we need.
        log.error('Browser not supported!')
      }
    }
    if (!isIOS && !isIPad13) {
      screenfull.on('change', () => {
        console.log('Am I fullscreen?', screenfull.isFullscreen ? 'Yes' : 'No')
        if (screenfull.isFullscreen) {
          // eslint-disable-next-line no-unused-expressions
          window?.ReactNativeWebView?.postMessage('TURN LANDSCAPE')
          lockToLandscape()
        } else {
          // eslint-disable-next-line no-unused-expressions
          window?.ReactNativeWebView?.postMessage('TURN PORTRAIT')
          lockToPortrait()
        }
      })
    } else {
      document.addEventListener('fullscreenchange', (event) => {
        // document.fullscreenElement will point to the element that
        // is in fullscreen mode if there is one. If there isn't one,
        // the value of the property is null.
        if (document.fullscreenElement) {
          // eslint-disable-next-line no-unused-expressions
          window?.ReactNativeWebView?.postMessage('TURN LANDSCAPE')
          lockToLandscape()
        } else {
          // eslint-disable-next-line no-unused-expressions
          window?.ReactNativeWebView?.postMessage('TURN PORTRAIT')
          lockToPortrait()
        }
      })
    }

    init()

    return () => {
      player.removeEventListener('error', _onError)
      player.removeEventListener('loaded', _onLoaded)
      player.removeEventListener('buffering', _onBuffering)

      controls.removeEventListener('error', _onUiError)

      if (streamBufferingRetryTimeoutRef.current) {
        console.log('=======_onStart BUFFERING=========')

        clearTimeout(streamBufferingRetryTimeoutRef.current)
        streamBufferingRetryTimeoutRef.current = undefined
      }
      if (streamErrorRetryTimeoutRef.current) {
        console.log('=======_onStart ERROR=========')

        clearTimeout(streamErrorRetryTimeoutRef.current)
        streamErrorRetryTimeoutRef.current = undefined
      }
    }
  }, [])

  useEffect(() => {
    const scanStall = () => {
      try {
        const targetVideo = document.querySelector('video')
        if (targetVideo === null) {
          return
        }
        const time = targetVideo.currentTime ?? 0
        // console.group('STATS');
        // console.log('PLAYER TIME - ', time);
        // console.log('IS PLAYING - ', !document.querySelector('video')?.paused);
        // console.log('LAST PLAYER TIME - ', lastVideoTime);
        // console.log('TIMES PLAYER STUCK  - ', timesVideoGotStuck);
        // console.groupEnd();
        if (targetVideo.paused === true) {
          return
        }
        if (time) {
          if (time === lastVideoTime) {
            timesVideoGotStuck++
          } else {
            timesVideoGotStuck = 0
          }
          lastVideoTime = time
        }
        if (timesVideoGotStuck >= 15) {
          timesVideoGotStuck = 0
          lastVideoTime = 0
          if (targetVideo) {
            targetVideo.currentTime = 0
          }
        }
      } catch (error) {
        console.log('error in scanStall-->', error)
      }
    }

    timesVideoGotStuck = 0
    lastVideoTime = 0
    clearInterval(videoStallDetectorInterval)
    videoStallDetectorInterval = setInterval(scanStall, 1000)
    return () => {
      clearInterval(videoStallDetectorInterval)
    }
  }, [])

  // const getVideoContainerDims = () => {
  //   if (screenfull.isFullscreen) {
  //     return { height: '100vh' };
  //   } else {
  //     return isMobile
  //       ? { height: 'calc(0.562*100vw)' }
  //       : { height: 405, width: 500 };
  //   }
  // };

  usePageVisibility(async (val) => {
    if (!val) {
      await playPause(true)
    }
  })

  return (
    <div
      ref={shakaContainerRef}
      className={`shaka-video-container  ${
        controls === false ? 'pointer-events-none' : ''
      }`}
    >
      <video
        id='shaka-video'
        poster={poster}
        className=' w-full h-auto '
        ref={playerRef}
        autoPlay={autoPlay}
        onPlay={_onStart}
        onPause={_onPause}
      />
    </div>
  )
}

export default ShakaPlayer

# Instructions

## install deps

        yarn add screenfull mux.js react-device-detect https://bitbucket.org/thomas_kinder/shaka-player.git#isha-3.1.1-0

## use

        ```js
            <ShakaPlayer
              onError={noop}
              onStart={noop}
              onPause={noop}
              onReady={noop}
              videoType={'ON_DEMAND'}
              url={
                isIOS
                  ? 'https://d1ayd7kef6qa39.cloudfront.net/vod/Day_6_Mudras_master.m3u8'
                  : 'https://d1ayd7kef6qa39.cloudfront.net/vod/Day_6_Mudras.mpd'
              }
              poster={PROGRAM_ASSET_MAP[4].image}
              autoPlay={false}
              controls={true}
              debug={true}
            />

        ```

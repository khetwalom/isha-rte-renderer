/* eslint-disable react/react-in-jsx-scope */
import React from 'react'

import imageOutputStyle from './style'
interface StyleProps {
  figure: any
  img: any
}

interface ImageElement {
  url: string
  withBorder: boolean
  withBackground: boolean
  stretched: boolean
}

interface ImageOutputProps {
  data: ImageElement
  style: StyleProps
  classNames: StyleProps | string
  config: {
    disableDefaultStyle?: boolean
  }
}

const ImageOutput = ({ data, style, classNames, config }: ImageOutputProps) => {
  if (!data || !data || !data.url) return ''
  if (!config || typeof config !== 'object') config = {}
  if (!classNames || typeof classNames !== 'object') classNames = ''

  const imageStyle: {
    width: string
    maxWidth: string
    margin: string
  } = config.disableDefaultStyle
    ? style.img
    : { ...imageOutputStyle.imageStyle, ...style.img }

  imageStyle.width = data.stretched ? '100%' : ''
  imageStyle.maxWidth = data.withBackground ? '60%' : ''
  imageStyle.margin = data.withBackground ? '0 auto 15px' : ''

  if (data.stretched && data.withBackground) {
    imageStyle.maxWidth = '100%'
  }
  const figureStyle = config.disableDefaultStyle
    ? style.figure
    : { ...imageOutputStyle.figureStyle, ...style.figure }

  if (!data.withBorder) figureStyle.border = 'none'
  if (!data.withBackground) figureStyle.backgroundColor = 'none'

  return (
    <figure style={figureStyle} className={(classNames as any)?.figure}>
      <img
        src={data.url}
        alt=''
        style={imageStyle}
        className={(classNames as any).img}
      />
    </figure>
  )
}

export default ImageOutput

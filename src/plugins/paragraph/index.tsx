// #region imports
import React from 'react';
import parse from 'html-react-parser';

import paragraphOutputStyle from './style';

// #endregion

interface ParagraphElement {
  alignment: string;
  text: string;
}

interface ParagraphOutputProps {
  data: ParagraphElement;
  classNames: string;
  style: any;
  config: {
    disableDefaultStyle?: boolean;
  };
}

const ParagraphOutput = ({
  data,
  style,
  classNames,
  config,
}: ParagraphOutputProps) => {
  if (!data) return '';

  if (!config || typeof config !== 'object') config = {};
  if (!classNames || typeof classNames !== 'string') classNames = '';

  const paragraphStyle = config.disableDefaultStyle
    ? style
    : { ...paragraphOutputStyle, ...style, textAlign: data.alignment };
  let content = null;

  if (typeof data === 'string') content = data;
  else if (
    typeof data === 'object' &&
    data.text &&
    typeof data.text === 'string'
  )
    content = data.text;

  return content ? (
    <p style={paragraphStyle} className={classNames}>
      {parse(content)}
    </p>
  ) : (
    ''
  );
};

export default ParagraphOutput;

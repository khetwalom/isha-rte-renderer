/* eslint-disable react/react-in-jsx-scope */
// @ts-nocheck

import Output from 'editorjs-react-renderer';
import React, { useEffect, useState } from 'react';
import './index.css';
import ImageOutput from './plugins/image';
import IshaShakaPlayer from './plugins/isha-shaka-player-renderer';
import ParagraphOutput from './plugins/paragraph';

const defaultRenderers = {
  image: ImageOutput,
  paragraph: ParagraphOutput,
  video: IshaShakaPlayer,
};
const IshaRteRenderer = ({ editorData, customRenderers = {} }) => {
  const [error, setError] = useState<string | null>(null);
  const [finalData, setFinalData] = useState<any>(null);

  useEffect(() => {
    const init = () => {
      try {
        // const parsedData = JSON.parse(Buffer.from(editorData, 'base64'));
        const parsedData = editorData;
        if (parsedData?.blocks === undefined) {
          setError('check data supplied');
          return;
        }
        if (parsedData.blocks.length === 0) {
          setError('no blocks found');
          return;
        }
        setFinalData(parsedData);
      } catch (error) {
        setError('Please check data');
        console.log('error in init-->', error);
      }
    };
    init();
  }, []);

  if (error !== null) {
    return (
      <div
        style={{
          height: 250,
          width: 'auto',
          backgroundColor: '#efefef',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        {error}
      </div>
    );
  }

  if (finalData === null) {
    return null;
  }
  return (
    <Output
      data={finalData}
      renderers={{ ...defaultRenderers, ...customRenderers }}
    />
  );
};

export default IshaRteRenderer;

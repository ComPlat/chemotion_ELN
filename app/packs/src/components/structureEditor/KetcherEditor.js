/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function KetcherEditor(props) {
  const { editor, iH, iS, molfile } = props;
  const iframeRef = useRef(null);

  const initMol =
    molfile ||
    '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  const loadContent = (event) => {
    if (event.data.eventType === 'init') {
      editor.structureDef.editor.setMolecule(initMol);
    }
  };

  const injectGlobalValues = (iframe) => {
    // TODO:H set production url
    const root =
      process.env.NODE_ENV.PUBLIC_URL == 'development'
        ? `window.url = 'http://localhost:3000/';`
        : `window.url = 'http://localhost:3000/';`;
    const globalValuesScript = root;
    const scriptElement = document.createElement('script');
    scriptElement.text = globalValuesScript;
    iframe.contentWindow.document.head.appendChild(scriptElement);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    // if (iframe) {
    //   injectGlobalValues(iframe);
    // }
    window.addEventListener('message', loadContent);
    return () => {
      window.removeEventListener('message', loadContent);
    };
  }, []);

  return (
    <div>
      <iframe
        ref={iframeRef}
        id={editor.id}
        src={editor.extSrc}
        title={editor.label}
        height={iH}
        width="100%"
        style={iS}
      />
    </div>
  );
}

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;

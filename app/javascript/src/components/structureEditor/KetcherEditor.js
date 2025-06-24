/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function KetcherEditor(props) {
  const iframeRef = useRef();
  const {
    editor, iH, iS, molfile
  } = props;

  const initMol = molfile
    || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  const loadContent = (event) => {
    if (event.data.eventType === 'init') {
      editor.structureDef.editor.setMolecule(initMol);
    }
  };

  useEffect(() => {
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

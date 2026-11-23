import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// The standalone editor posts { eventType: 'init' } to its parent once it is ready.
// Only then can the molfile be pushed in, via StructureDef's molfile setter (setMolecule).
const SurfaceChemistryEditor = ({
  editor, molfile, iH, iS, fnCb
}) => {
  const iframeRef = useRef(null);
  const latest = useRef({ editor, molfile, fnCb });

  useEffect(() => {
    latest.current = { editor, molfile, fnCb };
  }, [editor, molfile, fnCb]);

  useEffect(() => {
    const onMessage = (event) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      if (event.data?.eventType !== 'init') return;

      const { editor: ed, molfile: mf, fnCb: cb } = latest.current;
      ed.structureDef.molfile = mf;
      if (cb) cb(ed);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      id={editor.id}
      src={editor.extSrc}
      title="Surface Chemistry editor"
      height={iH}
      width="100%"
      style={iS}
    />
  );
};

SurfaceChemistryEditor.propTypes = {
  editor: PropTypes.shape({
    id: PropTypes.string,
    extSrc: PropTypes.string,
    structureDef: PropTypes.object,
  }).isRequired,
  molfile: PropTypes.string,
  iH: PropTypes.string,
  iS: PropTypes.object,
  fnCb: PropTypes.func,
};

SurfaceChemistryEditor.defaultProps = {
  molfile: '',
  iH: '630px',
  iS: {},
  fnCb: () => {},
};

export default SurfaceChemistryEditor;

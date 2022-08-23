/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';

const KetcherEditor = (props) => {
  const {
    editor, fh, fs, molfile
  } = props;
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';
  if (editor && editor.structureDef && editor.structureDef.editor) {
    editor.structureDef.editor.setMolecule(initMol);
  }
  return (
    <div>
      <iframe id={editor.id} src={editor.extSrc} title={editor.label} height={fh} width="100%" style={fs} />
    </div>
  );
};

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  fh: PropTypes.string.isRequired,
  fs: PropTypes.object.isRequired
};

export default KetcherEditor;

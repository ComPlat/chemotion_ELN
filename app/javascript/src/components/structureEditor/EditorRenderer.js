// components/structureEditor/EditorRenderer.js
import React from 'react';
import ChemDrawEditor from 'src/components/structureEditor/ChemDrawEditor';
import MarvinjsEditor from 'src/components/structureEditor/MarvinjsEditor';
import KetcherEditor from 'src/components/structureEditor/KetcherEditor';
import PropTypes from 'prop-types';

function EditorRenderer({
  type, editor, molfile, iframeHeight, iframeStyle, fnCb
}) {
  switch (type) {
    case 'chemdraw':
      return (
        <ChemDrawEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          fnCb={fnCb}
        />
      );
    case 'marvinjs':
      return (
        <MarvinjsEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          fnCb={fnCb}
        />
      );
    default:
      return (
        <KetcherEditor
          editor={editor}
          molfile={molfile}
          iH={iframeHeight}
          iS={iframeStyle}
        />
      );
  }
}

export default EditorRenderer;

EditorRenderer.propTypes = {
  type: PropTypes.string.isRequired,
  editor: PropTypes.object.isRequired,
  molfile: PropTypes.string.isRequired,
  iframeHeight: PropTypes.string.isRequired,
  iframeStyle: PropTypes.object.isRequired,
  fnCb: PropTypes.func.isRequired,
};
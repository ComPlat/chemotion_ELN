// components/structureEditor/EditorRenderer.js
import React from 'react';
import ChemDrawEditor from 'src/components/structureEditor/ChemDrawEditor';
import MarvinjsEditor from 'src/components/structureEditor/MarvinjsEditor';
import KetcherEditor from 'src/components/structureEditor/KetcherEditor';
import PropTypes from 'prop-types';

function EditorRenderer({
  type, editor, molfile, iframeHeight, iframeStyle, fnCb, forwardedRef
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
          ref={forwardedRef} // Forwarding the ref to the KetcherEditor
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
  editor: PropTypes.object,
  molfile: PropTypes.string,
  iframeHeight: PropTypes.string,
  iframeStyle: PropTypes.object,
  fnCb: PropTypes.func,
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({current: PropTypes.any})
  ]),
};

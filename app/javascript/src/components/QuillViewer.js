import React from 'react';
import PropTypes from 'prop-types';
import Quill from 'quill';
import _ from 'lodash';

import { keepSupSub, stripImages } from 'src/utilities/quillFormat';
// Side-effect import — registers AttachmentImageBlot + AttachmentFileBlot
// globally on the Quill singleton so both the editor and viewer can render
// inline attachment references.
import 'src/components/reactQuill/AttachmentImageBlot';
import 'src/components/reactQuill/AttachmentFileBlot';

export default class QuillViewer extends React.Component {
  constructor(props) {
    super(props);

    this.viewer = false;
  }

  componentDidMount() {
    this.initQuill();
  }

  componentDidUpdate(prevProps) {
    const { value } = this.props;
    if (value && prevProps.value && value !== prevProps.value) {
      this.viewer.setContents(stripImages(value));
    }
  }

  initQuill() {
    if (!this.viewer) {
      const { quillViewer } = this;
      const defaultOptions = {
        formats: ['bold', 'italic', 'underline', 'header', 'script', 'list', 'indent', 'attachment-image', 'attachment-file', 'resize-inline', 'resize-block'],
        theme: this.theme,
        readOnly: this.readOnly,
      };

      this.viewer = new Quill(quillViewer, defaultOptions);
      const oriValue = this.props.value;
      const value = this.props.preview ? keepSupSub(oriValue) : oriValue;
      this.viewer.setContents(stripImages(value));
    }
  }

  render() {
    this.theme = 'bubble';
    this.readOnly = true;

    return (
      this.props.preview
        ? <div className="quill-viewer"><div ref={(m) => { this.quillViewer = m; }} /></div>
        : <span ref={(n) => { this.quillViewer = n; }} />
    );
  }
}

QuillViewer.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ]),
  preview: PropTypes.bool
};

QuillViewer.defaultProps = {
  value: [],
  preview: false
};

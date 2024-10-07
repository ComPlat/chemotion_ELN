import React from 'react';
import PropTypes from 'prop-types';
import Quill from 'quill';
import _ from 'lodash';

import { keepSupSub } from 'src/utilities/quillFormat';

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
      this.viewer.setContents(value);
    }
  }

  initQuill() {
    if (!this.viewer) {
      const { quillViewer } = this;
      const defaultOptions = {
        theme: this.theme,
        readOnly: this.readOnly,
      };

      this.viewer = new Quill(quillViewer, defaultOptions);
      const oriValue = this.props.value;
      const value = this.props.preview ? keepSupSub(oriValue) : oriValue;
      this.viewer.setContents(value);
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

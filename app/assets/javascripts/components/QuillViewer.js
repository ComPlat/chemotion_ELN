import React from 'react';
import PropTypes from 'prop-types';
import Quill from 'quill';
import _ from 'lodash';

import { keepSupSub } from './utils/quillFormat';

export default class QuillViewer extends React.Component {
  constructor (props) {
    super(props);

    this.viewer = false;
  }

  componentDidMount() {
    this.initQuill();
  }

  componentWillReceiveProps(nextProps) {
    const oldVal = this.props.value;
    const newVal = nextProps.value;
    if (oldVal && newVal && !_.isEqual(newVal, oldVal)) {
      this.viewer.setContents(newVal);
    }
  }

  initQuill() {
    if (!this.viewer) {
      const quillViewer = this.quillViewer;
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
        ? <div className="quill-viewer">
            <div ref={(m) => { this.quillViewer = m; }}></div>
          </div>
        : <span ref={(n) => { this.quillViewer = n; }} />
    );
  }
}

QuillViewer.propTypes = {
  value: PropTypes.object,
}

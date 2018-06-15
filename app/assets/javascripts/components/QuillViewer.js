import React from 'react'
import ReactDOM from 'react-dom'
import Quill from 'quill'
import _ from 'lodash';

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
      const value = this.props.preview ? this.keepSupSub(oriValue) : oriValue;
      this.viewer.setContents(value);
    }
  }

  keepSupSub(value) {
    let content = []
    value.ops.forEach(op => {
      if(typeof op.insert === 'string' && op.insert !== '\n') {
        if (op.attributes
              && op.attributes.script
              && (op.attributes.script === 'super'
                  || op.attributes.script === 'sub')) {
          content.push({insert: op.insert,
                        attributes: { script: op.attributes.script }});
        } else {
          content.push({insert: op.insert});
        }
      }
    })
    content.filter(op => op).push({insert: '\n'});
    if(content.length === 1) {
      content.unshift({insert: '-'})
    }
    return content;
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
  value: React.PropTypes.object,
}

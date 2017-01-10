import React from 'react'
import ReactDOM from 'react-dom'
import Quill from 'quill'

export default class QuillViewer extends React.Component {
  constructor (props) {
    super(props);

    this.viewer = false;
  }

  componentDidMount() {
    this.initQuill();
  }

  initQuill() {
    if (!this.viewer) {
      const quillViewer = ReactDOM.findDOMNode(this.refs.quillViewer);
      const defaultOptions = {
        theme: this.theme,
        readOnly: this.readOnly,
      };

      this.viewer = new Quill(quillViewer, defaultOptions);
      this.viewer.setContents(this.props.value);
    }
  }

  render() {
    this.theme = 'bubble';
    this.readOnly = true;

    return (
      <div className="quill-viewer">
        <div ref="quillViewer"></div>
      </div>
    );
  }
}

QuillViewer.propTypes = {
  value: React.PropTypes.object,
}

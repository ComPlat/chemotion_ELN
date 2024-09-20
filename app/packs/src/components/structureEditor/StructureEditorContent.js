import React from 'react';
import scriptLoader from 'react-async-script-loader';


class StructureEditorContent extends React.Component {
  constructor(props) {
    super(props);
    const { completionCallback, errorCallback } = this.props;
    this.state = {
      completionCallback, errorCallback
    }
    this.attachEditor = this.attachEditor.bind(this)
  }

  UNSAFE_componentWillReceiveProps({ isScriptLoaded, isScriptLoadSucceed }) {
    if (isScriptLoaded && !this.props.isScriptLoaded) { // load finished
      if (isScriptLoadSucceed) {
        setTimeout(this.attachEditor, 3000);
      }
    }
  }

  componentDidMount() {
    const { isScriptLoaded, isScriptLoadSucceed } = this.props
    if (isScriptLoaded && isScriptLoadSucceed) {
      this.attachEditor();
      this.attachEditor();
    }
  }

  attachEditor() {
    const { completionCallback, errorCallback } = this.props;

    perkinelmer.ChemdrawWebManager.attach({
      id: 'chemdrawjs-container',
      config: window.userConfiguration,
      element: this.chemdrawcont,
      callback: () => alert('done'),
      errorCallback: () => alert('de'),
      licenseUrl: 'license.xml',
      // loadConfigFromUrl: 'cdjs/chemdrawweb/configuration.json',
      // preservePageInfo: false,
      // viewonly: true,
    });
  }


  render() {
    return (
      <div
        ref={(input) => { this.chemdrawcont = input }}
        className="position-absolute top-0 start-0 w-100 vh-70"
      />
    );
  }
}
export default scriptLoader(
  [
    "cdjs/chemdrawweb/chemdrawweb.js",
  ]
)(StructureEditorContent)


// export default StructureEditorContent;

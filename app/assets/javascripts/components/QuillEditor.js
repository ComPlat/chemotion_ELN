import React from 'react'
import ReactDOM from 'react-dom'

import Quill from 'quill'
import Delta from 'quill-delta'

export default class QuillEditor extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      value: null,    // Editor contents
      timeoutReference: null
    }

    let theme = (props.theme === undefined || props.theme == "") ? "snow" : props.theme
    let readOnly = (props.disabled === undefined || props.disabled == false) ? false : true
    this.defaultOptions = {
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'], //, 'strike'
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'color': [] }, { 'background': [] }],
          // [{ 'font': [] }],
          // ['blockquote', 'code-block'],
          // [{ 'header': 1 }, { 'header': 2 }],
          // [{ 'indent': '-1'}, { 'indent': '+1' }],
          // [{ 'direction': 'rtl' }],
          // [{ 'size': ['small', false, 'large', 'huge'] }],
          // [{ 'align': [] }],
          // ['clean']
        ]
      },
      theme: theme,
      readOnly: readOnly
    }
    this.editor = false
    this.timeout = 3e2 // 600ms

    this.getContents = this.getContents.bind(this)
    this.clearTypingTimeout = this.clearTypingTimeout.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let {value} = this.state

    if (this.editor && nextProps.value &&
        nextProps.value !== this.getContents() ) {
      this.setState({value: nextProps.value})
      let sel = this.editor.getSelection()
      this.editor.setContents(nextProps.value)
      if (sel) this.editor.setSelection(sel)
    }

    this.clearTypingTimeout()
  }

  clearTypingTimeout() {
    let {timeoutReference} = this.state
    if (timeoutReference) {
      clearTimeout(timeoutReference)
    }
  }

  componentDidMount() {
    if (!this.editor) {
      let quillEditor = ReactDOM.findDOMNode(this.refs.quillEditor)

      // init Quill
      this.editor = new Quill(quillEditor, this.defaultOptions)

      // this.editor.enable(!this.props.disabled);

      // Resolve compability with Grammarly Chrome add-on
      // Fromm https://github.com/quilljs/quill/issues/574
      // let GrammarlyInline = Quill.import('blots/inline');
      // GrammarlyInline.tagName = 'G';
      // GrammarlyInline.blotName = 'grammarly-inline';
      // GrammarlyInline.className = 'gr_';
      // Quill.register({'formats/grammarly-inline': GrammarlyInline})

      // onChange
      this.editor.on('text-change', (delta, oldDelta, source) => {
        if (source == 'user' && this.props.onChange) {
          this.clearTypingTimeout()

          let contents = this.editor.getContents()
          let onChangeFunc = this.props.onChange

          if (this.state.value !== contents) {
            this.setState({
              value: contents,
              timeoutReference: setTimeout(function(){
                onChangeFunc(contents)
              }, this.timeout)
            })
          }
        }
      })
    }
  }

  componentWillUnmount() {
    // Don't set the state to null, it would generate a loop.
  }

  componentWillUpdate() {
    this.componentWillUnmount()
  }

  componentDidUpdate() {
    this.componentDidMount()
  }

  getContents() {
    if (this.editor) return this.editor.getContents()

    return null;
  }

  render () {
    let height =
        (this.props.height === undefined || this.props.height == "")
        ? "230px"
        : this.props.height

    return (
      <div>
        <div ref="quillEditor" style={{height: height}}></div>
      </div>
    )
  }
}

// QuillEditor.propTypes = {
//   options: React.PropTypes.object,
//   events: React.PropTypes.object,
//   onChange: React.PropTypes.func
// }

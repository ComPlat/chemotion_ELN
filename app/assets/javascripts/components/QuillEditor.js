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

    this.defaultOptions = {
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'], //, 'strike'
          // ['blockquote', 'code-block'],
          // [{ 'header': 1 }, { 'header': 2 }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          // [{ 'direction': 'rtl' }],
          // [{ 'size': ['small', false, 'large', 'huge'] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'font': [] }],
          [{ 'align': [] }],
          // ['clean']
        ]
      },
      theme: 'snow'
    }
    this.editor = false
    this.timeout = 3e2 // 600ms

    this.getContents = this.getContents.bind(this)
    this.clearTypingTimeout = this.clearTypingTimeout.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let {value} = this.state

    if (this.editor && 'value' in nextProps && nextProps.value !== value) {
      this.setState({value: nextProps.value})
      this.editor.setContents(nextProps.value)
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

      // onChange
      this.editor.on('text-change', (delta, oldDelta, source) => {
        if (source == 'user' && this.props.onChange) {
          this.clearTypingTimeout()

          let contents = this.editor.getContents()
          let onChangeFunc = this.props.onChange

          this.setState({
            value: contents,
            timeoutReference: setTimeout(function(){
              onChangeFunc(contents)
            }, this.timeout)
          })
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
    return (
      <div>
        <div ref="quillEditor" style={{height: "230px"}}></div>
      </div>
    )
  }
}

// QuillEditor.propTypes = {
//   options: React.PropTypes.object,
//   events: React.PropTypes.object,
//   onChange: React.PropTypes.func
// }

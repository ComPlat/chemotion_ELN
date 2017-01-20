import React from 'react'
import ReactDOM from 'react-dom'

import Quill from 'quill'
import Delta from 'quill-delta'

import _ from 'lodash'

const toolbarOptions = [
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
  // ['clean'],
]

export default class QuillEditor extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      value: props.value,    // Editor contents
      timeoutReference: null
    }

    this.theme = props.theme
    if (!props.theme || props.theme == "") this.theme = "snow"

    this.readOnly = true
    if (!props.disabled || props.disabled == false) this.readOnly = false

    this.height = props.height
    if (!props.height || props.height == "") this.height = "230px"

    this.toolbar = (props.toolbarSymbol || []).map(x => x.name)

    this.editor = false
    this.timeout = 3e2
    this.id = _.uniqueId("quill-editor-")

    this.getContents = this.getContents.bind(this)
    this.clearTypingTimeout = this.clearTypingTimeout.bind(this)
    this.updateEditorValue = this.updateEditorValue.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let {value} = this.state
    let nextVal = nextProps.value

    if (this.editor && nextVal && nextVal !== this.getContents() ) {
      this.setState({value: nextProps.value})
      let sel = this.editor.getSelection()
      this.editor.setContents(nextProps.value)
      if (sel) this.editor.setSelection(sel)
    }

    this.clearTypingTimeout()
  }

  componentWillMount() {
  }

  componentDidMount() {
    this.initQuill()
  }

  componentWillUnmount() {
    // Don't set the state to null, it would generate a loop.
    this.clearTypingTimeout()
  }

  componentWillUpdate() {
    this.componentWillUnmount()
  }

  componentDidUpdate() {
    this.componentDidMount()
  }

  updateEditorValue(contents) {
    let onChange = this.props.onChange

    this.setState({
      value: contents,
      timeoutReference: setTimeout(onChange.bind(this, contents), this.timeout)
    })
  }

  clearTypingTimeout() {
    let {timeoutReference} = this.state
    if (timeoutReference) clearTimeout(timeoutReference)
  }

  initQuill() {
    if (!this.editor) {
      let quillEditor = ReactDOM.findDOMNode(this.refs[this.id])

      let quillOptions = {
        modules: {
          toolbar: "#toolbar-" + this.id
        },
        theme: this.theme,
        readOnly: this.readOnly
      }

      // init Quill
      this.editor = new Quill(quillEditor, quillOptions)
      let {value} = this.state
      if (value) this.editor.setContents(value)

      // Resolve compability with Grammarly Chrome add-on
      // Fromm https://github.com/quilljs/quill/issues/574
      // let GrammarlyInline = Quill.import('blots/inline');
      // GrammarlyInline.tagName = 'G';
      // GrammarlyInline.blotName = 'grammarly-inline';
      // GrammarlyInline.className = 'gr_';
      // Quill.register({'formats/grammarly-inline': GrammarlyInline})

      this.editor.on('text-change', (delta, oldDelta, source) => {
        if (source == 'user' && this.props.onChange) {
          this.clearTypingTimeout()

          let contents = this.getContents()
          this.updateEditorValue(contents)
        }
      })

      let updateEditorValue = this.updateEditorValue
      let editor = this.editor
      let id = this.id
      let toolbarSymbol = this.props.toolbarSymbol

      this.toolbar.forEach(function(element) {
        let selector = '#toolbar-' + id + ' #' + element + "_id"
        let btn = document.querySelector(selector)
        let elementIcon = "icon-" + element

        btn.addEventListener('click', function() {
          let range = editor.getSelection()

          if (range) {
            let contents = editor.getContents()
            let elementOps = toolbarSymbol.find(x => x.name === element).ops
            let insertDelta = new Delta(elementOps)
            elementOps = [{retain: range.index}].concat(elementOps)
            let elementDelta = new Delta(elementOps)
            contents = contents.compose(elementDelta)

            editor.setContents(contents)

            range.length = 0
            range.index = range.index + insertDelta.length()
            editor.setSelection(range)

            updateEditorValue(contents)
          }
        })
      })
    }
  }

  getContents() {
    if (this.editor) return this.editor.getContents()

    return null;
  }

  renderQuillToolbarGroup() {
    if (this.theme != "snow") return (<span />)

    let quillToolbar = toolbarOptions.map(function(formatGroup, index) {
      let groupElement = formatGroup.map(function(element) {
        if (typeof(element) == "string") {
          return (<button className={"ql-" + element} key={"btnKey_" + element}/>)
        } else if (typeof(element) == "object") {
          let elementName = Object.getOwnPropertyNames(element)[0]
          let elementValue = element[elementName]

          if (typeof elementValue == "string") {
            return (
              <button className={"ql-" + elementName}
                      value={elementValue} key={"btnKey_" + elementValue}>
              </button>
            )
          } else if (Array.isArray(elementValue)) {
            let options = elementValue.map(e => <option value={e} key={"opt_" + e}/>)
            return (
              <select className={"ql-" + elementName} key={"btnKey_" + elementName}>
                {options}
              </select>
            )
          }
        }
      })

      return (
        <span className="ql-formats" key={"sp_" + index}>
          {groupElement}
        </span>
      )
    })

    return quillToolbar
  }

  renderCustomToolbar() {
    if (this.theme != "snow" || !this.toolbar || this.toolbar.length == 0) {
      return (<span />)
    }

    let customToolbarElement = this.toolbar.map(function(element) {
      return (
        <button className={"icon-" + element} key={element + "_key"}
                id={element + "_id"}
                style={{margin: "0px 3px 3px 3px"}}/>
      )
    })

    return (
      <span className="ql-formats"
            style={{fontSize: "25px", display: "block", height: "35px"}}>
        {customToolbarElement}
      </span>
    )
  }

  render() {
    let quillToolbar = this.renderQuillToolbarGroup()

    return (
      <div>
        <div id={"toolbar-" + this.id}>
          {quillToolbar}
          {this.renderCustomToolbar()}
        </div>
        <div ref={this.id} style={{height: this.height}}></div>
      </div>
    )
  }
}

// QuillEditor.propTypes = {
//   options: React.PropTypes.object,
//   events: React.PropTypes.object,
//   onChange: React.PropTypes.func
// }

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
      value: null,    // Editor contents
      timeoutReference: null,
      toolbarId: 0
    }

    this.editor = false
    this.timeout = 3e2 // 300ms

    this.getContents = this.getContents.bind(this)
    this.clearTypingTimeout = this.clearTypingTimeout.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let {value} = this.state

    if (this.editor) {
      if (nextProps.value && nextProps.value !== this.getContents() ) {
        this.setState({value: nextProps.value})
        let sel = this.editor.getSelection()
        this.editor.setContents(nextProps.value)
        if (sel) this.editor.setSelection(sel)
      }
    }

    this.clearTypingTimeout()
  }

  componentWillMount() {
    const id = _.uniqueId("prefix-");
    this.setState({toolbarId: id});
  }

  componentDidMount() {
    this.initQuill()
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

  updateEditorValue(contents) {
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

  clearTypingTimeout() {
    let {timeoutReference} = this.state
    if (timeoutReference) {
      clearTimeout(timeoutReference)
    }
  }

  initQuill() {
    let {toolbarSymbol} = this.props
    let {toolbarId} = this.state

    toolbarSymbol = toolbarSymbol || []
    let symbolNameArray = toolbarSymbol.map(x => x.name)
    this.toolbar = symbolNameArray

    if (!this.editor) {
      let quillEditor = ReactDOM.findDOMNode(this.refs.quillEditor)

      let defaultOptions = {
        modules: {
          toolbar: '#' + toolbarId
        },
        theme: this.theme,
        readOnly: this.readOnly
      }

      // init Quill
      this.editor = new Quill(quillEditor, defaultOptions)

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
          this.updateEditorValue(contents)
        }
      })
    }

    if (this.editor) {
      let editor = this.editor
      let self = this

      symbolNameArray.forEach(function(element) {
        let customButtons = document.querySelectorAll('.ql-' + element)
        let elementIcon = "icon-" + element

        customButtons.forEach(function(btn) {
          if (btn.className.includes(elementIcon)) return

          btn.className = btn.className + " icon-" + element

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

              self.updateEditorValue(contents)
            }
          })
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

    let customToolbarElement = this.toolbar.map(function (element) {
      return (
        <button className={"ql-" + element} key={element + "_key"}
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
    let {toolbarId} = this.state

    this.theme = !this.props.theme || this.props.theme == ""
                 ? "snow"
                 : this.props.theme
    this.readOnly = !this.props.disabled || this.props.disabled == false
                    ? false
                    : true

    let height = !this.props.height || this.props.height == ""
                 ? "230px"
                 : this.props.height

    let quillToolbar = this.renderQuillToolbarGroup()

    return (
      <div>
        <div id={toolbarId}>
          {quillToolbar}
          {this.renderCustomToolbar()}
        </div>
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

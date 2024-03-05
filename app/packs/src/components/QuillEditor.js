import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import Quill from 'quill';
import Delta from 'quill-delta';

import _ from 'lodash';
import { ButtonToolbar, DropdownButton, MenuItem, OverlayTrigger, Popover, Button } from 'react-bootstrap';

const toolbarOptions = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ specialCharacters: ['→', '⇌', '⇐', '⇒', '⇑', ' ⇓', '⇠', '⇢', '⇡', '⇣', '⇤', '⇥', '⤒', '⤓', '↨', '∆', 'α', 'β', 'δ', 'Κ', '°C', '°F', '☉', '⬤', 'Ⓤ', '🜚', 'Ω', 'Ā', 'ā', 'Ă', 'ă', '<', '>', '≤', '≥', '–', '—', '¯', '‾', '°', '−', '±', '÷', '⁄', '×', '≈', '≠', '≡', '≅', '∫', '∑', 'φ', '∞', '√', '∼', '∃', '∀', '∗', '∝', '∠'] }],
  // [{ 'color': [] }, { 'background': [] }],
  // [{ 'font': [] }],
  // ['α', 'β', 'π'],
  // ['blockquote', 'code-block'],
  // [{ 'header': 1 }, { 'header': 2 }],
  // [{ 'indent': '-1'}, { 'indent': '+1' }],
  // [{ 'direction': 'rtl' }],
  // [{ 'size': ['small', false, 'large', 'huge'] }],
  // [{ 'align': [] }],
  // ['clean'],
];

export default class QuillEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Editor contents
      value: props.value,
    };

    this.theme = props.theme;
    if (!props.theme || props.theme === '') this.theme = 'snow';

    this.readOnly = true;
    if (!props.disabled || props.disabled === false) this.readOnly = false;

    this.height = props.height;
    if (!props.height || props.height === '') this.height = '230px';

    this.toolbar = (props.toolbarSymbol || []).map(x => ({
      name: x.name,
      render: x.render,
    }));

    this.editor = false;
    this.id = _.uniqueId('quill-editor-');

    this.getContents = this.getContents.bind(this);
    this.updateEditorValue = this.updateEditorValue.bind(this);
    this.specialCharacters = this.specialCharacters.bind(this);
    this.handleEditorValue = this.handleEditorValue.bind(this);
    this.renderCharacters = this.renderCharacters.bind(this);
    this.debouncedOnChange = _.debounce(this.props.onChange.bind(this), 300);
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    this.initQuill();
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const nextVal = nextProps.value;
    const oldContents = this.editor ? this.getContents() : null;

    if (oldContents && nextVal &&
      !_.isEqual(nextVal.ops, oldContents.ops)) {
      this.setState({ value: nextVal });
      const sel = this.editor.getSelection();
      this.editor.setContents(nextVal);
      if (sel) this.editor.setSelection(sel);
    }
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillUpdate() {
    this.componentWillUnmount();
  }

  componentDidUpdate() {
    this.componentDidMount();
  }

  componentWillUnmount() {
    // Don't set the state to null, it would generate a loop.
  }

  onChange(val) {
    this.props.onChange(val);
  }

  getContents() {
    if (this.editor) return this.editor.getContents();

    return null;
  }

  updateEditorValue(contents, bounce = true) {
    this.setState({
      value: contents,
    }, bounce ? this.debouncedOnChange(contents) : this.onChange(contents));
  }

  handleEditorValue(toolbarItems, item) {
    const { editor } = this;
    const range = editor.getSelection();
    if (range) {
      let contents = editor.getContents();
      let elementOps = toolbarItems.find(x => x.name === item.name).ops;
      const insertDelta = new Delta(elementOps);
      if (range.index > 0) {
        elementOps = [{ retain: range.index }].concat(elementOps);
      }
      const elementDelta = new Delta(elementOps);
      contents = contents.compose(elementDelta);
      editor.setContents(contents);
      range.length = 0;
      range.index += insertDelta.length();
      editor.setSelection(range);
      this.updateEditorValue(contents, false);
    }
  }

  specialCharacters(args) {
    this.editor.focus();
    const cursorPosition = this.editor.getSelection().index;
    this.editor.setSelection(cursorPosition + args.length);
    this.editor.insertText(cursorPosition, args);
    const contents = this.getContents();
    this.updateEditorValue(contents);
  }

  initQuill() {
    if (!this.editor) {
      const quillEditor = ReactDOM.findDOMNode(this.refs[this.id]);

      const quillOptions = {
        modules: {
          toolbar: {
            container: `#toolbar-${this.id}`,
            handlers: {
              specialCharacters: this.specialCharacters,
            }
          },
        },
        theme: this.theme,
        readOnly: this.readOnly,
      };

      // init Quill
      this.editor = new Quill(quillEditor, quillOptions);
      const { value } = this.state;
      if (value) this.editor.setContents(value);

      // Resolve compability with Grammarly Chrome add-on
      // Fromm https://github.com/quilljs/quill/issues/574
      // let GrammarlyInline = Quill.import('blots/inline');
      // GrammarlyInline.tagName = 'G';
      // GrammarlyInline.blotName = 'grammarly-inline';
      // GrammarlyInline.className = 'gr_';
      // Quill.register({'formats/grammarly-inline': GrammarlyInline})

      this.editor.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user' && this.props.onChange) {
          const contents = this.getContents();
          this.updateEditorValue(contents);
        }
      });

      const { id } = this;

      this.toolbar.forEach((element) => {
        const selector = `#toolbar-${id} #${element.name}_id`;
        const btn = document.querySelector(selector);

        btn.addEventListener('click', () => {
          this.handleEditorValue(this.props.toolbarSymbol, element);
        });
      });
    }
  }

  renderQuillToolbarGroup() {
    if (this.theme !== 'snow') return (<span />);

    const quillToolbar = toolbarOptions.map((formatGroup, index) => {
      const groupElement = formatGroup.map((element) => {
        if (typeof element === 'string') {
          return (
            <button className={`ql-${element}`} key={`btnKey_${element}`} />
          );
        } else if (typeof element === 'object') {
          const elementName = Object.getOwnPropertyNames(element)[0];
          const elementValue = element[elementName];

          if (typeof elementValue === 'string') {
            return (
              <button
                className={`ql-${elementName}`}
                key={`btnKey_${elementValue}`}
                value={elementValue}
              />
            );
          } else if (Array.isArray(elementValue)) {
            const options = elementValue.map(function(e) {
              if(e == false){
                return <option value="" key="" />
              }
              return <option value={e} key={`opt_${e}`} />
            });

            const character = elementValue.map(e => this.renderCharacters(e));
            const templateCreatorPopover = (
              <Popover
                id="popover-positioned-bottom"
                title="special characters"
                // className="analyses-template-creator"
              >
                <span className="ql-spec-group">
                  {character}
                </span>
              </Popover>
            );

            /* eslint-disable eqeqeq */
            if (Object.keys(element) == 'specialCharacters') {
              return (
                <OverlayTrigger
                  key={`element_overlay_${element}`}
                  trigger="click"
                  placement="bottom"
                  rootClose
                  overlay={templateCreatorPopover}
                >
                  <span className="ql-formats">
                    <button>
                      <span> &#937; </span>
                    </button>
                  </span>
                </OverlayTrigger>
              );
            }

            return (
              <select
                className={`ql-${elementName}`}
                key={`btnKey_${elementName}`}
              >
                {options}
              </select>
            );
          }
        }
        return (<span key={`span_empty_${index}`}/>);
      });

      return (
        <span className="ql-formats" key={`sp_${index}`} >
          {groupElement}
        </span>
      );
    });
    return quillToolbar;
  }

  renderCharacters(e) {
    return (
      <Button
        className="ql-spec-Charac"
        key={`btnKey_${e}`}
        value={e}
        // eslint-disable-next-line no-shadow
        onClick={e => this.specialCharacters(e.target.value)}
      >
        {e}
      </Button>
    );
  }

  renderCustomToolbar() {
    if (this.theme !== 'snow' || !this.toolbar || this.toolbar.length === 0) {
      return (<span />);
    }

    const customToolbarElement = this.toolbar.map(element => {
      if (element.render) {
        return element.render(element.name);
      }

      return (
        <span
          key={`${element.name}_key`}
          id={`${element.name}_id`}
          style={{ marginRight: '10px', cursor: 'pointer' }}
        >
          <i className={`icon-${element.name}`} />
        </span>
      )
    });

    return (
      <span className="ql-formats custom-toolbar" >
        { customToolbarElement }
      </span>
    );
  }

  renderCustomDropdown() {
    if (this.theme !== 'snow' || !this.toolbar || this.toolbar.length === 0 || this.props.toolbarDropdown.length === 0) {
      return null;
    }
    return (
      <span className="ql-formats custom-toolbar">
        <ButtonToolbar>
          <DropdownButton
            title="MS"
            id="quill-cuz-dropdown"
            className="quill-cuz-dropdown"
          >
            {this.props.toolbarDropdown.map(t => <MenuItem key={`mi_${t.name}`} eventKey={t.name} onSelect={() => this.handleEditorValue(this.props.toolbarDropdown, t)}>{t.name.toUpperCase()}</MenuItem>)}
          </DropdownButton>
        </ButtonToolbar>
      </span>
    );
  }

  render() {
    return (
      <div>
        <div id={`toolbar-${this.id}`}>
          {this.renderQuillToolbarGroup()}
          <span className="ql-formats custom-toolbar">
            { this.props.customToolbar }
          </span>
          {this.renderCustomToolbar()}
          {this.renderCustomDropdown()}
        </div>
        <div
          ref={this.id}
          style={{ height: this.height }}
        />
      </div>
    );
  }
}

QuillEditor.propTypes = {
  value: PropTypes.object,
  customToolbar: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  toolbarSymbol: PropTypes.array,
  toolbarDropdown: PropTypes.arrayOf(PropTypes.object),
  theme: PropTypes.string,
  height: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
};

QuillEditor.defaultProps = {
  value: {},
  customToolbar: '',
  toolbarSymbol: [],
  toolbarDropdown: [],
  theme: 'snow',
  height: '230px',
  disabled: false,
  onChange: null,
};

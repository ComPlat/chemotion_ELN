import React from 'react';
import PropTypes from 'prop-types';

import { Button, OverlayTrigger, Popover } from 'react-bootstrap';

import _ from 'lodash';
import Delta from 'quill-delta';

import ReactQuill from 'src/components/reactQuill/ReactQuill';
import BaseToolbar from 'src/components/reactQuill/BaseToolbar';

import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import TextTemplateToolbar from 'src/components/textTemplateToolbar/TextTemplateToolbar';
import ToolbarTemplateCreator from 'src/components/textTemplateToolbar/ToolbarTemplateCreator';

const BASE_FORMATS = ['bold', 'italic', 'underline', 'header', 'script', 'list'];

const SPECIAL_CHARACTERS = [
  '→', '⇌', '⇐', '⇒', '⇑', ' ⇓', '⇠', '⇢', '⇡', '⇣', '⇤', '⇥', '⤒', '⤓', '↨', '∆', 'α', 'β', 'δ', 'Κ', '°C', '°F',
  '☉', '⬤', 'Ⓤ', '🜚', 'Ω', 'Ā', 'ā', 'Ă', 'ă', '<', '>', '≤', '≥', '–', '—', '¯', '‾', '°', '−', '±', '÷', '⁄',
  '×', '≈', '≠', '≡', '≅', '∫', '∑', 'φ', '∞', '√', '∼', '∃', '∀', '∗', '∝', '∠'
];

const KEYBOARD_BINDINGS = {
  subscript: {
    key: 188,
    shortKey: true,
    handler(range, context) {
      this.quill.format('script', context.format.script === 'sub' ? false : 'sub');
    }
  },
  superscript: {
    key: 190,
    shortKey: true,
    handler(range, context) {
      this.quill.format('script', context.format.script === 'super' ? false : 'super');
    }
  }
};

// toolbar extras are opt-in, so a call site drops one by removing its prop
export default class RichTextEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      template: {},
      predefinedTemplateNames: [],
      fetchedPredefinedTemplates: {},
      showTemplateCreator: false,
    };

    this.toolbarId = _.uniqueId('rte-toolbar-');
    this.ownRef = React.createRef();

    // asking twice loops forever when a name has no template behind it
    this.requestedNames = new Set();

    // built once: ReactQuill rebuilds the editor whenever its children differ
    this.editingArea = props.height
      ? <div className="quill-resize" style={{ height: props.height }} />
      : null;

    this.modules = {
      toolbar: { container: `#${this.toolbarId}` },
      keyboard: { bindings: KEYBOARD_BINDINGS },
    };

    this.onEditorChange = this.onEditorChange.bind(this);
    this.onTemplateStoreChange = this.onTemplateStoreChange.bind(this);
    this.insertText = this.insertText.bind(this);
    this.applyTemplate = this.applyTemplate.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);
  }

  componentDidMount() {
    if (!this.usesTemplates()) return;

    TextTemplateStore.listen(this.onTemplateStoreChange);
    TextTemplateActions.fetchPredefinedTemplateNames();

    const { templateType } = this.props;
    if (templateType) TextTemplateActions.fetchTextTemplates(templateType);

    this.fetchMissingTemplates(this.toolbarSetup());
  }

  componentDidUpdate(prevProps) {
    const { template } = this.props;
    if (template !== prevProps.template) this.fetchMissingTemplates(template);
  }

  componentWillUnmount() {
    if (this.usesTemplates()) TextTemplateStore.unlisten(this.onTemplateStoreChange);
  }

  // loading content fires this too, and that would mark the element unsaved
  onEditorChange(content, delta, source, editor) {
    const { onChange } = this.props;
    if (onChange && source === 'user') onChange(editor.getContents());
  }

  onTemplateStoreChange(state) {
    const { templateType } = this.props;
    const stored = templateType ? state[templateType] : null;
    const fetched = state.fetchedPredefinedTemplates.toJS();

    this.setState({
      template: (stored && stored.toJS ? stored.toJS() : stored) || {},
      predefinedTemplateNames: state.predefinedTemplateNames.toJS(),
      fetchedPredefinedTemplates: fetched,
    }, () => this.fetchMissingTemplates(this.toolbarSetup()));
  }

  toolbarSetup() {
    const { templateType, template } = this.props;
    return templateType ? this.state.template : template;
  }

  usesTemplates() {
    const { templateType, template } = this.props;
    return Boolean(templateType) || Boolean(template);
  }

  editorRef() {
    const { innerRef } = this.props;
    return innerRef && 'current' in innerRef ? innerRef : this.ownRef;
  }

  quill() {
    const ref = this.editorRef();
    return ref.current ? ref.current.getEditor() : null;
  }

  // list values are template names; other keys hold display strings like _tt_label
  fetchMissingTemplates(setup) {
    const names = Object.values(setup || {})
      .filter((value) => Array.isArray(value))
      .flat()
      .filter((name) => typeof name === 'string' && !this.requestedNames.has(name));

    if (names.length === 0) return;

    names.forEach((name) => this.requestedNames.add(name));
    TextTemplateActions.fetchPredefinedTemplateByNames(names);
  }

  insertText(text) {
    const quill = this.quill();
    if (!quill) return;

    quill.focus();
    const range = quill.getSelection();
    if (!range) return;

    quill.insertText(range.index, text);
    quill.setSelection({ index: range.index + text.length, length: 0 });
    this.onEditorChange(null, null, 'user', quill);
  }

  applyTemplate(template) {
    if (!('ops' in template) || !Array.isArray(template.ops)) return;

    const quill = this.quill();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    const insertDelta = new Delta(template.ops);
    const ops = range.index > 0 ? [{ retain: range.index }].concat(template.ops) : template.ops;

    quill.setContents(quill.getContents().compose(new Delta(ops)));
    quill.setSelection({ index: range.index + insertDelta.length(), length: 0 });
    this.onEditorChange(null, null, 'user', quill);
  }

  updateTextTemplates(setup) {
    const { templateType, updateTextTemplates } = this.props;

    if (templateType) {
      TextTemplateActions.updateTextTemplates(templateType, setup);
      return;
    }
    if (updateTextTemplates) updateTextTemplates(setup);
  }

  renderSpecialCharacters() {
    const { specialCharacters } = this.props;
    if (!specialCharacters) return null;

    const popover = (
      <Popover id={`${this.toolbarId}-characters`}>
        <Popover.Header>Special Characters</Popover.Header>
        <Popover.Body className="d-flex flex-wrap">
          {SPECIAL_CHARACTERS.map((character) => (
            <Button
              className="m-1 flex-shrink-1 flex-grow-1 text-nowrap"
              style={{ width: '15%' }}
              variant="light"
              key={`char_${character}`}
              value={character}
              onClick={(e) => this.insertText(e.target.value)}
            >
              {character}
            </Button>
          ))}
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger trigger="click" placement="bottom" rootClose overlay={popover}>
        <span className="ql-formats" title="Special Characters (Ω)">&#937;</span>
      </OverlayTrigger>
    );
  }

  renderTemplateToolbar() {
    if (!this.usesTemplates()) return null;

    const { predefinedTemplateNames, fetchedPredefinedTemplates, showTemplateCreator } = this.state;
    const setup = this.toolbarSetup();

    const creatorPopover = (
      <Popover id={`${this.toolbarId}-templates`} className="analyses-template-creator">
        <ToolbarTemplateCreator
          template={setup}
          templateOptions={predefinedTemplateNames}
          updateTextTemplates={this.updateTextTemplates}
          onClose={() => this.setState({ showTemplateCreator: false })}
        />
      </Popover>
    );

    return (
      <>
        <TextTemplateToolbar
          template={setup}
          predefinedTemplates={fetchedPredefinedTemplates}
          applyTemplate={this.applyTemplate}
        />
        <OverlayTrigger
          show={showTemplateCreator}
          onToggle={(show) => this.setState({ showTemplateCreator: show })}
          trigger="click"
          placement="top"
          rootClose
          overlay={creatorPopover}
        >
          <span className="ql-formats">
            <button type="button" title="Template Settings">
              <span className="fa fa-cog" />
            </button>
          </span>
        </OverlayTrigger>
      </>
    );
  }

  render() {
    const {
      value, readOnly, indent, toolbarExtras
    } = this.props;

    const formats = indent ? BASE_FORMATS.concat('indent') : BASE_FORMATS;

    return (
      <div>
        <div id={this.toolbarId}>
          <BaseToolbar indent={indent} />
          {toolbarExtras}
          {this.renderSpecialCharacters()}
          {this.renderTemplateToolbar()}
        </div>
        <ReactQuill
          ref={this.editorRef()}
          theme="snow"
          formats={formats}
          modules={this.modules}
          value={value}
          readOnly={readOnly}
          onChange={this.onEditorChange}
        >
          {this.editingArea}
        </ReactQuill>
      </div>
    );
  }
}

RichTextEditor.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  value: PropTypes.object,
  // toolbar setup handed down by a parent; use templateType instead to self-manage it
  template: PropTypes.object,
  innerRef: PropTypes.object,
  toolbarExtras: PropTypes.node,
  /* eslint-enable react/forbid-prop-types */
  onChange: PropTypes.func,
  updateTextTemplates: PropTypes.func,
  templateType: PropTypes.string,
  readOnly: PropTypes.bool,
  height: PropTypes.string,
  indent: PropTypes.bool,
  specialCharacters: PropTypes.bool,
};

RichTextEditor.defaultProps = {
  value: {},
  template: null,
  innerRef: null,
  toolbarExtras: null,
  onChange: null,
  updateTextTemplates: null,
  templateType: '',
  readOnly: false,
  height: undefined,
  indent: false,
  specialCharacters: false,
};

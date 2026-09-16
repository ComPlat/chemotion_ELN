import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import Quill from 'quill';
import Delta from 'quill-delta';

import _ from 'lodash';
import { Dropdown, DropdownButton, OverlayTrigger, Popover, Button } from 'react-bootstrap';
import QuillResize from 'quill-resize-module';
// resize.css is inlined into app/assets/stylesheets/components/QuillResize.scss
// so the Sprockets asset pipeline serves it — avoids adding a CSS require-hook
// to the mocha test setup for a single third-party stylesheet.
import { stripImages } from 'src/utilities/quillFormat';
// Side-effect imports — the blot modules self-register on the Quill singleton.
import 'src/components/reactQuill/AttachmentImageBlot';
import 'src/components/reactQuill/AttachmentFileBlot';
import { createQuillImageHandler } from 'src/utilities/quillImageHandler';

// Register the resize module once. Idempotent under Quill.register(overwrite=true).
Quill.register('modules/resize', QuillResize, true);

const toolbarOptions = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{
    specialCharacters: [
      '→', '⇌', '⇐', '⇒', '⇑', ' ⇓', '⇠', '⇢', '⇡', '⇣', '⇤', '⇥', '⤒', '⤓', '↨', '∆', 'α', 'β', 'δ', 'Κ', '°C', '°F',
      '☉', '⬤', 'Ⓤ', '🜚', 'Ω', 'Ā', 'ā', 'Ă', 'ă', '<', '>', '≤', '≥', '–', '—', '¯', '‾', '°', '−', '±', '÷', '⁄',
      '×', '≈', '≠', '≡', '≅', '∫', '∑', 'φ', '∞', '√', '∼', '∃', '∀', '∗', '∝', '∠'
    ]
  }],
  // [{ 'color': [] }, { 'background': [] }],
  // [{ 'font': [] }],
  // ['α', 'β', 'π'],
  // ['blockquote', 'code-block'],
  // [{ 'header': 1 }, { 'header': 2 }],
  // [{ 'direction': 'rtl' }],
  // [{ 'size': ['small', false, 'large', 'huge'] }],
  // [{ 'align': [] }],
  // ['clean'],
];

// Keyboard shortcut tooltips for toolbar buttons
const shortcutTooltips = {
  bold: 'Bold (Ctrl+B)',
  italic: 'Italic (Ctrl+I)',
  underline: 'Underline (Ctrl+U)',
  list: {
    ordered: 'Numbered List',
    bullet: 'Bullet List',
  },
  script: {
    sub: 'Subscript (Ctrl+,)',
    super: 'Superscript (Ctrl+.)',
  },
  header: 'Heading',
  specialCharacters: 'Special Characters (Ω)',
};

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

  componentDidUpdate(prevProps) {
    const { value } = this.props;
    if (value?.ops !== prevProps.value?.ops) {
      this.setState({ value });
      const sel = this.editor.getSelection();
      this.editor.setContents(stripImages(value));
      if (sel) this.editor.setSelection(sel);
    }
    this.syncDeletedBlotVisualState();
  }

  // Toggles the `inline-blot-deleted` class on every embed DOM node whose
  // matching attachment carries `is_deleted: true`. Purely visual; the
  // delta ops stay intact until save-time cascade strips them. Symmetric
  // with A1 (editor→tab): here the tab→editor side flips the CSS so users
  // see instant feedback when they delete an inline row.
  syncDeletedBlotVisualState() {
    if (!this.editor) return;
    const root = this.editor.root;
    if (!root) return;

    const attachments = (typeof this.props.getAttachments === 'function'
      ? this.props.getAttachments()
      : (this.props.attachments || [])) || [];
    const deletedIds = new Set(
      attachments.filter((a) => a && a.is_deleted && a.identifier).map((a) => a.identifier)
    );

    const nodes = root.querySelectorAll('[data-attachment-identifier]');
    nodes.forEach((node) => {
      const id = node.getAttribute('data-attachment-identifier');
      if (deletedIds.has(id)) {
        node.classList.add('inline-blot-deleted');
      } else {
        node.classList.remove('inline-blot-deleted');
      }
    });
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
          keyboard: {
            bindings: {
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
            }
          },
          // Inline image resize handles + alignment toolbar. quill-resize-module
          // keys its parchment map by `blot.statics.blotName` (not by tag), so
          // we register under our custom blot's name — 'attachment-image'.
          // Width is written as an HTML attribute and survives the delta
          // round-trip via AttachmentImageBlot.value(). Alignment buttons
          // add a class to the img (`ql-resize-style-left|center|right|full`)
          // whose CSS is inlined in components/QuillResize.scss.
          resize: {
            modules: ['Resize', 'DisplaySize', 'Toolbar'],
            tools: ['left', 'center', 'right', 'full'],
            parchment: {
              'attachment-image': {
                attribute: ['width'],
                limit: { minWidth: 50 },
              },
            },
          },
        },
        // `resize-inline` / `resize-block` are the ClassAttributors that
        // quill-resize-module's Toolbar uses to apply alignment (ql-resize-style-*).
        // Without them in the allowlist, Quill silently drops the format and
        // clicking left/center/right/full does nothing.
        formats: ['bold', 'italic', 'underline', 'header', 'script', 'list', 'indent', 'attachment-image', 'attachment-file', 'resize-inline', 'resize-block'],
        theme: this.theme,
        readOnly: this.readOnly,
      };

      // init Quill
      this.editor = new Quill(quillEditor, quillOptions);
      const { value } = this.state;
      if (value) this.editor.setContents(stripImages(value));
      // First render — reflect any pre-existing `is_deleted` flags on the
      // blots. Without this, when the Research Plan tab re-mounts after the
      // user deleted an inline attachment on the Attachments tab (Tabs is
      // mountOnEnter/unmountOnExit), the blot renders as normal because
      // componentDidUpdate hasn't fired yet.
      this.syncDeletedBlotVisualState();

      // Wire the paste/drop → Attachment pipeline when the consumer supplies
      // an attachments contract. Consumers without an element (e.g. text
      // template editors) simply omit the props and images/files continue to
      // be stripped as before.
      if (typeof this.props.onAttachmentsChange === 'function') {
        const handler = createQuillImageHandler({
          getAttachments: () => (typeof this.props.getAttachments === 'function'
            ? this.props.getAttachments()
            : (this.props.attachments || [])),
          onAttachmentsChange: this.props.onAttachmentsChange,
        });
        handler.install(this.editor);
      }

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

  getTooltip(elementName, elementValue) {
    const tooltip = shortcutTooltips[elementName];
    if (typeof tooltip === 'string') {
      return tooltip;
    } else if (typeof tooltip === 'object' && elementValue) {
      return tooltip[elementValue] || '';
    }
    return '';
  }

  renderQuillToolbarGroup() {
    if (this.theme !== 'snow') return (<span />);

    const quillToolbar = toolbarOptions.map((formatGroup, index) => {
      const groupElement = formatGroup.map((element) => {
        if (typeof element === 'string') {
          const tooltip = this.getTooltip(element);
          return (
            <button
              className={`ql-${element}`}
              key={`btnKey_${element}`}
              title={tooltip}
            />
          );
        } else if (typeof element === 'object') {
          const elementName = Object.getOwnPropertyNames(element)[0];
          const elementValue = element[elementName];

          if (typeof elementValue === 'string') {
            const tooltip = this.getTooltip(elementName, elementValue);
            return (
              <button
                className={`ql-${elementName}`}
                key={`btnKey_${elementValue}`}
                value={elementValue}
                title={tooltip}
              />
            );
          } else if (Array.isArray(elementValue)) {
            const options = elementValue.map(function (e) {
              if (e == false) {
                return <option value="" key="" />
              }
              return <option value={e} key={`opt_${e}`} />
            });

            const character = elementValue.map(e => this.renderCharacters(e));

            const templateCreatorPopover = (
              <Popover
                id="popover-positioned-bottom"
                title="Special Characters"
              >
                <Popover.Header>
                  Special Characters
                </Popover.Header>
                <Popover.Body className="d-flex flex-wrap">
                  {character}
                </Popover.Body>
              </Popover>
            );

            /* eslint-disable eqeqeq */
            if (Object.keys(element) == 'specialCharacters') {
              return (
                <OverlayTrigger
                  key={`element_overlay_${element}`}
                  trigger="click"
                  placement="bottom"
                  overlay={templateCreatorPopover}
                  rootClose
                >
                  <span className="ql-formats" title={shortcutTooltips.specialCharacters}>
                    &#937;
                  </span>
                </OverlayTrigger>
              );
            }

            const tooltip = this.getTooltip(elementName);
            return (
              <select
                className={`ql-${elementName}`}
                key={`btnKey_${elementName}`}
                title={tooltip}
              >
                {options}
              </select>
            );
          }
        }
        return (<span key={`span_empty_${index}`} />);
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
        className="m-1 flex-shrink-1 flex-grow-1 text-nowrap"
        style={{ width: '15%' }}
        variant="light"
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
      return null;
    }

    const customToolbarElement = this.toolbar.map(element => {
      if (element.render) {
        return element.render(element.name);
      }

      return (
        <Button
          key={`${element.name}_key`}
          id={`${element.name}_id`}
          className="me-2"
        >
          <i className={`icon-${element.name}`} />
        </Button>
      )
    });

    return (
      <span className="ql-formats custom-toolbar" >
        {customToolbarElement}
      </span>
    );
  }

  renderCustomDropdown() {
    if (this.theme !== 'snow' || !this.toolbar || this.toolbar.length === 0 || this.props.toolbarDropdown.length === 0) {
      return null;
    }
    
    const customDropdownElement = this.props.toolbarDropdown.map(element => {
      return (
        <Dropdown.Item
          key={`mi_${element.name}`}
          eventKey={element.name}
          onSelect={() => this.handleEditorValue(this.props.toolbarDropdown, element)}
        >
          {element.name.toUpperCase()}
        </Dropdown.Item>
      );
    });

    return (
      <span className="ql-formats custom-toolbar">
        <DropdownButton
          title="MS"
          id="quill-cuz-dropdown"
          className="quill-cuz-dropdown"
        >
          {customDropdownElement}
        </DropdownButton>
      </span>
    );
  }

  render() {
    return (
      <div>
        <div id={`toolbar-${this.id}`}>
          {this.renderQuillToolbarGroup()}
          <span className="ql-formats custom-toolbar">
            {this.props.customToolbar}
          </span>
          {this.renderCustomToolbar()}
          {this.renderCustomDropdown()}
        </div>
        <div
          ref={this.id}
          style={{ height: this.height }}
          className="quill-resize"
        />
      </div>
    );
  }
}

QuillEditor.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  customToolbar: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  toolbarSymbol: PropTypes.array,
  toolbarDropdown: PropTypes.arrayOf(PropTypes.object),
  theme: PropTypes.string,
  height: PropTypes.string,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  // Inline-attachment plumbing (optional). Consumers that want paste/drop-to-
  // attachment routing supply either `attachments` (static snapshot) or
  // `getAttachments` (dynamic lookup) plus `onAttachmentsChange` to receive
  // updated arrays. Without `onAttachmentsChange`, image/file drops fall
  // through to the legacy strip-and-discard behavior.
  // eslint-disable-next-line react/forbid-prop-types
  attachments: PropTypes.array,
  getAttachments: PropTypes.func,
  onAttachmentsChange: PropTypes.func,
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
  attachments: undefined,
  getAttachments: undefined,
  onAttachmentsChange: undefined,
};

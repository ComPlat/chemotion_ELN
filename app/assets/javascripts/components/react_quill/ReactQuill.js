/* eslint-disable react/sort-comp */
import React from 'react';
import ReactDOM from 'react-dom';

import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';

import Quill from 'quill';

function postpone(fn) {
  Promise.resolve().then(fn);
}

const isDelta = value => value && value.ops;

const isEqualValue = (value, otherValue) => {
  if (isDelta(value) && isDelta(otherValue)) {
    return isEqual(value.ops, otherValue.ops);
  }

  return isEqual(value, otherValue);
};

const makeUnprivilegedEditor = (editor) => {
  const e = editor;

  return {
    getHTML: () => e.root.innerHTML,
    getLength: e.getLength.bind(e),
    getText: e.getText.bind(e),
    getContents: e.getContents.bind(e),
    getSelection: e.getSelection.bind(e),
    getBounds: e.getBounds.bind(e),
  };
};

const setEditorTabIndex = (editor, tabIndex) => {
  const check = (
    editor == null || editor.scroll == null || editor.scroll.domNode == null
  );
  if (check) return;

  // eslint-disable-next-line no-param-reassign
  editor.scroll.domNode.tabIndex = tabIndex;
};

export default class ReactQuill extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      generation: 0,
    };

    this.dirtyProps = ['modules', 'formats', 'bounds', 'theme', 'children'];
    this.cleanProps = [
      'id', 'className', 'style', 'placeholder', 'tabIndex',
      'onChange', 'onChangeSelection', 'onFocus', 'onBlur',
      'onKeyPress', 'onKeyDown', 'onKeyUp'
    ];
    this.allProps = this.dirtyProps.concat(this.cleanProps);

    this.isControlled = this.isControlled.bind(this);

    this.value = this.isControlled() ? props.value : props.defaultValue;

    this.shouldComponentRegenerate = this.shouldComponentRegenerate.bind(this);
    this.validateProps = this.validateProps.bind(this);

    this.getEditor = this.getEditor.bind(this);
    this.getEditingArea = this.getEditingArea.bind(this);
    this.getEditorConfig = this.getEditorConfig.bind(this);
    this.getEditorContents = this.getEditorContents.bind(this);
    this.getEditorSelection = this.getEditorSelection.bind(this);

    this.setEditorContents = this.setEditorContents.bind(this);
    this.setEditorReadOnly = this.setEditorReadOnly.bind(this);
    this.setEditorSelection = this.setEditorSelection.bind(this);
    this.setEditingArea = this.setEditingArea.bind(this);

    this.createEditor = this.createEditor.bind(this);
    this.destroyEditor = this.destroyEditor.bind(this);
    this.hookEditor = this.hookEditor.bind(this);
    this.instantiateEditor = this.instantiateEditor.bind(this);
    this.unhookEditor = this.unhookEditor.bind(this);

    this.renderEditingArea = this.renderEditingArea.bind(this);

    this.focus = this.focus.bind(this);
    this.blur = this.blur.bind(this);

    this.onEditorChange = this.onEditorChange.bind(this);
    this.onEditorChangeText = this.onEditorChangeText.bind(this);
    this.onEditorChangeSelection = this.onEditorChangeSelection.bind(this);
  }

  componentDidMount() {
    this.instantiateEditor();
    this.setEditorContents(this.editor, this.getEditorContents());
  }

  shouldComponentUpdate(nextProps, nextState) {
    this.validateProps(nextProps);

    // If the editor hasn't been instantiated yet, or the component has been
    // regenerated, we already know we should update.
    if (!this.editor || this.state.generation !== nextState.generation) {
      return true;
    }

    // Handle value changes in-place
    if ('value' in nextProps) {
      const prevContents = this.getEditorContents();
      const nextContents = nextProps.value ? nextProps.value : '';

      // NOTE: Seeing that Quill is missing a way to prevent edits, we have to
      //       settle for a hybrid between controlled and uncontrolled mode. We
      //       can't prevent the change, but we'll still override content
      //       whenever `value` differs from current state.
      // NOTE: Comparing an HTML string and a Quill Delta will always trigger a
      //       change, regardless of whether they represent the same document.
      if (!isEqualValue(nextContents, prevContents)) {
        this.setEditorContents(this.editor, nextContents);
      }
    }

    // Handle read-only changes in-place
    if (nextProps.readOnly !== this.props.readOnly && nextProps.readOnly !== null) {
      this.setEditorReadOnly(!nextProps.readOnly);
    }

    return Object.keys(this.props).some(propKey => (
      !isEqual(nextProps[propKey], this.props[propKey])
    ));
  }

  componentDidUpdate(prevProps, prevState) {
    // If we're changing one of the `dirtyProps`, the entire Quill Editor needs
    // to be re-instantiated. Regenerating the editor will cause the whole tree,
    // including the container, to be cleaned up and re-rendered from scratch.
    // Store the contents so they can be restored later.
    if (this.editor && this.shouldComponentRegenerate(prevProps)) {
      const delta = this.editor.getContents();
      const selection = this.editor.getSelection();
      this.regenerationSnapshot = { delta, selection };

      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ generation: this.state.generation + 1 });
      this.destroyEditor();
    }

    // The component has been regenerated, so it must be re-instantiated, and
    // its content must be restored to the previous values from the snapshot.
    if (this.state.generation !== prevState.generation && this.regenerationSnapshot) {
      const { delta, selection } = this.regenerationSnapshot;
      delete this.regenerationSnapshot;

      this.instantiateEditor();

      const { editor } = this;
      if (editor) {
        editor.setContents(delta);
        postpone(() => this.setEditorSelection(editor, selection));
      }
    }
  }

  componentWillUnmount() {
    this.destroyEditor();
  }

  validateProps(props) {
    let error;
    if (this.lastDeltaChangeSet && this.lastDeltaChangeSet === props.value) {
      error = 'You are passing the `delta` object from the `onChange` event ' +
              'back as `value`. You most probably ' +
              'want `editor.getContents()` instead. ';
      throw new Error(error);
    }

    const noChild = React.Children.count(props.children);
    error = null;
    if (noChild) {
      if (noChild > 1) {
        error = 'The Quill editing area can only be composed ' +
                'of a single React element.';
      }

      const child = React.Children.only(props.children);
      if (child && child.type === 'textarea') {
        error = 'Quill does not support editing on a <textarea>. ' +
                'Use a <div> instead.';
      }

      if (error) throw new Error(error);
    }
  }

  shouldComponentRegenerate(nextProps) {
    return this.dirtyProps.some(prop => (
      !isEqual(nextProps[prop], this.props[prop])
    ));
  }

  getEditorConfig() {
    return {
      bounds: this.props.bounds,
      formats: this.props.formats,
      modules: this.props.modules,
      placeholder: this.props.placeholder,
      readOnly: this.props.readOnly,
      scrollingContainer: this.props.scrollingContainer,
      tabIndex: this.props.tabIndex,
      theme: this.props.theme,
    };
  }

  getEditor() {
    if (this.editor == null) {
      throw new Error('Accessing non-instantiated editor');
    }

    return this.editor;
  }

  getEditorContents() {
    return this.value;
  }

  getEditorSelection() {
    return this.selection;
  }

  getEditingArea() {
    if (!this.editingArea) {
      throw new Error('Instantiating on missing editing area');
    }

    // eslint-disable-next-line react/no-find-dom-node
    const element = ReactDOM.findDOMNode(this.editingArea);
    if (!element) {
      throw new Error('Cannot find element for editing area');
    }

    if (element.nodeType === 3) {
      throw new Error('Editing area cannot be a text node');
    }

    return element;
  }

  /* eslint-disable class-methods-use-this */
  setEditorContents(editor, value) {
    if (!editor) return;

    this.value = value;
    const sel = this.getEditorSelection();

    if (typeof value === 'string') {
      editor.setContents(editor.clipboard.convert(value));
    } else {
      editor.setContents(value);
    }

    postpone(() => this.setEditorSelection(editor, sel));
  }

  setEditorSelection(editor, range) {
    this.selection = range;

    if (range) {
      // Validate bounds before applying.
      const length = editor.getLength();

      /* eslint-disable no-param-reassign */
      range.index = Math.max(0, Math.min(range.index, length - 1));
      range.length = Math.max(0, Math.min(range.length, (length - 1) - range.index));
      /* eslint-enable no-param-reassign */

      editor.setSelection(range);
    }
  }

  setEditorReadOnly(editor, value) {
    if (value) {
      editor.disable();
    } else {
      editor.enable();
    }
  }
  /* eslint-enable class-methods-use-this */

  setEditingArea(area) {
    this.editingArea = area;
  }

  hookEditor(editor) {
    // Expose the editor on change events via a weaker, unprivileged proxy
    // object that does not allow accidentally modifying editor state.
    this.unprivilegedEditor = makeUnprivilegedEditor(editor);
    // Using `editor-change` allows picking up silent updates, like selection
    // changes on typing.
    editor.on('editor-change', this.onEditorChange);
  }

  unhookEditor(editor) {
    editor.off('editor-change', this.onEditorChange);
  }

  createEditor(element, config) {
    const editor = new Quill(element, config);

    if (config.tabIndex != null) {
      setEditorTabIndex(editor, config.tabIndex);
    }

    this.hookEditor(editor);
    return editor;
  }

  isControlled() {
    const { value } = this.props;
    return value && value !== '';
  }

  destroyEditor() {
    if (!this.editor) return;

    this.unhookEditor(this.editor);
    delete this.editor;
  }

  instantiateEditor() {
    if (this.editor) return;

    this.editor = this.createEditor(
      this.getEditingArea(),
      this.getEditorConfig()
    );
  }

  onEditorChange(eventName, rangeOrDelta, oldRangeOrDelta, source) {
    if (eventName === 'text-change' && this.editor && this.unprivilegedEditor) {
      this.onEditorChangeText(
        this.editor.root.innerHTML,
        rangeOrDelta,
        source,
        this.unprivilegedEditor
      );
    } else if (eventName === 'selection-change' && this.unprivilegedEditor) {
      this.onEditorChangeSelection(
        rangeOrDelta,
        source,
        this.unprivilegedEditor
      );
    }
  }

  onEditorChangeText(value, delta, source, editor) {
    if (!this.editor) return;

    // We keep storing the same type of value as what the user gives us,
    // so that value comparisons will be more stable and predictable.
    const nextContents = isDelta(this.value)
      ? editor.getContents()
      : editor.getHTML();

    if (nextContents !== this.getEditorContents()) {
      // Taint this `delta` object, so we can recognize whether the user
      // is trying to send it back as `value`, preventing a likely loop.
      this.lastDeltaChangeSet = delta;

      this.value = nextContents;

      const { onChange } = this.props;
      if (onChange) onChange(value, delta, source, editor);
    }
  }

  onEditorChangeSelection(nextSelection, source, editor) {
    if (!this.editor) return;

    const currentSelection = this.getEditorSelection();
    const hasGainedFocus = !currentSelection && nextSelection;
    const hasLostFocus = currentSelection && !nextSelection;

    if (isEqual(nextSelection, currentSelection)) return;

    this.selection = nextSelection;
    const { onChangeSelection } = this.props;
    if (onChangeSelection) onChangeSelection(nextSelection, source, editor);

    const { onFocus, onBlur } = this.props;
    if (hasGainedFocus && onFocus) {
      onFocus(nextSelection, source, editor);
    } else if (hasLostFocus && onBlur) {
      onBlur(nextSelection, source, editor);
    }
  }

  focus() {
    if (!this.editor) return;

    this.editor.focus();
  }

  blur() {
    if (!this.editor) return;

    this.selection = null;
    this.editor.blur();
  }

  renderEditingArea() {
    const { children, preserveWhitespace } = this.props;
    const { generation } = this.state;

    const properties = {
      key: generation,
      ref: instance => this.setEditingArea(instance)
    };

    if (React.Children.count(children)) {
      return React.cloneElement(
        React.Children.only(children),
        properties
      );
    }

    return preserveWhitespace
      ? <pre {...properties} />
      : <div {...properties} />;
  }

  render() {
    const {
      id, style, className, onKeyPress, onKeyDown, onKeyUp
    } = this.props;

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        id={id}
        style={style}
        key={this.state.generation}
        className={`quill ${className || ''}`}
        onKeyPress={onKeyPress}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        {this.renderEditingArea()}
      </div>
    );
  }
}

ReactQuill.propTypes = {
  bounds: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  children: PropTypes.element,
  className: PropTypes.string,
  defaultValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  formats: PropTypes.arrayOf(PropTypes.string),
  id: PropTypes.string,
  // eslint-disable-next-line react/forbid-prop-types
  modules: PropTypes.object,
  onChange: PropTypes.func,
  onChangeSelection: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  onKeyDown: PropTypes.instanceOf(React.EventHanlder),
  onKeyPress: PropTypes.instanceOf(React.EventHanlder),
  onKeyUp: PropTypes.instanceOf(React.EventHanlder),
  placeholder: PropTypes.string,
  preserveWhitespace: PropTypes.bool,
  readOnly: PropTypes.bool,
  scrollingContainer: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object,
  tabIndex: PropTypes.number,
  theme: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
};

ReactQuill.defaultProps = {
  bounds: 'document.body',
  className: '',
  children: null,
  defaultValue: null,
  formats: [],
  id: '',
  modules: {},
  onBlur: null,
  onChange: null,
  onChangeSelection: null,
  onFocus: null,
  onKeyDown: null,
  onKeyPress: null,
  onKeyUp: null,
  placeholder: null,
  preserveWhitespace: false,
  readOnly: false,
  scrollingContainer: null,
  style: {},
  tabIndex: 0,
  theme: 'snow',
  value: null
};


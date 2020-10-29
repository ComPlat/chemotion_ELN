/* eslint-disable class-methods-use-this */
/* eslint-disable react/no-multi-comp */
import React from 'react';
import PropTypes from 'prop-types';

import { OverlayTrigger, Popover } from 'react-bootstrap';

import ReactQuill from './react_quill/ReactQuill';
import QuillToolbarDropdown from './react_quill/QuillToolbarDropdown';
import QuillToolbarIcon from './react_quill/QuillToolbarIcon';
import DynamicTemplateCreator from './analyses_toolbar/DynamicTemplateCreator';

import {
  sampleAnalysesMacros,
  defaultMacroDropdown,
  defaultMacroToolbar
} from './utils/quillToolbarSymbol';

sampleAnalysesMacros.ndash.icon = (
  <span className="fa fa-minus" />
);
sampleAnalysesMacros['h-nmr'].icon = (
  <span>H</span>
);
sampleAnalysesMacros['c-nmr'].icon = (
  <span>C</span>
);

const editTemplate = () => { console.log('ad'); };
const autoFormat = () => { console.log('autoFormat'); };

const extractMacros = (macros) => {
  const tKeys = Object.keys(macros);

  return tKeys.reduce(([iData, ddData], tKey) => {
    const macroNames = macros[tKey];

    /* eslint-disable no-param-reassign */
    if (tKey === '_toolbar') {
      macroNames.forEach((name) => {
        iData[name] = sampleAnalysesMacros[name];
      });
    } else {
      const data = {};
      macroNames.forEach((name) => {
        data[name] = sampleAnalysesMacros[name];
      });
      ddData[tKey] = data;
    }
    /* eslint-enable no-param-reassign */

    return [iData, ddData];
  }, [{}, {}]);
};

export default class ContainerComponentEditor extends React.Component {
  constructor(props) {
    super(props);
    // this.state = { editorDelta: {} };

    this.toolbarId = `_${Math.random().toString(36).substr(2, 9)}`;

    this.modules = {
      toolbar: {
        container: `#${this.toolbarId}`,
        handlers: {
          editTemplate,
          autoFormat
        }
      },
    };

    this.handleChange = this.handleChange.bind(this);
    this.selectDropdown = this.selectDropdown.bind(this);
    this.iconOnClick = this.iconOnClick.bind(this);
  }

  handleChange(delta) {
    // this.setState({ editorDelta: delta });
  }

  selectDropdown(key, value) {
    console.log(`select  Dropdown ${key} - ${value}`);
  }

  toolbarOnClick() {
    console.log('toolbar onclick');
  }

  iconOnClick(macro) {
    console.log(macro);
  }

  render() {
    let { macros } = this.props;
    if (Object.keys(macros).length === 0) {
      macros = {
        _toolbar: defaultMacroToolbar,
        MS: defaultMacroDropdown
      };
    }

    const [iconMacros, ddMacros] = extractMacros(macros);

    const templateCreatorPopover = (
      <Popover
        id="popover-positioned-top"
        title="Custom toolbar"
        className="analyses-template-creator"
      >
        <DynamicTemplateCreator
          iconMacros={iconMacros}
          dropdownMacros={ddMacros}
          predefinedMacros={sampleAnalysesMacros}
        />
      </Popover>
    );
    const autoFormatIcon = <span className="fa fa-magic" />;

    return (
      <div>
        <div id={this.toolbarId}>
          <select className="ql-header" defaultValue="" onChange={e => e.persist()}>
            <option value="1" />
            <option value="2" />
            <option value="3" />
            <option value="4" />
            <option value="5" />
            <option value="6" />
            <option />
          </select>
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
          <button className="ql-script" value="sub" />
          <button className="ql-script" value="super" />
          <QuillToolbarIcon
            icon={autoFormatIcon}
            onClick={autoFormat}
          />
          {Object.keys(iconMacros).map((name) => {
            const val = iconMacros[name];
            const onClick = () => this.iconOnClick(val);

            return (
              <QuillToolbarIcon
                key={`${this.toolbarId}_icon_${name}`}
                icon={val.icon ? val.icon : name}
                onClick={onClick}
              />
            );
          })}
          {Object.keys(ddMacros).map((label) => {
            const items = {};
            Object.keys(ddMacros[label]).forEach((k) => {
              items[k.toUpperCase()] = k;
            });

            return (
              <QuillToolbarDropdown
                key={`${this.toolbarId}_dd_${label}`}
                label={label}
                items={items}
                onSelect={this.selectDropdown}
              />
            );
          })}
          <OverlayTrigger
            trigger="click"
            placement="top"
            overlay={templateCreatorPopover}
          >
            <span className="ql-formats">
              <button className="ql-editTemplate">
                <span className="fa fa-cog" />
              </button>
            </span>
          </OverlayTrigger>
        </div>
        <ReactQuill
          modules={this.modules}
          theme="snow"
        />
      </div>
    );
  }
}

ContainerComponentEditor.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  macros: PropTypes.object,
};

ContainerComponentEditor.defaultProps = {
  macros: {},
};

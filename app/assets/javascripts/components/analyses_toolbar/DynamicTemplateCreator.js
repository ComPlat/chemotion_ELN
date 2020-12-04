import { cloneDeep } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox, FormControl, Table } from 'react-bootstrap';

export default class DynamicTemplateCreator extends React.Component {
  constructor(props) {
    super(props);

    const dropdownMacros = cloneDeep(props.dropdownMacros);
    const iconMacros = cloneDeep(props.iconMacros);

    const ddKeys = Object.keys(dropdownMacros);
    this.state = {
      iconMacros,
      dropdownTitles: [...ddKeys],
      dropdownValues: Object.values(dropdownMacros)
    };
    this.ddRefs = ddKeys.map(() => React.createRef());

    this.createDropdownMacro = this.createDropdownMacro.bind(this);
    this.removeDropdownMacro = this.removeDropdownMacro.bind(this);
    this.saveUserMacros = this.saveUserMacros.bind(this);
    this.onChangeCheckbox = this.onChangeCheckbox.bind(this);
  }

  onChangeCheckbox(title, idx, predefinedName) {
    if (title === '_toolbar') {
      const { iconMacros } = this.state;
      const existed = iconMacros.filter(x => x === predefinedName).length > 0;

      if (existed) {
        this.setState({ iconMacros: iconMacros.filter(x => x !== predefinedName) });
      } else {
        iconMacros.push(predefinedName);
        this.setState({ iconMacros });
      }
    } else {
      const { dropdownValues } = this.state;
      let dropdown = dropdownValues[idx];
      const existed = dropdown.filter(x => x === predefinedName).length > 0;

      if (existed) {
        dropdown = dropdown.filter(x => x !== predefinedName);
      } else {
        dropdown.push(predefinedName);
      }

      dropdownValues[idx] = dropdown;
      this.setState({ dropdownValues });
    }
  }

  createDropdownMacro() {
    const { dropdownTitles, dropdownValues } = this.state;

    this.ddRefs.push(React.createRef());
    this.setState({
      dropdownTitles: dropdownTitles.concat(['']),
      dropdownValues: dropdownValues.concat([[]])
    });
  }

  removeDropdownMacro(idx) {
    const { dropdownTitles, dropdownValues } = this.state;
    dropdownTitles.splice(idx, 1);
    dropdownValues.splice(idx, 1);
    this.ddRefs.splice(idx, 1);
    this.setState({ dropdownTitles, dropdownValues });
  }

  saveUserMacros() {
    const { updateTextTemplates } = this.props;
    if (!updateTextTemplates) return;

    const { iconMacros, dropdownTitles, dropdownValues } = this.state;

    const dropdownMacros = {};
    dropdownTitles.forEach((_title, idx) => {
      // eslint-disable-next-line no-underscore-dangle
      const title = this.ddRefs[idx].current._reactInternalFiber.child.stateNode.value;
      if (!title) return;

      dropdownMacros[title] = dropdownValues[idx];
    });
    updateTextTemplates(iconMacros, dropdownMacros);
  }

  render() {
    const { predefinedMacros } = this.props;
    const { iconMacros, dropdownTitles, dropdownValues } = this.state;
    const definedHeader = Object.entries(predefinedMacros).map(([k, v]) => (
      <th key={k} style={{ textAlign: 'center' }}>
        {React.isValidElement(v.icon) ? v.icon : k.toUpperCase()}
      </th>
    ));

    const toolbarRow = (
      <tr>
        <td />
        <td style={{ verticalAlign: 'middle' }}>
          &nbsp;Toolbar
        </td>
        {Object.keys(predefinedMacros).map(k => (
          <td key={`_toolbar_${k}`} style={{ textAlign: 'center' }}>
            <Checkbox
              checked={iconMacros.includes(k)}
              // onClick={() => this.onChangeCheckbox('_toolbar', null, k)}
              onChange={() => this.onChangeCheckbox('_toolbar', null, k)}
            />
          </td>
        ))}
      </tr>
    );

    const dropdownRows = dropdownTitles.map((title, idx) => {
      const templateValues = Object.keys(predefinedMacros).map(k => (
        <td key={`${title}_${k}`} style={{ textAlign: 'center' }}>
          <Checkbox
            checked={dropdownValues[idx].includes(k)}
            // onClick={() => this.onChangeCheckbox(title, idx, k)}
            onChange={() => this.onChangeCheckbox(title, idx, k)}
          />
        </td>
      ));

      const removeDropdown = () => this.removeDropdownMacro(idx);

      return (
        <tr key={`${title}`}>
          <td style={{ verticalAlign: 'middle' }}>
            <Button bsStyle="danger" bsSize="xs" onClick={removeDropdown}>
              <i className="fa fa-times" />
            </Button>
          </td>
          <td style={{ verticalAlign: 'middle' }}>
            <FormControl
              type="text"
              defaultValue={title}
              ref={this.ddRefs[idx]}
            />
          </td>
          {templateValues}
        </tr>
      );
    });

    return (
      <div>
        <div>
          <Button
            bsStyle="success"
            onClick={this.saveUserMacros}
          >
            Save
          </Button>
          &nbsp;&nbsp;&nbsp;
          <Button
            bsStyle="info"
            onClick={this.createDropdownMacro}
          >
            New dropdown
          </Button>
        </div>
        <br />
        <Table striped bordered condensed hover responsive>
          <thead>
            <tr>
              <th />
              <th />
              {definedHeader}
            </tr>
          </thead>
          <tbody>
            {toolbarRow}
            {dropdownRows}
          </tbody>
        </Table>
      </div>
    );
  }
}

DynamicTemplateCreator.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  predefinedMacros: PropTypes.object,
  iconMacros: PropTypes.array,
  dropdownMacros: PropTypes.array,
  /* eslint-enable react/forbid-prop-types */
  updateTextTemplates: PropTypes.func
};

DynamicTemplateCreator.defaultProps = {
  predefinedMacros: {},
  iconMacros: [],
  dropdownMacros: [],
  updateTextTemplates: null
};

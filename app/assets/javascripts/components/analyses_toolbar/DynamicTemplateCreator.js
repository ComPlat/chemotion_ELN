import React from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox, Table } from 'react-bootstrap';

export default class DynamicTemplateCreator extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      template: {}
    };

    this.onChange = this.onChange.bind(this);
  }

  onChange() {
    this.props.onChange(this.state.template);
  }

  render() {
    const { predefinedMacros, iconMacros, dropdownMacros } = this.props;
    const ddTitles = Object.keys(dropdownMacros);
    const definedHeader = Object.entries(predefinedMacros).map(([k, v]) => (
      <th key={k}>
        {React.isValidElement(v.icon) ? v.icon : k.toUpperCase()}
      </th>
    ));

    const toolbarRow = (
      <tr>
        <td />
        {Object.keys(predefinedMacros).map(k => (
          <td key={`_toolbar_${k}`} style={{ textAlign: 'center' }}>
            <Checkbox checked={iconMacros[k] || false} />
          </td>
        ))}
      </tr>
    );

    const dropdownRows = ddTitles.map((title) => {
      const templateValues = Object.keys(predefinedMacros).map(k => (
        <td key={`${title}_${k}`} style={{ textAlign: 'center' }}>
          <Checkbox checked={dropdownMacros[title][k] || false} />
        </td>
      ));

      return (
        <tr key={`${title}`}>
          <td style={{ verticalAlign: 'middle' }}>
            {title}
          </td>
          {templateValues}
        </tr>
      );
    });


    return (
      <div>
        <Button>Add new dropdown</Button>
        <br /><br />
        <Table striped bordered condensed hover responsive>
          <thead>
            <tr>
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
  iconMacros: PropTypes.object,
  dropdownMacros: PropTypes.object,
  /* eslint-enable react/forbid-prop-types */
};

DynamicTemplateCreator.defaultProps = {
  predefinedMacros: {},
  iconMacros: {},
  dropdownMacros: {},
};

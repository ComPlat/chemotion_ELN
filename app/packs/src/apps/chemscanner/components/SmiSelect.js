import React from 'react';
import PropTypes from 'prop-types';
import VirtualizedSelect from 'react-virtualized-select';

export default class SmiSelect extends React.Component {
  constructor(props) {
    super(props);

    this.onSelect = this.onSelect.bind(this);
  }

  onSelect(selected) {
    const { onSelect, type } = this.props;
    onSelect({ value: selected, type });
  }

  render() {
    const {
      obj, type, disabled, value
    } = this.props;
    const options = [];
    const editedSmi = [];

    Object.keys(obj).forEach((k) => {
      const smi = obj[k];
      const opt = { label: k, value: smi };
      options.push(opt);

      if (value.indexOf(smi) > -1) {
        editedSmi.push(smi);
      }
    });

    return (
      <VirtualizedSelect
        multi
        disabled={disabled}
        onChange={this.onSelect}
        options={options}
        placeholder={`Add ${type}`}
        simpleValue
        {...this.props}
        value={editedSmi.join(',')}
      />
    );
  }
}

SmiSelect.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  obj: PropTypes.object.isRequired,
  type: PropTypes.string,
  value: PropTypes.arrayOf(PropTypes.string),
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

SmiSelect.defaultProps = {
  type: '',
  value: [],
  disabled: true
};

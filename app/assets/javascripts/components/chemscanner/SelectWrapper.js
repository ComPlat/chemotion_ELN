import React from 'react';
import PropTypes from 'prop-types';
import VirtualizedSelect from 'react-virtualized-select';

class SelectWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: props.value || '' };

    this.onSelect = this.onSelect.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { value } = nextProps;
    this.setState({ value });
  }

  onSelect(selected) {
    const { onSelect, title } = this.props;
    onSelect({ value: selected, type: title });
  }

  render() {
    const { obj, title, disabled } = this.props;
    const { value } = this.state;
    const options = [];
    const editedSmi = [];

    Object.keys(obj).forEach((k) => {
      const opt = { label: k, value: obj[k] };
      options.push(opt);

      const valueArr = value.split(',');
      if (valueArr.indexOf(obj[k]) > -1) {
        editedSmi.push(obj[k]);
      }
    });

    return (
      <VirtualizedSelect
        multi
        disabled={disabled}
        onChange={this.onSelect}
        options={options}
        placeholder={`Select ${title}`}
        simpleValue
        {...this.props}
        value={editedSmi.join(',')}
      />
    );
  }
}

SelectWrapper.propTypes = {
  obj: PropTypes.object.isRequired,
  title: PropTypes.string,
  value: PropTypes.string,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

SelectWrapper.defaultProps = {
  title: '',
  disabled: true
};

export default SelectWrapper;

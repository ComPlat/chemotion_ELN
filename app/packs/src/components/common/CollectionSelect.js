import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { findIndex } from 'lodash';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

// TODO: DRY this fn up with ManagingModalCollectionActions.js


export default class CollectionSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      options: CollectionStore.formatedCollectionOptions(
        {
          includeAll: false, // disable the "All" collection option
          onlyOwned: true, // only include collections owned by the current user
          // TODO: check why creating an element to a shared collection with PL >=1 is not working
          // permissionLevel: 1, // only enable shared collections that can be edited
        }
      ) || [],
      value: props.value,
    };
    this.onColSelectChange = this.onColSelectChange.bind(this);
  }

  onColSelectChange(e, reset = false) {
    const val = reset === false ? (e && e.value) : null;
    this.setState({
      value: val
    });
    this.props.onChange(val);
  }

  render() {
    const { value, options } = this.state;
    if (value != null && options != null && options.length > 0
      && findIndex(options, ['value', value]) < 0) {
      this.onColSelectChange(null, true);
    }
    return (
      <Select
        id="modal-collection-id-select"
        options={options}
        value={value}
        className="select-assign-collection"
        onChange={this.onColSelectChange}
      />
    );
  }
}

CollectionSelect.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

CollectionSelect.defaultProps = {
  value: 0
};

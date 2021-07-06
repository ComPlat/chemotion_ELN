import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { findIndex } from 'lodash';
import CollectionStore from '../stores/CollectionStore';
export default class CollectionSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      unsharedRoots: CollectionStore.getState().unsharedRoots || [],
      value: props.value,
      options: []
    };
    this.onColChange = this.onColChange.bind(this);
    this.onColSelectChange = this.onColSelectChange.bind(this);
    this.ColOptions = this.ColOptions.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onColChange);
    this.ColOptions();
  }

  onColChange(state) {
    if (state.unsharedRoots != this.state.unsharedRoots) {
      this.setState({
        unsharedRoots: state.unsharedRoots
      });
    }
  }

  onColSelectChange(e, reset = false) {
    const val = reset === false ? (e && e.value) : null;
    this.setState({
      value: val
    });
    this.props.onChange(val);
  }

  makeTree(tree, collections, depth) {
    collections.forEach((collection) => {
      if (collection.label == 'All') {
        return;
      }
      tree.push({ id: collection.id, label: collection.label, depth, first: collection.first });
      if (collection.children && collection.children.length > 0) {
        this.makeTree(tree, collection.children, depth + 1);
      }
    });
  }

  ColOptions() {
    const { unsharedRoots } = this.state;
    const cAllTree = [];
    this.makeTree(cAllTree, unsharedRoots || [], 0);

    if (cAllTree.length === 0) {
      this.setState({
        options: []
      });
    } else {
      const newOptions = cAllTree.map((leaf) => {
        const indent = "\u00A0".repeat(leaf.depth * 3 + 1);
        const className = leaf.first ? "separator" : "";
        return {
          value: leaf.id,
          label: indent + leaf.label,
          className
        };
      }) || [];
      this.setState({
        options: newOptions
      });
    }
  }

  render() {
    const { options, value } = this.state;
    if (value != null && options != null && options.length > 0
      && findIndex(options, ['value', value]) < 0) {
      this.onColSelectChange(null, true);
    }
    return (
      <Select
        id="modal-collection-id-select"
        options={options}
        value={value}
        className="status-select"
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

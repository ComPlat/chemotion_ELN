import React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'src/components/common/Select';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

export default class CollectionSelect extends React.Component {
  constructor(props) {
    super(props);

    const { unsharedRoots } = CollectionStore.getState();
    this.state = {
      unsharedRoots: unsharedRoots || [],
    };

    this.onColChange = this.onColChange.bind(this);
    this.onColSelectChange = this.onColSelectChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onColChange);
  }

  onColChange(state) {
    if (state.unsharedRoots != this.state.unsharedRoots) {
      this.setState({
        unsharedRoots: state.unsharedRoots || [],
      });
    }
  }

  onColSelectChange({ value }) {
    this.props.onChange(value);
  }

  makeTree(collections, tree = [], depth = 0) {
    if (!Array.isArray(collections)) return tree;

    collections.forEach((collection) => {
      if (collection.label === 'All') return;

      tree.push({ value: collection.id, label: collection.label, depth });
      this.makeTree(collection.children, tree, depth + 1);
    });

    return tree;
  }

  render() {
    const { value } = this.props;
    const { unsharedRoots } = this.state;
    const options = this.makeTree(unsharedRoots);

    const optionLabel = ({ label, depth }) => (
      <span style={{ paddingLeft: `${depth * 10}px` }}>
        {label}
      </span>
    );

    return (
      <Select
        id="modal-collection-id-select"
        options={options}
        formatOptionLabel={optionLabel}
        value={options.find((o) => o.value === value)}
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
  value: null,
};

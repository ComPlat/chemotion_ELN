import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import Select from 'react-select'

export default class ManagingModalCollectionActions extends React.Component {
  constructor(props) {
    super(props);
    const options = this.collectionOptions();
    this.state = {
      newLabel: null,
      options,
      selected: null,
    }
    this.onSelectChange = this.onSelectChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  onSelectChange(e) {
    let selected = e && e.value
    this.setState((previousProps, previousState) => {
      return { ...previousState, selected: selected }
    });
  }

  selectedIsCurrentCollection() {
    const { selected } = this.state;
    const { currentCollection } = UIStore.getState();

    return selected === currentCollection?.id;
  }

  collectionIsToBeCreated() {
    const { newLabel } = this.state;
    return newLabel && newLabel.length > 0;
  }

  collectionIsSelected() {
    const { selected } = this.state;
    return !!selected;
  }

  validSubmit() {
    return (this.collectionIsSelected() && !this.selectedIsCurrentCollection())
      || this.collectionIsToBeCreated();
  }

  collectionOptions() {
    const {
      myLockedCollectionTree, myCollectionTree, sharedCollectionTree
    } = CollectionStore.getState();

    const flattenLocked = CollectionStore.flattenCollectionTree(myLockedCollectionTree);
    const flattenCollectionTree = CollectionStore.flattenCollectionTree(myCollectionTree);
    const flattenSharedCollectionTree = CollectionStore.flattenCollectionTree(sharedCollectionTree);

    if (flattenCollectionTree.length > 0) {
      flattenCollectionTree[0].first = true;
    }
    if (flattenSharedCollectionTree.length > 0) {
      flattenSharedCollectionTree[0].first = true;
    }

    const options = [
      ...flattenLocked,
      ...flattenCollectionTree,
      ...flattenSharedCollectionTree
    ].map((leaf) => {
      const indent = '\u00A0'.repeat(leaf.depth * 3 + 1);
      const className = leaf.first ? 'separator' : '';
      return {
        value: leaf.id,
        label: indent + leaf.label,
        className,
      };
    });
    return options;
  }

  handleSubmit() {
    const { selected, newLabel, selectedUsers } = this.state;
    const ui_state = UIStore.getState();
    this.props.action({
      ui_state,
      collection_id: selected,
      newLabel,
      user_ids: selectedUsers
    });
    this.props.onHide();
  }

  submitButton() {
    const { newLabel } = this.state;
    const l = newLabel && newLabel.length
    return l && l > 0 ? (
      <Button bsStyle="warning" onClick={this.handleSubmit}>
        Create collection &lsquo;
        {newLabel}
        &rsquo; and Submit
      </Button>
    ) : (
      <Button bsStyle="warning" onClick={this.handleSubmit} disabled={!this.validSubmit()}>
        Submit
      </Button>
    );
  }

  render() {
    const { options, selected } = this.state;
    const onChange = (e) => {
      const val = e.target && e.target.value
      this.setState((previousState) => {
        return { ...previousState, newLabel: val }
      });
    }
    return (
      <div>
        <FormGroup>
          <ControlLabel>Select a Collection</ControlLabel>
          <Select
            options={options}
            value={selected}
            onChange={this.onSelectChange}
            className="select-assign-collection"
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>or Create a new Collection</ControlLabel>
          <FormControl
            type="text"
            placeholder="-- Please insert collection name --"
            onChange={onChange}
          />
        </FormGroup>
        {this.submitButton()}
        {(this.selectedIsCurrentCollection() && !this.collectionIsToBeCreated()) ? 'You cannot submit to the current collection' : ''}
      </div>
    )
  }
}

ManagingModalCollectionActions.propTypes = {
  action: PropTypes.func,
  onHide: PropTypes.func,
  listSharedCollections: PropTypes.bool,
}

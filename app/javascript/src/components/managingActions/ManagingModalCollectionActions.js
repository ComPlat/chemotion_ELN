import React from 'react';
import PropTypes from 'prop-types';
import { Form, Button, Modal } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionUtils from 'src/models/collection/CollectionUtils';
import { Select } from 'src/components/common/Select';

export default class ManagingModalCollectionActions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newLabel: null,
      selected: null,
    };
    this.onSelectChange = this.onSelectChange.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit() {
    const { selected, newLabel } = this.state;
    const { action, onHide } = this.props;

    action({
      ui_state: UIStore.getState(),
      collection_id: selected?.id,
      is_sync_to_me: selected?.is_sync_to_me,
      newLabel
    });
    onHide();
  }

  onSelectChange(selected) {
    this.setState({ selected });
  }

  onInputChange(e) {
    const val = e.target && e.target.value;
    this.setState({ newLabel: val });
  }

  makeList(collections, tree = [], depth = 0) {
    if (!Array.isArray(collections)) return tree;

    collections.forEach((collection) => {
      tree.push(collection);
      this.makeList(collection.children, tree, depth + 1);
    });

    return tree;
  }

  collectionOptions() {
    const cState = CollectionStore.getState();
    const cUnshared = [...cState.lockedRoots, ...cState.unsharedRoots];

    let cShared = [];
    let cSynced = [];
    if (this.props.listSharedCollections) {
      cShared = cState.sharedRoots.flatMap((sharedR) => sharedR.children);
      cSynced = cState.syncInRoots
        .flatMap((syncInR) => syncInR.children)
        .filter(CollectionUtils.isWritable);
    }

    return [
      ...this.makeList(cUnshared),
      {
        label: 'Shared Collections',
        options: this.makeList(cShared),
      },
      {
        label: 'Synced Collections',
        options: this.makeList(cSynced),
      }
    ];
  }

  submitButton() {
    const { newLabel, selected } = this.state;
    const l = newLabel && newLabel.length;
    return l && l > 0 ? (
      <Button variant="warning" onClick={this.handleSubmit}>
        Create collection &lsquo;{newLabel}&rsquo; and Submit
      </Button>
    ) : (
      <Button variant="warning" onClick={this.handleSubmit} disabled={!selected}>
        Submit
      </Button>
    );
  }

  render() {
    const { title, onHide } = this.props;
    const { selected } = this.state;
    const options = this.collectionOptions();

    const optionLabel = ({ label, depth }) => (
      <span style={{ paddingLeft: `${depth * 10}px` }}>
        {label}
      </span>
    );

    return (
      <Modal show centered onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select a Collection</Form.Label>
              <Select
                options={options}
                value={selected}
                getOptionValue={(o) => o.id}
                formatOptionLabel={optionLabel}
                onChange={this.onSelectChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>or Create a new Collection</Form.Label>
              <Form.Control
                type="text"
                placeholder="-- Please insert collection name --"
                onChange={this.onInputChange}
              />
            </Form.Group>
            {this.submitButton()}
          </Form>
        </Modal.Body>
      </Modal>
    );
  }
}

ManagingModalCollectionActions.propTypes = {
  title: PropTypes.string.isRequired,
  action: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired,
  listSharedCollections: PropTypes.bool.isRequired,
};

/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import React from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Button, Dropdown
} from 'react-bootstrap';
import Aviator from 'aviator';
import UserStore from 'src/stores/alt/stores/UserStore';

const CollectionToggle = React.forwardRef(({
  onClick,
  labelsCount,
  totalSharedCollections,
}, ref) => (
  <Button
    ref={ref}
    size="xxsm"
    variant="secondary"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
  >
    <i className="fa fa-list" />
    {` ${labelsCount} `}
    {' | '}
    <i className="fa fa-share-alt" />
    {`${totalSharedCollections} `}
  </Button>
));
CollectionToggle.displayName = 'CollectionToggle';
CollectionToggle.propTypes = {
  onClick: PropTypes.func.isRequired,
  labelsCount: PropTypes.number.isRequired,
  totalSharedCollections: PropTypes.number.isRequired,
};

export default class ElementCollectionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    };

    this.handleOnClick = this.handleOnClick.bind(this);
  }

  handleOnClick(label, e, is_synchronized) {
    e.stopPropagation();

    const collectionUrl = is_synchronized ? '/scollection' : '/collection';
    const url = `${collectionUrl}/${label.id}/${this.state.element.type}/${this.state.element.id}`;

    Aviator.navigate(url);
  }

  formatItems(labels, is_synchronized) {
    return labels.map((label) => {
      if (is_synchronized && label.isOwner) {
        return (
          <Dropdown.Item key={label.id}>{label.name}</Dropdown.Item>
        );
      }
      return (
        <Dropdown.Item key={label.id} onClick={(e) => this.handleOnClick(label, e, is_synchronized)}>
          {label.name}
        </Dropdown.Item>
      );
    });
  }

  renderCollectionsItems(collectionName, labels, is_synchronized = false) {
    if (labels.length === 0) return null;
    return (
      <>
        <Dropdown.Header>{collectionName}</Dropdown.Header>
        {this.formatItems(labels, is_synchronized)}
      </>
    );
  }

  render() {
    const { element } = this.state;

    if (!element.tag || !element.tag.taggable_data || !element.tag.taggable_data.collection_labels) {
      return (<span />);
    }

    let { currentUser } = UserStore.getState();
    currentUser = currentUser || {};

    const { collection_labels } = element.tag.taggable_data;
    const shared_labels = [];
    const labels = [];
    const sync_labels = [];
    collection_labels.forEach((label) => {
      if (label) {
        if (!label.is_shared && !label.is_synchronized && label.user_id === currentUser.id) {
          labels.push(label);
        } else if (label.is_shared && !label.is_synchronized
          && (label.user_id === currentUser.id || label.shared_by_id === currentUser.id)) {
          shared_labels.push(label);
        } else if (label.is_synchronized && (label.user_id
          === currentUser.id || label.shared_by_id === currentUser.id)) {
          let isOwner = false;
          if (label.shared_by_id === currentUser.id) {
            isOwner = true;
          }
          sync_labels.push({ ...label, isOwner });
        }
      }
    });

    const total_shared_collections = shared_labels.length + sync_labels.length;

    if (labels.length === 0 && total_shared_collections === 0) { return (<span />); }

    return (
      <Dropdown>
        <Dropdown.Toggle
          as={CollectionToggle}
          id="dropdown-custom-components"
          labelsCount={labels.length}
          totalSharedCollections={total_shared_collections}
        />
        {createPortal(
          <Dropdown.Menu>
            {this.renderCollectionsItems('My Collections', labels)}
            {this.renderCollectionsItems('Shared Collections', shared_labels)}
            {this.renderCollectionsItems('Synchronized Collections', sync_labels, true)}
          </Dropdown.Menu>,
          document.body
        )}
      </Dropdown>
    );
  }
}

ElementCollectionLabels.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    type: PropTypes.string,
    tag: PropTypes.shape({
      taggable_data: PropTypes.shape({
        collection_labels: PropTypes.arrayOf(PropTypes.shape({
          id: PropTypes.number,
          name: PropTypes.string,
          is_shared: PropTypes.bool,
          is_synchronized: PropTypes.bool,
          user_id: PropTypes.number,
          shared_by_id: PropTypes.number,
        })),
      }),
    }),
  }).isRequired,
};

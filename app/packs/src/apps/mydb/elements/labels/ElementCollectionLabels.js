/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Label, OverlayTrigger, Popover, Button
} from 'react-bootstrap';
import Aviator from 'aviator';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class ElementCollectionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    };

    this.handleOnClick = this.handleOnClick.bind(this);
    this.preventOnClick = this.preventOnClick.bind(this);
  }

  handleOnClick(label, e, is_synchronized) {
    e.stopPropagation();

    const collectionUrl = is_synchronized ? '/scollection' : '/collection';
    const url = `${collectionUrl}/${label.id}/${this.state.element.type}/${this.state.element.id}`;

    Aviator.navigate(url);
  }

  preventOnClick(e) {
    e.stopPropagation();
  }

  labelStyle(label) {
    return label.is_shared ? 'warning' : 'info';
  }

  formatLabels(labels, is_synchronized) {
    return labels.map((label, index) => {
      if (is_synchronized && label.isOwner) {
        return (
          <span className="collection-label" key={index}>
            <Button disabled bsStyle="default" bsSize="xs">
              {label.name}
            </Button>
            &nbsp;
          </span>
        );
      }
      return (
        <span className="collection-label" key={index}>
          <Button bsStyle="default" bsSize="xs" onClick={(e) => this.handleOnClick(label, e, is_synchronized)}>
            {label.name}
          </Button>
          &nbsp;
        </span>
      );
    });
  }

  renderCollectionsLabels(collectionName, labels, is_synchronized = false) {
    if (labels.length === 0) return <span />;

    return (
      <div>
        <h3 className="popover-title">{collectionName}</h3>
        <div className="popover-content">
          {this.formatLabels(labels, is_synchronized)}
        </div>
      </div>
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

    const collectionOverlay = (
      <Popover className="collection-overlay" id="element-collections">
        {this.renderCollectionsLabels('My Collections', labels)}
        {this.renderCollectionsLabels('Shared Collections', shared_labels)}
        {this.renderCollectionsLabels('Synchronized Collections', sync_labels, true)}
      </Popover>
    );

    return (
      <div style={{ display: 'inline-block' }} onClick={this.preventOnClick}>
        <OverlayTrigger
          trigger="click"
          rootClose
          placement={this.props.placement}
          overlay={collectionOverlay}
        >
          <span className="collection-label" key={element.id}>
            <Label>
              <i className="fa fa-list" />
              {` ${labels.length} `}
              {' - '}
              {`${total_shared_collections} `}
              <i className="fa fa-share-alt" />
            </Label>
          </span>
        </OverlayTrigger>
      </div>
    );
  }
}

ElementCollectionLabels.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
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
  placement: PropTypes.string,
};

ElementCollectionLabels.defaultProps = {
  placement: 'left',
};

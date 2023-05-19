import React from 'react';
import { Label, OverlayTrigger, Popover, Button } from 'react-bootstrap';
import uuid from 'uuid';
import UserStore from 'src/stores/alt/stores/UserStore';
import { AviatorNavigation } from 'src/utilities/routesUtils';

export default class ElementCollectionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    };

    this.handleOnClick = this.handleOnClick.bind(this);
    this.preventOnClick = this.preventOnClick.bind(this);
  }

  handleOnClick(label, e) {
    e.stopPropagation();
    const { element } = this.state;
    AviatorNavigation({ collection: label, element });
  }

  preventOnClick(e) {
    e.stopPropagation();
  }

  labelStyle(label) {
    return label.is_shared ? "warning" : "info";
  }

  formatLabels(labels, isSync = false) {
    return labels.map((label) => (
      <span className="collection-label" key={uuid.v4()}>
        <Button
          disabled={isSync === true && label.isOwner === true}
          bsStyle="default" bsSize="xs"
          onClick={(e) => this.handleOnClick(label, e)}
        >
          {label.name}
        </Button>
        &nbsp;
      </span>
    ));
  }

  renderCollectionsLabels(collectionName, labels, isSync = false) {
    if (labels.length == 0) return <span />;

    return (
      <div>
        <h3 className="popover-title">{collectionName}</h3>
        <div className="popover-content">
          {this.formatLabels(labels, isSync)}
        </div>
      </div>
    );
  }

  render() {
    const { element } = this.state;

    if (!element.tag || !element.tag.taggable_data ||
        !element.tag.taggable_data.collection_labels)
      return (<span />);

    let { currentUser } = UserStore.getState();
    currentUser = currentUser || {};

    let placement = 'left';
    if (this.props.placement) placement = this.props.placement;

    let collection_labels = element.tag.taggable_data.collection_labels;
    let shared_labels = [];
    let labels = [];
    let sync_labels = [];
    collection_labels.map((label) => {
      if (label) {
        if (label.is_shared == false && label.is_synchronized == false && label.user_id == currentUser.id) {
          labels.push(label);
        } else if (label.is_shared == true && label.is_synchronized == false &&
          (label.user_id == currentUser.id || label.shared_by_id == currentUser.id)) {
          shared_labels.push(label);
        } else if (label.is_synchronized == true && (label.user_id == currentUser.id || label.shared_by_id == currentUser.id)) {
          let isOwner = false;
          if (label.shared_by_id === currentUser.id) {
            isOwner = true;
          }
          sync_labels.push({ ...label, isOwner });
        }
      }
    });

    let total_shared_collections = shared_labels.length + sync_labels.length;

    if (labels.length == 0 && total_shared_collections == 0)
      return (<span />);

    let collectionOverlay = (
      <Popover className="collection-overlay" id="element-collections">
        {this.renderCollectionsLabels("My Collections", labels)}
        {this.renderCollectionsLabels("Shared Collections", shared_labels)}
        {this.renderCollectionsLabels("Synchronized Collections", sync_labels, true)}
      </Popover>
    );

    return (
      <div style={{display: "inline-block"}} onClick={this.preventOnClick}>
        <OverlayTrigger
          trigger="click"
          rootClose
          placement={placement}
          overlay={collectionOverlay}
        >
          <span className="collection-label" key={element.id}>
            <Label>
              <i className="fa fa-list" />
              {" " + labels.length} {" - "}
              {total_shared_collections + " "} <i className="fa fa-share-alt" />
            </Label>
          </span>
        </OverlayTrigger>
      </div>
    );
  }
}

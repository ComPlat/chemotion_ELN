import React from 'react';
import { Label, OverlayTrigger, Popover, Button } from 'react-bootstrap';
import uuid from 'uuid';
import { AviatorNavigation } from 'src/utilities/routesUtils';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import SharedByIcon from 'src/components/common/SharedByIcon';

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

  formatLabels(collections) {
    return collections.map((collection) => (
      <span className="collection-label" key={uuid.v4()}>
        <Button
          disabled={(collection.acl?.length > 0) && collection.ownedByMe()}
          bsStyle="default" bsSize="xs"
          onClick={(e) => this.handleOnClick(collection, e)}
        >
          {collection.label}
          &nbsp;
          <SharedByIcon collection={collection}/>
        </Button>
        &nbsp;
      </span>
    ));
  }

  renderCollectionsLabels(collectionName, labels) {
    if (labels.length == 0) return <span />;

    return (
      <div>
        <h3 className="popover-title">{collectionName}</h3>
        <div className="popover-content">
          {this.formatLabels(labels)}
        </div>
      </div>
    );
  }

  render() {
    const { element } = this.state;

    if (!element.tag || !element.tag.taggable_data || !element.tag.taggable_data.collection_ids)
      return (<span />);

    let placement = 'left';
    if (this.props.placement) placement = this.props.placement;

    let collection_ids = element.tag.taggable_data?.collection_ids;
    let collections = [];
    collection_ids.forEach(id => collections.push(CollectionStore.findCollectionById(id)));

    let shared_labels = [];
    let labels = [];
    collections.map((collection) => {
      if (collection.ownedByMe()) {
        labels.push(collection);
      } else {
        shared_labels.push(collection);
      }
    });

    if (labels.length == 0 && shared_labels.length == 0)
      return (<span />);

    let collectionOverlay = (
      <Popover className="collection-overlay" id="element-collections">
        {this.renderCollectionsLabels("My Collections", labels)}
        {this.renderCollectionsLabels("Shared Collections", shared_labels)}
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
              {shared_labels.length + " "} <i className="fa fa-share-alt" />
            </Label>
          </span>
        </OverlayTrigger>
      </div>
    );
  }
}

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs } from 'react-bootstrap';
import { detailFooterButton } from 'src/apps/mydb/elements/details/DetailCardButton';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import Metadata from 'src/models/Metadata';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { StoreContext } from 'src/stores/mobx/RootStore';

import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import MetadataGeneral from 'src/components/metadata/MetadataGeneral';
import MetadataCreators from 'src/components/metadata/MetadataCreators';
import MetadataContributors from 'src/components/metadata/MetadataContributors';
import MetadataAlternateIdentifiers from 'src/components/metadata/MetadataAlternateIdentifiers';
import MetadataRelatedIdentifiers from 'src/components/metadata/MetadataRelatedIdentifiers';
import MetadataRightsList from 'src/components/metadata/MetadataRightsList';
import MetadataFundingReferences from 'src/components/metadata/MetadataFundingReferences';

export default class MetadataContainer extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { metadata } = props;
    this.state = {
      activeTab: 'general',
      metadata
    };

    this.handleAdd = this.handleAdd.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { metadata } = this.props;
    if (metadata !== prevProps.metadata) {
      this.setState({ metadata });
    }
  }

  handleAdd(field, index, subfield) {
    const { metadata } = this.state;
    metadata.add(field, index, subfield);
    this.setState({ metadata });
  }

  handleChange(value, field, index, subfield, subindex, subsubfield) {
    const { metadata } = this.state;
    metadata.change(value, field, index, subfield, subindex, subsubfield);
    this.setState({ metadata });
  }

  handleRemove(field, index, subfield, subindex) {
    const { metadata } = this.state;
    metadata.remove(field, index, subfield, subindex);
    this.setState({ metadata });
  }

  handleSelect(eventKey) {
    UIActions.selectTab({ tabKey: eventKey, type: 'screen' });
    this.setState({
      activeTab: eventKey
    });
  }

  handleSave() {
    const { metadata } = this.state;
    LoadingActions.start();
    // updateChecksum clears the dirty flag, which is what drives the Save button. It has to wait
    // for the request to come back: doing it synchronously here made a refused save look exactly
    // like a successful one — the button vanished and the edit was lost with nothing shown.
    ElementActions.storeMetadata(metadata)
      .then(() => {
        metadata.updateChecksum();
        this.setState({ metadata });
      })
      .catch((error) => {
        this.context.notifications.add({
          title: 'Collection metadata',
          message: error.message || 'The metadata could not be saved',
          level: 'error',
          autoDismiss: 5,
          position: 'tr',
          uid: 'collection_metadata',
        });
      });
  }

  handleClose() {
    const { metadata } = this.state;
    DetailActions.close(metadata, true);
  }

  render() {
    const { activeTab, metadata } = this.state;
    // Prefer the active collection (always loaded) when it is the one this
    // metadata belongs to; otherwise look it up in the loaded trees. Falling back
    // to currentCollection keeps the label on a deep-link/refresh into the
    // metadata route before the collection trees have been fetched.
    const { currentCollection } = UIStore.getState();
    const matchesCurrent = currentCollection != null
      && Number(currentCollection.id) === Number(metadata.collection_id);
    const collection = matchesCurrent
      ? currentCollection
      : this.context?.collections?.find(metadata.collection_id);
    const collectionLabel = collection?.label;
    const title = collectionLabel
      ? `DataCite/RADAR Metadata for collection "${collectionLabel}"`
      : 'DataCite/RADAR Metadata';
    const saveBtnDisplay = !!metadata.isEdited;
    const footerToolbar = saveBtnDisplay
      ? detailFooterButton({
        label: 'Save',
        iconClass: 'fa fa-floppy-o',
        variant: 'primary',
        onClick: this.handleSave,
      })
      : null;

    return (
      <DetailCard
        title={title}
        onClose={this.handleClose}
        footerToolbar={footerToolbar}
      >
        <div className="tabs-container--with-borders">
          <Tabs
            id="metadata-tabs"
            activeKey={activeTab}
            onSelect={(key) => this.handleSelect(key)}
            className="metadata-tabs"
          >
            <Tab eventKey="general" title="General">
              <MetadataGeneral
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
            </Tab>
            <Tab eventKey="creators" title="Creators">
              <MetadataCreators
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
            </Tab>
            <Tab eventKey="contributors" title="Contributors">
              <MetadataContributors
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
            </Tab>
            <Tab eventKey="identifiers" title="Identifiers">
              <MetadataRelatedIdentifiers
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
              <hr />
              <MetadataAlternateIdentifiers
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
            </Tab>
            <Tab eventKey="rights" title="Rights">
              <MetadataRightsList
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
            </Tab>
            <Tab eventKey="funding" title="Funding">
              <MetadataFundingReferences
                metadata={metadata.metadata}
                onAdd={this.handleAdd}
                onChange={this.handleChange}
                onRemove={this.handleRemove}
              />
            </Tab>
          </Tabs>
        </div>
      </DetailCard>
    );
  }
}

MetadataContainer.propTypes = {
  metadata: PropTypes.instanceOf(Metadata).isRequired
};

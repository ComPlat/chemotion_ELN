import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tabs, Tab } from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';
import Metadata from 'src/models/Metadata';
import UIStore from 'src/stores/alt/stores/UIStore';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import DetailCard from 'src/apps/mydb/elements/details/DetailCard';

import MetadataHeader from 'src/components/metadata/MetadataHeader';
import MetadataGeneral from 'src/components/metadata/MetadataGeneral';
import MetadataCreators from 'src/components/metadata/MetadataCreators';
import MetadataContributors from 'src/components/metadata/MetadataContributors';
import MetadataAlternateIdentifiers from 'src/components/metadata/MetadataAlternateIdentifiers';
import MetadataRelatedIdentifiers from 'src/components/metadata/MetadataRelatedIdentifiers';
import MetadataRightsList from 'src/components/metadata/MetadataRightsList';
import MetadataFundingReferences from 'src/components/metadata/MetadataFundingReferences';

export default class MetadataContainer extends Component {
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
    ElementActions.storeMetadata(metadata);
    metadata.updateChecksum();
    this.setState({ metadata });
  }

  handleClose() {
    const { metadata } = this.state;
    DetailActions.close(metadata, true);
  }

  render() {
    const { metadata } = this.state;
    const { currentCollection } = UIStore.getState();
    const title = currentCollection && `DataCite/RADAR Metadata for collection "${currentCollection.label}"`;
    const saveBtnDisplay = !!metadata.isEdited;

    return (
      <DetailCard
        header={(
          <MetadataHeader
            title={title}
            saveBtnDisplay={saveBtnDisplay}
            onSave={this.handleSave}
            onClose={this.handleClose}
          />
        )}
      >
        <div className="tabs-container--with-borders">
          <Tabs
            id="metadata-tabs"
            activeKey={this.state.activeTab}
            onSelect={key => this.handleSelect(key)}
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

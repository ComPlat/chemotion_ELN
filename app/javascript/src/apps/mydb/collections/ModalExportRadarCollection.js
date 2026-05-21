import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import AppModal from 'src/components/common/AppModal';
import UIStore from 'src/stores/alt/stores/UIStore';
import MetadataFetcher from 'src/fetchers/MetadataFetcher';
import { subjectAreas } from 'src/components/staticDropdownOptions/radar/subjectAreas';
import { contributorTypes } from 'src/components/staticDropdownOptions/radar/contributorTypes';
import { relatedIdentifierTypes } from 'src/components/staticDropdownOptions/radar/relatedIdentifierTypes';
import { relationTypes } from 'src/components/staticDropdownOptions/radar/relationTypes';
import { controlledRightsList } from 'src/components/staticDropdownOptions/radar/controlledRightsList';
import { funderIdentifierTypes } from 'src/components/staticDropdownOptions/radar/funderIdentifierTypes';

export default class ModalExportRadarCollection extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      metadata: null
    };

    this.handleEdit = this.handleEdit.bind(this);
    this.handlePublish = this.handlePublish.bind(this);
  }

  componentDidMount() {
    const { currentCollection } = UIStore.getState();

    MetadataFetcher.fetch(currentCollection.id)
      .then((result) => {
        this.setState({ metadata: result.metadata });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleEdit() {
    const { onHide, editAction } = this.props;

    editAction();

    setTimeout(() => {
      onHide();
    }, 1000);
  }

  handlePublish() {
    const { onHide } = this.props;
    const { currentCollection } = UIStore.getState();
    const archiveUrl = `/oauth/radar/archive?collection_id=${currentCollection.id}`;

    window.open(archiveUrl, '_blank', 'noopener,noreferrer');
    onHide();
  }

  isDisabled() {
    const { metadata } = this.state;
    return metadata === null || (
      metadata.title === undefined || metadata.title.length < 1
      || metadata.subjectAreas === undefined || metadata.subjectAreas.length < 1
      || metadata.creators === undefined || metadata.creators.length < 1
      || metadata.rightsHolders === undefined || metadata.rightsHolders.length < 1
      || metadata.rights === undefined || metadata.rights.length < 1
    );
  }

  renderMetadata() {
    const { metadata } = this.state;

    return (
      <div>
        {metadata.datasetUrl && (
          <div>
            <p>
              <strong>
                This collection has already been transferred to RADAR. You can transfer
                the collection again, but you may need to remove the existing dataset in
                RADAR first.
              </strong>
            </p>
            <dl>
              <dt>RADAR Dataset URL</dt>
              <dd>
                <a target="_blank" href={metadata.datasetUrl} rel="noreferrer">
                  {metadata.datasetUrl}
                </a>
              </dd>
              <dt>RADAR File URL</dt>
              <dd>
                <a target="_blank" href={metadata.fileUrl} rel="noreferrer">
                  {metadata.fileUrl}
                </a>
              </dd>
            </dl>
          </div>
        )}
        <dl>
          <dt>Title</dt>
          <dd>
            {metadata.title || <p className="text-danger">Please provide a title.</p>}
          </dd>
          <dt>Description</dt>
          <dd>{metadata.description}</dd>
          <dt>Subjects</dt>
          <dd>
            {metadata.subjectAreas ? (
              <ul>
                {metadata.subjectAreas.map((subjectArea) => {
                  const controlledSubjectArea = subjectAreas.find(
                    (option) => option.value === subjectArea.controlledSubjectAreaName
                  );

                  return (
                    <li key={subjectArea.controlledSubjectAreaName}>
                      {controlledSubjectArea?.label}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-danger">Please provide at least one subject area.</p>}
          </dd>
          <dt>Keywords</dt>
          <dd>
            {metadata.keywords ? (
              <ul>
                {metadata.keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            ) : <p>---</p>}
          </dd>
          <dt>Creators</dt>
          <dd>
            {metadata.creators ? (
              <ul>
                {metadata.creators.map((creator) => {
                  const creatorKey = [
                    creator.givenName,
                    creator.familyName,
                    creator.orcid,
                  ].filter(Boolean).join('-');
                  const affiliations = creator.affiliations
                    .map((affiliation) => affiliation.affiliation)
                    .join(', ');

                  return (
                    <li key={creatorKey}>
                      {creator.givenName}
                      {' '}
                      {creator.familyName}
                      {creator.orcid && `, ${creator.orcid}`}
                      {affiliations && `, ${affiliations}`}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-danger">Please provide at least one creator.</p>}
          </dd>
          <dt>Contributors</dt>
          <dd>
            {metadata.contributors ? (
              <ul>
                {metadata.contributors.map((contributor) => {
                  const contributorType = contributorTypes.find(
                    (option) => option.value === contributor.contributorType
                  );
                  const contributorKey = [
                    contributor.givenName,
                    contributor.familyName,
                    contributor.orcid,
                    contributor.contributorType,
                  ].filter(Boolean).join('-');
                  const affiliations = contributor.affiliations
                    .map((affiliation) => affiliation.affiliation)
                    .join(', ');

                  return (
                    <li key={contributorKey}>
                      {contributor.givenName}
                      {' '}
                      {contributor.familyName}
                      {contributorType?.label && `, ${contributorType.label}`}
                      {contributor.orcid && `, ${contributor.orcid}`}
                      {affiliations && `, ${affiliations}`}
                    </li>
                  );
                })}
              </ul>
            ) : <p>---</p>}
          </dd>
          <dt>Releated identifiers</dt>
          <dd>
            {metadata.relatedIdentifiers ? (
              <ul>
                {metadata.relatedIdentifiers.map((relatedIdentifier) => {
                  const relatedIdentifierType = relatedIdentifierTypes.find(
                    (option) => option.value === relatedIdentifier.relatedIdentifierType
                  );
                  const relationType = relationTypes.find(
                    (option) => option.value === relatedIdentifier.relationType
                  );
                  const relatedIdentifierKey = [
                    relatedIdentifier.relatedIdentifier,
                    relatedIdentifier.relatedIdentifierType,
                    relatedIdentifier.relationType,
                  ].filter(Boolean).join('-');

                  return (
                    <li key={relatedIdentifierKey}>
                      {relatedIdentifier.relatedIdentifier}
                      {relatedIdentifierType?.label && `, ${relatedIdentifierType.label}`}
                      {relationType?.label && `, ${relationType.label}`}
                    </li>
                  );
                })}
              </ul>
            ) : <p>---</p>}
          </dd>
          <dt>Alternative identifiers</dt>
          <dd>
            {metadata.alternateIdentifiers ? (
              <ul>
                {metadata.alternateIdentifiers.map((alternateIdentifier) => {
                  const alternateIdentifierKey = [
                    alternateIdentifier.alternateIdentifier,
                    alternateIdentifier.alternateIdentifierType,
                  ].filter(Boolean).join('-');

                  return (
                    <li key={alternateIdentifierKey}>
                      {alternateIdentifier.alternateIdentifier}
                      {`, ${alternateIdentifier.alternateIdentifierType}`}
                    </li>
                  );
                })}
              </ul>
            ) : <p>---</p>}
          </dd>
          <dt>Rights holder</dt>
          <dd>
            {metadata.rightsHolders ? (
              <ul>
                {metadata.rightsHolders.map((rightsHolder) => (
                  <li key={rightsHolder}>{rightsHolder}</li>
                ))}
              </ul>
            ) : <p className="text-danger">Please provide at least one rights holder.</p>}
          </dd>
          <dt>Rights</dt>
          <dd>
            {metadata.rights ? (
              <ul>
                {metadata.rights.map((rights) => {
                  const controlledRights = controlledRightsList.find(
                    (option) => option.value === rights.controlledRights
                  );
                  const rightsKey = [
                    rights.controlledRights,
                    rights.additionalRights,
                  ].filter(Boolean).join('-');

                  return (
                    <li key={rightsKey}>
                      {controlledRights?.label}
                      {rights.additionalRights && `, ${rights.additionalRights}`}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-danger">Please provide usage rights.</p>}
          </dd>
          <dt>Funding references</dt>
          <dd>
            {metadata.fundingReferences ? (
              <ul>
                {metadata.fundingReferences.map((fundingReference) => {
                  const funderIdentifierType = funderIdentifierTypes.find(
                    (option) => option.value === fundingReference.funderIdentifierType
                  );
                  const fundingReferenceKey = [
                    fundingReference.funderName,
                    fundingReference.funderIdentifier,
                    fundingReference.awardNumber,
                  ].filter(Boolean).join('-');

                  return (
                    <li key={fundingReferenceKey}>
                      {fundingReference.funderName}
                      {fundingReference.funderIdentifier && `, ${fundingReference.funderIdentifier}`}
                      {funderIdentifierType && `, ${funderIdentifierType.label}`}
                      {fundingReference.awardTitle && `, ${fundingReference.awardTitle}`}
                      {fundingReference.awardNumber && `, ${fundingReference.awardNumber}`}
                      {fundingReference.awardURI && `, ${fundingReference.awardURI}`}
                    </li>
                  );
                })}
              </ul>
            ) : <p>---</p>}
          </dd>
        </dl>
      </div>
    );
  }

  render() {
    const { onHide } = this.props;
    const { metadata } = this.state;
    const extendedFooter = (
      <Button onClick={this.handleEdit} variant="secondary">Edit collection metadata</Button>
    );

    return (
      <AppModal
        show
        onHide={onHide}
        title="Publish current collection via RADAR"
        extendedFooter={extendedFooter}
        primaryActionLabel="Publish in RADAR"
        onPrimaryAction={this.handlePublish}
        primaryActionDisabled={this.isDisabled()}
      >
        {!metadata ? (
          <p className="text-center">
            <i className="fa fa-refresh fa-spin fa-fw" />
          </p>
        ) : (
          <div className="export-collections-modal">
            {this.renderMetadata()}
          </div>
        )}
      </AppModal>
    );
  }
}

ModalExportRadarCollection.propTypes = {
  onHide: PropTypes.func.isRequired,
  editAction: PropTypes.func.isRequired
};

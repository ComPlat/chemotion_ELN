import React from 'react';
import { Button, ButtonToolbar } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import MetadataFetcher from 'src/fetchers/MetadataFetcher';
import { subjectAreas } from 'src/components/staticDropdownOptions/radar/subjectAreas'
import { contributorTypes } from 'src/components/staticDropdownOptions/radar/contributorTypes'
import { relatedIdentifierTypes } from 'src/components/staticDropdownOptions/radar/relatedIdentifierTypes'
import { relationTypes } from 'src/components/staticDropdownOptions/radar/relationTypes'
import { controlledRightsList } from 'src/components/staticDropdownOptions/radar/controlledRightsList'
import { funderIdentifierTypes } from 'src/components/staticDropdownOptions/radar/funderIdentifierTypes'

export default class ModalExportRadarCollection extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      processing: false,
      metadata: null
    }

    this.handleEdit = this.handleEdit.bind(this)
  }

  componentDidMount() {
    const { currentCollection } = UIStore.getState()

    MetadataFetcher.fetch(currentCollection.id)
      .then((result) => {
        this.setState({ metadata: result.metadata })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleEdit() {
    const { onHide, editAction } = this.props;

    editAction()

    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1000);
  }

  renderMetadata() {
    const { metadata } = this.state
    return (
      <div>
        {metadata.datasetUrl && <div>
          <p>
            <strong>This collection has already been transferred to RADAR. You can transfer the collection again, but you may need to remove the existing dataset in RADAR first.</strong>
          </p>
          <dl>
            <dt>RADAR Dataset URL</dt>
            <dd>
              <a target="_blank" href={metadata.datasetUrl}>{metadata.datasetUrl}</a>
            </dd>
            <dt>RADAR File URL</dt>
            <dd>
              <a target="_blank" href={metadata.fileUrl}>{metadata.fileUrl}</a>
            </dd>
          </dl>
        </div>}
        <dl>
          <dt>Title</dt>
          <dd>
            {metadata.title || <p className="text-danger">Please provide a title.</p>}
          </dd>
          <dt>Description</dt>
          <dd>{metadata.description}</dd>
          <dt>Subjects</dt>
          <dd>
            {
              metadata.subjectAreas ? <ul>
              {
                metadata.subjectAreas.map((subjectArea, index) => {
                  const controlledSubjectAreaName = subjectAreas.find(el => el.value == subjectArea.controlledSubjectAreaName)
                  return (
                    <li key={index}>{controlledSubjectAreaName.label}</li>
                  )
                })
              }
              </ul> : <p className="text-danger">Please provide at least one subject area.</p>
            }
          </dd>
          <dt>Keywords</dt>
          <dd>
            {
              metadata.keywords ? <ul>
              {
                metadata.keywords.map((keyword, index) => (
                  <li key={index}>{keyword}</li>
                ))
              }
              </ul> : <p>---</p>
            }
          </dd>
          <dt>Creators</dt>
          <dd>
            {
              metadata.creators ? <ul>
              {
                metadata.creators.map((creator, index) => (
                  <li key={index}>
                    {creator.givenName} {creator.familyName}
                    {creator.orcid && `, ${creator.orcid}`}
                    {creator.affiliations.length > 0 && `, ${creator.affiliations.map(
                      affiliation => affiliation.affiliation
                    ).join(', ')}`}
                  </li>
                ))
              }
              </ul> : <p className="text-danger">Please provide at least one creator.</p>
            }
          </dd>
          <dt>Contributors</dt>
          <dd>
            {
              metadata.contributors ? <ul>
              {
                metadata.contributors.map((contributor, index) => {
                  const contributorType = contributorTypes.find(el => el.value == contributor.contributorType)

                  return (
                    <li key={index}>
                      {contributor.givenName} {contributor.familyName}, {contributorType?.label}
                      {contributor.orcid && `, ${contributor.orcid}`}
                      {contributor.affiliations.length > 0 && `, ${contributor.affiliations.map(
                        affiliation => affiliation.affiliation
                      ).join(', ')}`}
                    </li>
                  )
                })
              }
              </ul> : <p>---</p>
            }
          </dd>
          <dt>Releated identifiers</dt>
          <dd>
            {
              metadata.relatedIdentifiers ? <ul>
              {
                metadata.relatedIdentifiers.map((relatedIdentifier, index) => {
                  const relatedIdentifierType = relatedIdentifierTypes.find(el => el.value == relatedIdentifier.relatedIdentifierType)
                  const relationType = relationTypes.find(el => el.value == relatedIdentifier.relationType)

                  return (
                    <li key={index}>
                      {relatedIdentifier.relatedIdentifier}{', '}{relatedIdentifierType.label}{', '}{relationType.label}
                    </li>
                  )
                })
              }
              </ul> : <p>---</p>
            }
          </dd>
          <dt>Alternative identifiers</dt>
          <dd>
            {
              metadata.alternateIdentifiers ? <ul>
              {
                metadata.alternateIdentifiers.map((alternateIdentifier, index) => (
                  <li key={index}>
                    {alternateIdentifier.alternateIdentifier}{', '}{alternateIdentifier.alternateIdentifierType}
                  </li>
                ))
              }
              </ul> : <p>---</p>
            }
          </dd>
          <dt>Rights holder</dt>
          <dd>
            {
              metadata.rightsHolders ? <ul>
              {
                metadata.rightsHolders.map((rightsHolder, index) => (
                  <li key={index}>{rightsHolder}</li>
                ))
              }
              </ul> : <p className="text-danger">Please provide at least one rights holder.</p>
            }
          </dd>
          <dt>Rights</dt>
          <dd>
            {
              metadata.rights ? <ul>
              {
                metadata.rights.map((rights, index) => {
                  const controlledRights = controlledRightsList.find(el => el.value == rights.controlledRights)
                  return (
                    <li key={index}>
                      {controlledRights.label}
                      {rights.additionalRights && `, ${rights.additionalRights}`}
                    </li>
                  )
                })
              }
              </ul> : <p className="text-danger">Please provide usage rights.</p>
            }
          </dd>
          <dt>Funding references</dt>
          <dd>
            {
              metadata.fundingReferences ? <ul>
              {
                metadata.fundingReferences.map((fundingReference, index) => {
                  const funderIdentifierType = funderIdentifierTypes.find(el => el.value == fundingReference.funderIdentifierType)

                  return (
                    <li key={index}>
                      {fundingReference.funderName}
                      {fundingReference.funderIdentifier && `, ${fundingReference.funderIdentifier}`}
                      {funderIdentifierType && `, ${funderIdentifierType.label}`}
                      {fundingReference.awardTitle && `, ${fundingReference.awardTitle}`}
                      {fundingReference.awardNumber && `, ${fundingReference.awardNumber}`}
                      {fundingReference.awardURI && `, ${fundingReference.awardURI}`}
                    </li>
                  )
                })
              }
              </ul> : <p>---</p>
            }
          </dd>
        </dl>
      </div>
    )
  }

  renderButtonBar() {
    const { onHide } = this.props;
    const { metadata } = this.state;
    const { currentCollection } = UIStore.getState()
    const archiveUrl = `/oauth/radar/archive?collection_id=${currentCollection.id}`

    return (
      <ButtonToolbar className="justify-content-end gap-1">
        <Button variant="primary" onClick={onHide}>Cancel</Button>
        <Button onClick={this.handleEdit}>Edit collection metadata</Button>
        <a href={archiveUrl} target="_blank"
          className="btn btn-danger"
          disabled={this.isDisabled()}
          title="Publish in RADAR"
          onClick={onHide}
        >
          <i className="fa fa-file-text-o" />
          {' '}
          Publish in RADAR
        </a>
      </ButtonToolbar>
    );
  }

  isDisabled() {
    const { processing, metadata } = this.state;
    return processing === true || metadata === null || (
      metadata.title === undefined || metadata.title.length < 1 ||
      metadata.subjectAreas === undefined || metadata.subjectAreas.length < 1 ||
      metadata.creators === undefined || metadata.creators.length < 1 ||
      metadata.rightsHolders === undefined || metadata.rightsHolders.length < 1 ||
      metadata.rights === undefined || metadata.rights.length < 1
    );
  }

  render() {
    const { full } = this.props
    const { metadata } = this.state
    const onChange = (v) => this.setState(
      previousState => {return { ...previousState, value: v }}
    )

    if (metadata) {
      return (
        <div className="export-collections-modal">
          {this.renderMetadata()}
          {this.renderButtonBar()}
        </div>
      )
    } else {
      return <p className="text-center"><i className="fa fa-refresh fa-spin fa-fw" /></p>
    }
  }
}

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  PanelGroup,
  Panel,
  Button,
} from 'react-bootstrap';
import { startsWith, filter, map, flatMap } from 'lodash';
import Container from '../models/Container';
import ContainerComponent from '../ContainerComponent';
import QuillViewer from '../QuillViewer';
import ImageModal from '../common/ImageModal';
import { previewContainerImage } from './../utils/imageHelper';

export default class ResearchPlanDetailsContainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeContainer: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
  }

  handleChange() {
    const { researchPlan } = this.props;
    this.props.parent.handleResearchPlanChange(researchPlan);
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  handleRemove(container) {
    const { researchPlan } = this.props;
    container.is_deleted = true;
    this.props.parent.handleResearchPlanChange(researchPlan);
  }

  handleUndo(container) {
    const { researchPlan } = this.props;
    container.is_deleted = false;
    this.props.parent.handleResearchPlanChange(researchPlan);
  }

  handleAdd() {
    const { researchPlan } = this.props;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';
    container.extended_metadata.content = { ops: [{ insert: '' }] };

    if (researchPlan.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      researchPlan.container.children.push(analyses);
    }

    researchPlan.container.children.filter(element => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.push(container);

    const newKey = researchPlan.container.children.filter(element => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.length - 1;

    this.handleAccordionOpen(newKey);
    this.props.parent.handleResearchPlanChange(researchPlan);
  }

  headerBtnGroup(container, readOnly) {
    return (
      <div className="upper-btn">
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          className="button-right"
          disabled={readOnly}
          onClick={() => this.handleRemove(container)}
        >
          <i className="fa fa-trash" />
        </Button>
      </div>
    );
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <Button
          className="button-right"
          bsSize="xsmall"
          bsStyle="success"
          onClick={this.handleAdd}
        >
          Add analysis
        </Button>
      );
    }

    return (<span />);
  }

  render() {
    const { researchPlan, readOnly } = this.props;
    const { activeContainer } = this.state;

    const containerHeader = (container) => {
      let kind = container.extended_metadata.kind || '';
      kind = (kind.split('|')[1] || kind).trim();
      const previewImg = previewContainerImage(container);
      const status = container.extended_metadata.status || '';
      const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
      const contentOneLine = {
        ops: content.ops.map((x) => {
          const c = Object.assign({}, x);
          if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
          return c;
        }),
      };
      let hasPop = true;
      let fetchNeeded = false;
      let fetchId = 0;
      if (container.preview_img && container.preview_img !== undefined && container.preview_img !== 'not available') {
        const containerAttachments = filter(container.children, o => o.attachments.length > 0);
        const atts = flatMap(map(containerAttachments, 'attachments'));
        const imageThumb = filter(atts, o => o.thumb === true && startsWith(o.content_type, 'image/'));
        if (imageThumb && imageThumb.length > 0) {
          fetchNeeded = true;
          fetchId = imageThumb[0].id;
        }
      } else {
        hasPop = false;
      }

      return (
        <div className="analysis-header order" style={{ width: '100%' }}>
          <div className="preview">
            <ImageModal
              hasPop={hasPop}
              preivewObject={{
                src: previewImg
              }}
              popObject={{
                title: container.name,
                src: previewImg,
                fetchNeeded,
                fetchId
              }}
            />
          </div>
          <div className="abstract">
            {
              this.headerBtnGroup(container, readOnly)
            }
            <div className="lower-text">
              <div className="main-title">{container.name}</div>
              <div className="sub-title">Type: {kind}</div>
              <div className="sub-title">Status: {status}</div>

              <div className="desc sub-title">
                <span style={{ float: 'left', marginRight: '5px' }}>
                  Content:
                </span>
                <QuillViewer value={contentOneLine} preview />
              </div>

            </div>
          </div>
        </div>
      );
    };

    const containerHeaderDeleted = (container) => {
      const kind = container.extended_metadata.kind && container.extended_metadata.kind !== '';
      const titleKind = kind ? (` - Type: ${(container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind).trim()}`) : '';

      const status = container.extended_metadata.status && container.extended_metadata.status !== '';
      const titleStatus = status ? (` - Status: ${container.extended_metadata.status}`) : '';

      return (
        <div style={{ width: '100%' }}>
          <strike>
            {container.name}
            {titleKind}
            {titleStatus}
          </strike>
          <Button
            className="pull-right"
            bsSize="xsmall"
            bsStyle="danger"
            onClick={() => this.handleUndo(container)}
          >
            <i className="fa fa-undo" />
          </Button>
        </div>
      );
    };

    if (researchPlan.container != null && researchPlan.container.children) {
      const analysesContainer = researchPlan.container.children.filter(element => (
        ~element.container_type.indexOf('analyses')
      ));

      if (analysesContainer.length === 1 && analysesContainer[0].children.length > 0) {
        return (
          <div>
            <div style={{ marginBottom: '10px' }}>
              &nbsp;{this.addButton()}
            </div>
            <PanelGroup id="research_plan-analyses-panel" defaultActiveKey={0} activeKey={activeContainer} onSelect={this.handleAccordionOpen} accordion>
              {analysesContainer[0].children.map((container, key) => {
                if (container.is_deleted) {
                  return (
                    <Panel
                      eventKey={key}
                      key={`research_plan_container_deleted_${container.id}`}
                    >
                      <Panel.Heading>{containerHeaderDeleted(container)}</Panel.Heading>
                    </Panel>
                  );
                }

                return (
                  <Panel
                    eventKey={key}
                    key={`research_plan_container_${container.id}`}
                  >
                    <Panel.Heading>
                      <Panel.Title toggle>
                        {containerHeader(container)}
                      </Panel.Title>
                    </Panel.Heading>
                    <Panel.Body collapsible>
                      <ContainerComponent
                        readOnly={readOnly}
                        disabled={readOnly}
                        container={container}
                        onChange={this.handleChange}
                      />
                    </Panel.Body>
                  </Panel>
                );
              })}
            </PanelGroup>
          </div>
        );
      }

      return (
        <div
          style={{ marginBottom: '10px' }}
          className="noAnalyses-warning"
        >
          There are currently no Analyses.
          {this.addButton()}
        </div>
      );
    }

    return (
      <div className="noAnalyses-warning">
        There are currently no Analyses.
      </div>
    );
  }
}

ResearchPlanDetailsContainers.propTypes = {
  researchPlan: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired,
  parent: PropTypes.object.isRequired,
};

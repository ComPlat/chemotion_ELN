import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PanelGroup, Panel, Tooltip, Button, OverlayTrigger, SplitButton, ButtonGroup, MenuItem } from 'react-bootstrap';
import { filter } from 'lodash';
import Container from '../models/Container';
import ContainerComponent from '../ContainerComponent';
import QuillViewer from '../QuillViewer';
import ImageModal from '../common/ImageModal';
import { previewContainerImage } from './../utils/imageHelper';
import { JcampIds, BuildSpcInfos } from '../utils/SpectraHelper';
import UIStore from '../stores/UIStore';
import SpectraActions from '../actions/SpectraActions';
import LoadingActions from '../actions/LoadingActions';
import ViewSpectra from '../ViewSpectra';

const SpectraEditorBtn = ({
  element, spcInfo, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate,
}) => (
  <OverlayTrigger
    placement="bottom"
    delayShow={500}
    overlay={<Tooltip id="spectra">Spectra Editor {!spcInfo ? ': Reprocess' : ''}</Tooltip>}
  >{spcInfo ? (
    <ButtonGroup className="button-right">
      <SplitButton
        id="spectra-editor-split-button"
        pullRight
        bsStyle="info"
        bsSize="xsmall"
        title={<i className="fa fa-area-chart" />}
        onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
        onClick={toggleSpectraModal}
        disabled={!spcInfo || !hasChemSpectra}
      >
        <MenuItem
          id="regenerate-spectra"
          key="regenerate-spectra"
          onSelect={(eventKey, event) => {
            event.stopPropagation();
            confirmRegenerate(event);
          }}
          disabled={!hasJcamp || !element.can_update}
        >
          <i className="fa fa-refresh" /> Reprocess
        </MenuItem>
      </SplitButton>
    </ButtonGroup>
  ) : (
    <Button
      bsStyle="warning"
      bsSize="xsmall"
      className="button-right"
      onClick={confirmRegenerate}
      disabled={false}
    >
      <i className="fa fa-area-chart" /><i className="fa fa-refresh " />
    </Button>
    )}
  </OverlayTrigger>
);


SpectraEditorBtn.propTypes = {
  element: PropTypes.object,
  hasJcamp: PropTypes.bool,
  spcInfo: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]),
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
  confirmRegenerate: PropTypes.func.isRequired,
};

SpectraEditorBtn.defaultProps = {
  hasJcamp: false,
  spcInfo: false,
  element: {},
  hasChemSpectra: false,
};

export default class ResearchPlanDetailsContainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeContainer: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSpChange = this.handleSpChange.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
  }

  handleChange() {
    const { researchPlan } = this.props;
    this.props.parent.handleResearchPlanChange(researchPlan);
  }

  handleSpChange(researchPlan, cb) {
    this.props.parent.handleResearchPlanChange(researchPlan);
    cb();
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
    const { researchPlan } = this.props;
    const jcampIds = JcampIds(container);
    const hasJcamp = jcampIds.orig.length > 0;
    const confirmRegenerate = (e) => {
      e.stopPropagation();
      if (confirm('Regenerate spectra?')) {
        LoadingActions.start();
        SpectraActions.Regenerate(jcampIds, this.handleChange);
      }
    };
    const spcInfo = BuildSpcInfos(researchPlan, container);
    const { hasChemSpectra } = UIStore.getState();
    const toggleSpectraModal = (e) => {
      e.stopPropagation();
      SpectraActions.ToggleModal();
      SpectraActions.LoadSpectra.defer(spcInfo);
    };
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
        <SpectraEditorBtn
          element={researchPlan}
          hasJcamp={hasJcamp}
          spcInfo={spcInfo}
          hasChemSpectra={hasChemSpectra}
          toggleSpectraModal={toggleSpectraModal}
          confirmRegenerate={confirmRegenerate}
        />
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

      let ttlIns = [];
      if (container.children && container.children.length > 0) {
        ttlIns = filter(container.children, o => o.extended_metadata && o.extended_metadata.instrument && o.extended_metadata.instrument.trim().length > 0);
      }
      const insText = container.children && container.children.length > 0 ? ` Instrument: ${ttlIns.length}/${container.children.length}` : '';

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
      if (previewImg.startsWith('data:image')) {
        fetchNeeded = true;
        fetchId = container.preview_img.id;
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
              <div className="sub-title">Status: {status} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {insText}</div>

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
                      <ViewSpectra
                        sample={this.props.researchPlan}
                        handleSampleChanged={this.handleSpChange}
                        handleSubmit={this.props.handleSubmit}
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
  handleSubmit: PropTypes.func
};

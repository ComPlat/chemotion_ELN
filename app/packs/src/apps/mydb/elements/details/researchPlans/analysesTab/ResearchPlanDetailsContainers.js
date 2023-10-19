import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PanelGroup, Panel, Tooltip, Button, OverlayTrigger, SplitButton, ButtonGroup, MenuItem } from 'react-bootstrap';
import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import QuillViewer from 'src/components/QuillViewer';
import ImageModal from 'src/components/common/ImageModal';
import { instrumentText } from 'src/utilities/ElementUtils';
import { previewContainerImage } from 'src/utilities/imageHelper';
import { JcampIds, BuildSpcInfos, BuildSpcInfosForNMRDisplayer, isNMRKind } from 'src/utilities/SpectraHelper';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

const SpectraEditorBtn = ({
  element, spcInfos, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate,
  toggleNMRDisplayerModal, hasNMRium,
}) => (
  <span>
  <OverlayTrigger
    placement="bottom"
    delayShow={500}
    overlay={<Tooltip id="spectra">Spectra Editor {spcInfos.length > 0 ? '' : ': Reprocess'}</Tooltip>}
  >{spcInfos.length > 0 ? (
    <ButtonGroup className="button-right">
      <SplitButton
        id="spectra-editor-split-button"
        pullRight
        bsStyle="info"
        bsSize="xsmall"
        title={<i className="fa fa-area-chart" />}
        onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
        onClick={toggleSpectraModal}
        disabled={!(spcInfos.length > 0) || !hasChemSpectra}
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
          disabled={!hasJcamp || !element.can_update || !hasChemSpectra}
        >
          <i className="fa fa-area-chart" /><i className="fa fa-refresh " />
      </Button>
    )}
    </OverlayTrigger>
    {
      hasNMRium ? (
        <OverlayTrigger
          placement="top"
          delayShow={500}
          overlay={<Tooltip id="spectra_nmrium_wrapper">Process with NMRium</Tooltip>}
        >
          <ButtonGroup className="button-right">
            <Button
              id="spectra-editor-split-button"
              pullRight
              bsStyle="info"
              bsSize="xsmall"
              onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
              onClick={toggleNMRDisplayerModal}
              disabled={!hasJcamp}
            >
              <i className="fa fa-bar-chart"/>
            </Button>
          </ButtonGroup>
        </OverlayTrigger>
      ) : null
    }
  </span>
);


SpectraEditorBtn.propTypes = {
  element: PropTypes.object,
  hasJcamp: PropTypes.bool,
  spcInfos: PropTypes.array,
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
  confirmRegenerate: PropTypes.func.isRequired,
  toggleNMRDisplayerModal: PropTypes.func.isRequired,
  hasNMRium: PropTypes.bool,
};

SpectraEditorBtn.defaultProps = {
  hasJcamp: false,
  spcInfos: PropTypes.array,
  element: {},
  hasChemSpectra: false,
  hasNMRium: false,
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

  componentDidMount() {
    TextTemplateActions.fetchTextTemplates('researchPlan');
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
    const spcInfos = BuildSpcInfos(researchPlan, container);
    const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
    const toggleSpectraModal = (e) => {
      e.stopPropagation();
      SpectraActions.ToggleModal();
      SpectraActions.LoadSpectra.defer(spcInfos);
    };

    //process open NMRium
    const toggleNMRDisplayerModal = (e) => {
      const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(researchPlan, container);
      e.stopPropagation();
      SpectraActions.ToggleModalNMRDisplayer();
      SpectraActions.LoadSpectraForNMRDisplayer.defer(spcInfosForNMRDisplayer); // going to fetch files base on spcInfos
    }

    const { chmos } = UserStore.getState();
    const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;

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
          spcInfos={spcInfos}
          hasChemSpectra={hasChemSpectra}
          toggleSpectraModal={toggleSpectraModal}
          confirmRegenerate={confirmRegenerate}
          toggleNMRDisplayerModal={toggleNMRDisplayerModal}
          hasNMRium={hasNMRium}
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
      const insText = instrumentText(container);
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
              previewObject={{
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
                        templateType="researchPlan"
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
                      <NMRiumDisplayer
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

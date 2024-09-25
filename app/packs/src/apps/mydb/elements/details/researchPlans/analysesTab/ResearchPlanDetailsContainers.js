import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Accordion } from 'react-bootstrap';
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
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';
import { truncateText } from 'src/utilities/textHelper';

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
    const { researchPlan, handleResearchPlanChange } = this.props;
    handleResearchPlanChange(researchPlan);
  }

  handleSpChange(researchPlan, cb) {
    const { handleResearchPlanChange } = this.props;
    handleResearchPlanChange(researchPlan);
    cb();
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  handleRemove(container) {
    const { researchPlan, handleResearchPlanChange } = this.props;
    container.is_deleted = true;
    handleResearchPlanChange(researchPlan);
  }

  handleUndo(container) {
    const { researchPlan, handleResearchPlanChange } = this.props;
    container.is_deleted = false;
    handleResearchPlanChange(researchPlan);
  }

  handleAdd() {
    const { researchPlan, handleResearchPlanChange } = this.props;
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
    handleResearchPlanChange(researchPlan);
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
      <div className="d-flex justify-content-between align-items-center mb-0">
        <SpectraEditorButton
          element={researchPlan}
          hasJcamp={hasJcamp}
          spcInfos={spcInfos}
          hasChemSpectra={hasChemSpectra}
          toggleSpectraModal={toggleSpectraModal}
          confirmRegenerate={confirmRegenerate}
          toggleNMRDisplayerModal={toggleNMRDisplayerModal}
          hasNMRium={hasNMRium}
        />
        <Button
          size="xxsm"
          variant="danger"
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
        <div className="mt-2">
          <Button
            size="sm"
            variant="success"
            onClick={this.handleAdd}
          >
            Add analysis
          </Button>
        </div>
      );
    }

    return null;
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
          if (c.insert) c.insert = truncateText(c.insert.replace(/\n/g, ' '), 100);
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
        <div className="d-flex w-100 mb-0 bg-gray-200">
          <div className="p-3">
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
          <div className="d-flex flex-column justify-content-start ms-1 my-3 flex-grow-1">
            <div className="fs-5 fw-bold ms-2 text-truncate text-decoration-underline">{container.name}</div>
            <div className="fs-6 ms-2 mt-2">Type: {kind}</div>
            <div className="fs-6 ms-2 mt-2">Status: {status}
              <span className="me-5" />
              {insText}
            </div>

            <div className="fs-6 ms-2 mt-2 d-flex p-0">
              <span className="me-2 flex-grow-1 text-truncate">
                Content:
                <QuillViewer value={contentOneLine} preview />
              </span>
            </div>

          </div>
          <div className="d-flex align-items-start justify-content-end me-2 mt-3">
            {
              this.headerBtnGroup(container, readOnly)
            }

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
        <div className="d-flex w-100 mb-0 bg-gray-200 p-4 align-items-center">
          <span className="flex-grow-1 text-decoration-line-through">
            {container.name}
            {titleKind}
            {titleStatus}
          </span>
          <Button
            className="ml-auto"
            size="sm"
            variant="danger"
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
            <div className="mb-2 me-1 d-flex justify-content-end">
              {this.addButton()}
            </div>
            <Accordion defaultActiveKey={['0']} alwaysOpen>
              {analysesContainer[0].children.map((container, key) => {
                if (container.is_deleted) {
                  return (
                    <Accordion.Item
                      eventKey={key}
                      key={`research_plan_container_deleted_${container.id}`}
                    >
                      <Accordion.Header>{containerHeaderDeleted(container)}</Accordion.Header>
                    </Accordion.Item>
                  );
                }

                return (
                  <Accordion.Item
                    eventKey={key}
                    key={`research_plan_container_${container.id}`}
                  >
                    <Accordion.Header>
                        {containerHeader(container)}
                    </Accordion.Header>
                    <Accordion.Body>
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
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </div>
        );
      }

      return (
        <div className="d-flex align-items-center justify-content-between mb-2 mt-4 mx-3">
          <span className="ms-3"> There are currently no Analyses. </span>
          <div>
            {this.addButton()}
          </div>
        </div>
      );
    }

    return (
      <div className="m-4">
        There are currently no Analyses.
      </div>
    );
  }
}

ResearchPlanDetailsContainers.propTypes = {
  researchPlan: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired,
  handleResearchPlanChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func
};

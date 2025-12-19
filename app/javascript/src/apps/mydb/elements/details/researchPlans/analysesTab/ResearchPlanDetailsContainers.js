import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Accordion,
  Card,
  ButtonToolbar
} from 'react-bootstrap';
import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import QuillViewer from 'src/components/QuillViewer';
import ImageModal from 'src/components/common/ImageModal';
import { instrumentText } from 'src/utilities/ElementUtils';
import { getAttachmentFromContainer } from 'src/utilities/imageHelper';
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
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

export default class ResearchPlanDetailsContainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeContainer: 0,
      commentBoxVisible: false,
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
      <div className="d-flex justify-content-between align-items-center mb-0 gap-1">
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

  handleCommentTextChange = (e) => {
    const { researchPlan } = this.props;
    if (!researchPlan.container) {
      researchPlan.container = Container.buildEmpty();
    }
    researchPlan.container.description = e.target.value;
    this.handleChange(researchPlan);
  };

  toggleCommentBox = () => {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  };

  render() {
    const { researchPlan, readOnly } = this.props;
    const { activeContainer, commentBoxVisible } = this.state;

    const containerHeader = (container) => {
      let kind = container.extended_metadata.kind || '';
      kind = (kind.split('|')[1] || kind).trim();
      const insText = instrumentText(container);
      const status = container.extended_metadata.status || '';
      const content = container.extended_metadata.content || { ops: [{ insert: '' }] };

      const contentOneLine = {
        ops: content.ops.map((x) => {
          const c = Object.assign({}, x);
          if (c.insert) c.insert = truncateText(c.insert.replace(/\n/g, ' '), 100);
          return c;
        }),
      };
      const attachment = getAttachmentFromContainer(container);

      return (
        <div className="analysis-header w-100 d-flex gap-3 lh-base">
          <div className="preview border d-flex align-items-center">
            <ImageModal
              attachment={attachment}
              popObject={{
                title: container.name,
              }}
            />
          </div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <h4 className="flex-grow-1">{container.name}</h4>
              {
                this.headerBtnGroup(container, readOnly)
              }
            </div>
            <div className="text-body-tertiary">
              Type: {kind}
              <br />
              Status: {status}
              <span className="me-5" />
              {insText}
            </div>
            <div className="d-flex gap-2">
              <span>Content:</span>
              <div className="flex-grow-1">
                <QuillViewer value={contentOneLine} className="p-0" preview />
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
        <div className="d-flex w-100 mb-0 align-items-center">
          <strike className="flex-grow-1">
            {container.name}
            {titleKind}
            {titleStatus}
          </strike>
          <Button
            className="ms-auto"
            size="xsm"
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
            <div className="my-2 mx-3 d-flex justify-content-end">
              <ButtonToolbar className="gap-1">
                <div className="mt-2">
                  <CommentButton toggleCommentBox={this.toggleCommentBox} size="sm" />
                </div>
                {this.addButton()}
              </ButtonToolbar>
            </div>
            <CommentBox
              isVisible={commentBoxVisible}
              value={researchPlan.container.description}
              handleCommentTextChange={this.handleCommentTextChange}
            />
            <Accordion
              className="border rounded overflow-hidden"
              onSelect={this.handleAccordionOpen}
              activeKey={activeContainer}
            >
              {analysesContainer[0].children.map((container, key) => {
                const isFirstTab = key === 0;
                return (
                  <Card
                    eventKey={key}
                    key={`research_plan_container_${container.id}`}
                    className={`rounded-0 border-0 ${isFirstTab ? '' : ' border-top'}`}
                  >
                    <Card.Header className="rounded-0 p-0 border-bottom-0">
                      <AccordionHeaderWithButtons eventKey={key}>
                        {container.is_deleted ? containerHeaderDeleted(container) : containerHeader(container)}
                      </AccordionHeaderWithButtons>
                    </Card.Header>

                    {!container.is_deleted && (
                      <Accordion.Collapse eventKey={key}>
                        <Card.Body>
                          <ContainerComponent
                            templateType="researchPlan"
                            element={researchPlan}
                            readOnly={readOnly}
                            disabled={readOnly}
                            container={container}
                            onChange={this.handleChange}
                            rootContainer={researchPlan.container}
                            index={key}
                          />
                        </Card.Body>
                      </Accordion.Collapse>
                    )}
                  </Card>
                );
              })}
            </Accordion>
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
          </div>
        );
      }

      return (
        <div>
          <div className="d-flex align-items-center justify-content-between my-2 mx-3">
            <span className="ms-3"> There are currently no Analyses. </span>
            <ButtonToolbar className="gap-2">
              <CommentButton toggleCommentBox={this.toggleCommentBox} size="sm" />
              {this.addButton()}
            </ButtonToolbar>
          </div>
          <CommentBox
            isVisible={commentBoxVisible}
            value={researchPlan.container.description}
            handleCommentTextChange={this.handleCommentTextChange}
          />
        </div>
      );
    }

    return (
      <div className="m-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span>There are currently no Analyses.</span>
          <ButtonToolbar className="gap-2">
            <CommentButton toggleCommentBox={this.toggleCommentBox} size="sm" />
          </ButtonToolbar>
        </div>
        <CommentBox
          isVisible={commentBoxVisible}
          value={researchPlan.container?.description || ''}
          handleCommentTextChange={this.handleCommentTextChange}
        />
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

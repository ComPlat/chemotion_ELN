/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/require-default-props */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  OverlayTrigger,
  Button,
  Accordion,
  Card,
  ButtonToolbar, Tooltip,
} from 'react-bootstrap';
import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import QuillViewer from 'src/components/QuillViewer';
import ImageModal from 'src/components/common/ImageModal';
import { hNmrCount, cNmrCount, instrumentText } from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import { chmoConversions } from 'src/components/OlsComponent';
import { getAttachmentFromContainer } from 'src/utilities/imageHelper';
import {
  JcampIds, BuildSpcInfos, BuildSpcInfosForNMRDisplayer, isNMRKind
} from 'src/utilities/SpectraHelper';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';
// eslint-disable-next-line max-len
import { AnalysisVariationLink } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import { truncateText } from 'src/utilities/textHelper';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';
import { UploadField } from 'src/apps/mydb/elements/details/analyses/UploadField';

const nmrMsg = (reaction, container) => {
  const ols = container.extended_metadata?.kind?.split('|')[0].trim();
  if (ols !== chmoConversions.nmr_1h?.termId && ols !== chmoConversions?.nmr_13c?.termId) {
    return '';
  }
  const nmrStr = container.extended_metadata && contentToText(container.extended_metadata.content);

  if ((container.extended_metadata.kind || '').split('|')[0].trim() === chmoConversions.nmr_1h.termId) {
    const msg = hNmrCount(nmrStr);
    return (
      <div className="d-inline text-dark">
        (
        <sup>1</sup>
        H:
        {msg}
        )
      </div>
    );
  }
  if ((container.extended_metadata.kind || '').split('|')[0].trim() === chmoConversions.nmr_13c.termId) {
    const msg = cNmrCount(nmrStr);
    return (
      <div className="d-inline-block ms-1 text-dark">
        (
        <sup>
          13
        </sup>
        C:
        {' '}
        {msg}
        )
      </div>
    );
  }
};

export default class ReactionDetailsContainers extends Component {
  constructor(props) {
    super(props);
    const { reaction } = props;
    const hasComment = reaction.container?.description && reaction.container.description.trim() !== '';

    this.state = {
      activeContainer: UIStore.getState().reaction.activeAnalysis,
      commentBoxVisible: hasComment,
    };
    this.containerRefs = {};

    this.handleAdd = this.handleAdd.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleOnClickRemove = this.handleOnClickRemove.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
    this.handleSpChange = this.handleSpChange.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  componentDidMount() {
    const { activeContainer } = this.state;
    UIStore.listen(this.onUIStoreChange);
    TextTemplateActions.fetchTextTemplates('reaction');
    if (this.containerRefs[activeContainer]) {
      this.containerRefs[activeContainer].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    const { activeContainer } = this.state;
    if (state.reaction.activeContainer !== activeContainer) {
      this.setState({
        activeContainer: state.reaction.activeContainer
      });
    }
  }

  handleChange = () => {
    const { reaction, handleReactionChange } = this.props;
    handleReactionChange(reaction);
  };

  handleSpChange(reaction, cb) {
    const { handleReactionChange } = this.props;
    handleReactionChange(reaction);
    cb();
  }

  handleUndo(container) {
    const { reaction, handleReactionChange } = this.props;
    container.is_deleted = false;
    handleReactionChange(reaction);
  }

  handleAdd() {
    const { reaction, handleReactionChange } = this.props;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';
    container.extended_metadata.content = { ops: [{ insert: '' }] };

    if (reaction.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      reaction.container.children.push(analyses);
    }

    reaction.container.children.filter((element) => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.push(container);

    const newKey = reaction.container.children.filter((element) => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.length - 1;

    this.handleAccordionOpen(newKey);
    handleReactionChange(reaction);
  }

  handleOnClickRemove(container) {
    if (confirm('Delete the container?')) {
      this.handleRemove(container);
    }
  }

  headerBtnGroup(container, reaction, readOnly) {
    const jcampIds = JcampIds(container);
    const hasJcamp = jcampIds.orig.length > 0;
    const confirmRegenerate = (e) => {
      e.stopPropagation();
      if (confirm('Regenerate spectra?')) {
        LoadingActions.start();
        SpectraActions.Regenerate(jcampIds, this.handleChange);
      }
    };

    const spcInfos = BuildSpcInfos(reaction, container);
    const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
    const toggleSpectraModal = (e) => {
      e.stopPropagation();
      SpectraActions.ToggleModal();
      SpectraActions.LoadSpectra.defer(spcInfos);
    };

    // process open NMRium
    const toggleNMRDisplayerModal = (e) => {
      const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(reaction, container);
      e.stopPropagation();
      SpectraActions.ToggleModalNMRDisplayer();
      SpectraActions.LoadSpectraForNMRDisplayer.defer(spcInfosForNMRDisplayer); // going to fetch files base on spcInfos
    };

    const { chmos } = UserStore.getState();
    const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;

    return (
      <div className="d-flex justify-content-between align-items-center mb-0 gap-1">
        <AnalysisVariationLink
          reaction={reaction}
          analysisID={container.id}
        />
        <SpectraEditorButton
          element={reaction}
          hasJcamp={hasJcamp}
          spcInfos={spcInfos}
          hasChemSpectra={hasChemSpectra}
          toggleSpectraModal={toggleSpectraModal}
          confirmRegenerate={confirmRegenerate}
          toggleNMRDisplayerModal={toggleNMRDisplayerModal}
          hasNMRium={hasNMRium}
        />
        <PrintCodeButton element={reaction} analyses={[container]} ident={container.id} />
        <Button
          size="xxsm"
          variant="danger"
          disabled={readOnly}
          onClick={() => this.handleOnClickRemove(container)}
        >
          <i className="fa fa-trash" />
        </Button>
      </div>
    );
  }

  handleRemove(container) {
    const { reaction, handleReactionChange } = this.props;
    container.is_deleted = true;
    handleReactionChange(reaction);
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  // eslint-disable-next-line class-methods-use-this
  renderAnalysesHint() {
    return (
      <span className="text-muted me-3 small" style={{ maxWidth: '60%' }}>
        This tab can be used for reaction-related data (e.g., process control, in situ).
        For sample data (e.g., characterization), use the sample analysis tab.
      </span>
    );
  }

  addButton() {
    const { readOnly, reaction, handleReactionChange } = this.props;
    if (!readOnly) {
      return (
        <>
          <UploadField
            disabled={!reaction.can_update}
            element={reaction}
            setElement={(reaction, cb = null) => handleReactionChange(reaction)}
          />

          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="annotate_tooltip">Create and add empty analyses.</Tooltip>}
          >
            <Button
              size="xsm"
              variant="success"
              onClick={this.handleAdd}
            >
              Add analysis
            </Button>
          </OverlayTrigger>
        </>
      );
    }
    return null;
  }

  handleCommentTextChange = (e) => {
    const { reaction } = this.props;
    if (!reaction.container) {
      reaction.container = Container.buildEmpty();
    }
    reaction.container.description = e.target.value;
    this.handleChange(reaction.container);
  };

  toggleCommentBox = () => {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  };

  render() {
    const { activeContainer, commentBoxVisible } = this.state;
    const { reaction, readOnly } = this.props;

    const containerHeader = (container) => {
      let kind = container.extended_metadata.kind || '';
      kind = (kind.split('|')[1] || kind).trim();
      const insText = instrumentText(container);
      const status = container.extended_metadata.status || '';
      const content = container.extended_metadata.content || { ops: [{ insert: '' }] };

      const contentOneLine = {
        ops: content.ops.map((x) => {
          const c = { ...x };
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
                this.headerBtnGroup(container, reaction, readOnly)
              }
            </div>
            <div className="text-body-tertiary">
              Type:
              {' '}
              {kind}
              <br />
              Status:
              {status}
              {' '}
              {nmrMsg(reaction, container)}
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

      const status = container.extended_metadata.status && container.extended_metadata.status != '';
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

    if (reaction.container != null && reaction.container.children) {
      const analyses_container = reaction.container.children.filter((element) => (
        ~element.container_type.indexOf('analyses')
      ));

      if (analyses_container.length === 1 && analyses_container[0].children.length > 0) {
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              {this.renderAnalysesHint()}
              <ButtonToolbar className="gap-2">
                <CommentButton
                  toggleCommentBox={this.toggleCommentBox}
                  isVisible={commentBoxVisible}
                  size="xsm"
                />
                {this.addButton()}
              </ButtonToolbar>
            </div>
            <CommentBox
              isVisible={commentBoxVisible}
              value={reaction.container.description}
              handleCommentTextChange={this.handleCommentTextChange}
            />
            <Accordion
              className="border rounded overflow-hidden"
              onSelect={this.handleAccordionOpen}
              activeKey={activeContainer}
            >
              {analyses_container[0].children.map((container, key) => {
                const isFirstTab = key === 0;
                return (
                  <Card
                    ref={(element) => {
                      this.containerRefs[key] = element;
                    }}
                    key={`reaction_container_${container.id}`}
                    className={`rounded-0 border-0${isFirstTab ? '' : ' border-top'}`}
                  >
                    <Card.Header className="rounded-0 p-0 border-bottom-0">
                      <AccordionHeaderWithButtons eventKey={key}>
                        {container.is_deleted
                          ? containerHeaderDeleted(container)
                          : containerHeader(container)}
                      </AccordionHeaderWithButtons>
                    </Card.Header>

                    {!container.is_deleted && (
                    <Accordion.Collapse eventKey={key}>
                      <Card.Body>
                        <ContainerComponent
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                    templateType="reaction"
                                    element={reaction}
                                    container={container}
                                    onChange={() => this.handleChange(container)}
                                    rootContainer={reaction.container}
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
              sample={reaction}
              handleSampleChanged={this.handleSpChange}
              handleSubmit={this.props.handleSubmit}
            />
            <NMRiumDisplayer
              sample={reaction}
              handleSampleChanged={this.handleSpChange}
              handleSubmit={this.props.handleSubmit}
            />
          </div>
        );
      }

      return (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            {this.renderAnalysesHint()}
            <ButtonToolbar className="gap-2">
              <CommentButton
                toggleCommentBox={this.toggleCommentBox}
                isVisible={commentBoxVisible}
                size="xsm"
              />
              {this.addButton()}
            </ButtonToolbar>
          </div>
          <CommentBox
            isVisible={commentBoxVisible}
            value={reaction.container.description}
            handleCommentTextChange={this.handleCommentTextChange}
          />
          <div className="d-flex align-items-center">
            <span className="ms-3"> There are currently no Analyses. </span>
          </div>
        </div>
      );
    }

    return (
      <div className="m-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          {this.renderAnalysesHint()}
          <ButtonToolbar className="gap-2">
            <CommentButton
              toggleCommentBox={this.toggleCommentBox}
              isVisible={commentBoxVisible}
              size="xsm"
            />
          </ButtonToolbar>
        </div>
        <CommentBox
          isVisible={commentBoxVisible}
          value={reaction.container?.description || ''}
          handleCommentTextChange={this.handleCommentTextChange}
        />
        <div className="mt-2">
          There are currently no Analyses.
        </div>
      </div>
    );
  }
}

ReactionDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  handleSubmit: PropTypes.func,
  handleReactionChange: PropTypes.func,
};

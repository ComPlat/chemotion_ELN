import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {OverlayTrigger, Button, Tooltip} from 'react-bootstrap';

import Container from 'src/models/Container';
import UIStore from 'src/stores/alt/stores/UIStore';
import ArrayUtils from 'src/utilities/ArrayUtils';
import { reOrderArr } from 'src/utilities/DndControl';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';

import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import {
  RndNotAvailable, RndNoAnalyses,
  ReactionsDisplay
} from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersCom';

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { UploadField } from 'src/apps/mydb/elements/details/analyses/UploadField';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';
import {
  sortedContainers,
  indexedContainers,
  addNewAnalyses
} from 'src/apps/mydb/elements/details/analyses/utils';

export default class SampleDetailsContainers extends Component {
  constructor(props) {
    super(props);
    const { sample } = props;
    const hasComment = sample.container?.description && sample.container.description.trim() !== '';
    this.state = {
      activeAnalysis: UIStore.getState().sample.activeAnalysis,
      mode: 'edit',
      commentBoxVisible: hasComment,
    };
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.addButton = this.addButton.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCommentTextChange = this.handleCommentTextChange.bind(this);
    this.toggleCommentBox = this.toggleCommentBox.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.toggleAddToReport = this.toggleAddToReport.bind(this);
    this.updateContainerPreferredThumbnail = this.updateContainerPreferredThumbnail.bind(this);
    this.handleToggleMode = this.handleToggleMode.bind(this);
    this.isEqCId = this.isEqCId.bind(this);
    this.indexedContainers = this.indexedContainers.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    TextTemplateActions.fetchTextTemplates('sample');
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  handleCommentTextChange(e) {
    const { sample } = this.props;
    if (!sample.container) {
      sample.container = Container.buildEmpty();
    }
    sample.container.description = e.target.value;
    this.handleChange();
  }

  toggleCommentBox() {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  }

  handleChange() {
    const { sample, handleSampleChanged } = this.props;
    handleSampleChanged(sample);
  }

  onUIStoreChange(state) {
    const { activeAnalysis } = this.state;
    if (state.sample.activeAnalysis !== activeAnalysis) {
      this.setState({ activeAnalysis: state.sample.activeAnalysis });
    }
  }

  handleAdd() {
    const { sample, setState } = this.props;
    const newContainer = addNewAnalyses(sample);
    setState(
      (prevState) => ({ ...prevState, sample }),
      this.handleAccordionOpen(newContainer.id),
    );
  }

  handleMove(source, target) {
    const { sample } = this.props;

    const sortedConts = sortedContainers(sample);
    const newSortConts = reOrderArr(source, target, this.isEqCId, sortedConts);
    const newIndexedConts = this.indexedContainers(newSortConts);

    sample.analysesContainers()[0].children = newIndexedConts;
    this.props.setState((prevState) => ({ ...prevState, sample }));
  }

  // eslint-disable-next-line class-methods-use-this
  isEqCId(container, tagEl) {
    return container.id === tagEl.id;
  }

  indexedContainers(containers) {
    return indexedContainers(containers);
  }

  handleRemove(container) {
    const { sample } = this.props;
    container.is_deleted = true;

    this.props.setState((prevState) => ({ ...prevState, sample }));
  }

  handleUndo(container) {
    const { sample } = this.props;
    container.is_deleted = false;

    this.props.setState((prevState) => ({ ...prevState, sample }));
  }

  handleAccordionOpen(newKey) {
    this.setState((prevState) => {
      const prevKey = prevState.activeAnalysis;
      return {
        ...prevState,
        mode: 'edit',
        activeAnalysis: prevKey === newKey ? 0 : newKey,
      };
    });
  }

  addButton() {
    const { readOnly, sample, setState } = this.props;
    if (readOnly) {
      return null;
    }
    return (
      <>
        <UploadField
          disabled={!sample.can_update}
          element={sample}
          setElement={(sample, cb = null) => setState((prevState) => ({ ...prevState, sample }), cb)}
        />
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="annotate_tooltip">Create and add empty analyses.</Tooltip>}
        >
        <Button
          size="sm"
          variant="success"
          onClick={this.handleAdd}
          disabled={!sample.can_update}
        >
          <i className="fa fa-plus me-1" />
          Add analysis
        </Button>
        </OverlayTrigger>
      </>
    );
  }

  toggleAddToReport(container) {
    container.extended_metadata.report = !container.extended_metadata.report;
    this.handleChange(container);
  }

  updateContainerPreferredThumbnail() {
    this.handleChange();
  }

  handleToggleMode(mode) {
    this.setState({ mode });
  }

  render() {
    const { activeAnalysis, mode, commentBoxVisible } = this.state;
    const {
      readOnly, sample, handleSubmit, handleSampleChanged,
    } = this.props;
    const isDisabled = !sample.can_update;

    if (sample.container == null) return <RndNotAvailable />;

    const analyContainer = sample.analysesContainers();

    if (analyContainer.length === 1 && analyContainer[0].children.length > 0) {
      const orderContainers = ArrayUtils.sortArrByIndex(analyContainer[0].children);
      return (
        <div>
          <ReactionsDisplay
            sample={sample}
            mode={mode}
            orderContainers={orderContainers}
            rootContainer={sample.container}
            readOnly={readOnly}
            isDisabled={isDisabled}
            addButton={this.addButton}
            handleRemove={this.handleRemove}
            handleSubmit={handleSubmit}
            handleMove={this.handleMove}
            handleAccordionOpen={this.handleAccordionOpen}
            handleUndo={this.handleUndo}
            toggleAddToReport={this.toggleAddToReport}
            handleToggleMode={this.handleToggleMode}
            activeAnalysis={activeAnalysis}
            handleChange={this.handleChange}
            handleCommentTextChange={this.handleCommentTextChange}
            commentBoxVisible={commentBoxVisible}
            toggleCommentBox={this.toggleCommentBox}
            updateContainerPreferredThumbnail={this.updateContainerPreferredThumbnail}
          />
          <ViewSpectra
            sample={sample}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={handleSubmit}
          />
          <NMRiumDisplayer
            sample={sample}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={handleSubmit}
          />
        </div>
      );
    }

    return (
      <RndNoAnalyses
        addButton={this.addButton}
        toggleCommentBox={this.toggleCommentBox}
        commentBoxVisible={commentBoxVisible}
        containerDescription={sample.container?.description || ''}
        handleCommentTextChange={this.handleCommentTextChange}
      />
    );
  }
}

SampleDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  sample: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

SampleDetailsContainers.defaultProps = {
  readOnly: false
};

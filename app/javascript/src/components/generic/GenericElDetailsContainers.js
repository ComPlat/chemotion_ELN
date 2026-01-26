/* eslint-disable no-bitwise */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-array-index-key */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, ButtonGroup } from 'react-bootstrap';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import Container from 'src/models/Container';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import GenericContainerSet from 'src/components/generic/GenericContainerSet';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';
import ArrayUtils from 'src/utilities/ArrayUtils';
import { reOrderArr } from 'src/utilities/DndControl';
import {
  indexedContainers,
} from 'src/apps/mydb/elements/details/analyses/utils';

export default class GenericElDetailsContainers extends Component {
  constructor(props) {
    super(props);
    const { genericEl } = props;
    const hasComment = genericEl.container?.description
      && genericEl.container.description.trim() !== '';
    this.state = {
      activeContainer: null,
      commentBoxVisible: hasComment,
      mode: 'edit',
    };
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCommentTextChange = this.handleCommentTextChange.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleSpChange = this.handleSpChange.bind(this);
    this.handleToggleMode = this.handleToggleMode.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.toggleCommentBox = this.toggleCommentBox.bind(this);
  }

  componentDidMount() {
    const { genericEl } = this.props;
    TextTemplateActions.fetchTextTemplates(genericEl.type);
  }

  handleChange() {
    const { genericEl, handleElChanged } = this.props;
    handleElChanged(genericEl);
  }

  handleCommentTextChange(e) {
    const { genericEl } = this.props;
    if (!genericEl.container) {
      genericEl.container = Container.buildEmpty();
    }
    genericEl.container.description = e.target.value;
    this.handleChange();
  }

  toggleCommentBox() {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  }

  handleToggleMode(mode) {
    this.setState({ mode });
  }

  handleMove(source, target) {
    const { genericEl, handleElChanged } = this.props;
    const analysesContainer = genericEl.container.children.filter(
      (element) => ~element.container_type.indexOf('analyses'),
    )[0];
    const sortedConts = ArrayUtils.sortArrByIndex(analysesContainer.children);
    const isEqCId = (container, tagEl) => container.id === tagEl.id;
    const newSortConts = reOrderArr(source, target, isEqCId, sortedConts);
    const newIndexedConts = indexedContainers(newSortConts);
    analysesContainer.children = newIndexedConts;
    handleElChanged(genericEl);
  }

  handleSpChange(genericEl, cb) {
    const { handleElChanged } = this.props;
    handleElChanged(genericEl);
    cb();
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: String(key) });
  }

  handleAdd() {
    const { genericEl, handleElChanged } = this.props;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';
    container.extended_metadata.content = { ops: [{ insert: '' }] };

    if (genericEl.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      genericEl.container.children.push(analyses);
    }

    genericEl.container.children
      .filter((element) => ~element.container_type.indexOf('analyses'))[0]
      .children.push(container);

    const newKey =
      genericEl.container.children.filter(
        (element) => ~element.container_type.indexOf('analyses'),
      )[0].children.length - 1;

    this.handleAccordionOpen(String(newKey));
    handleElChanged(genericEl);
  }

  handleRemove(container) {
    const { genericEl, handleElChanged } = this.props;
    container.is_deleted = true;
    handleElChanged(genericEl);
  }

  handleUndo(container) {
    const { genericEl, handleElChanged } = this.props;
    container.is_deleted = false;
    handleElChanged(genericEl);
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <Button size="sm" variant="success" onClick={this.handleAdd}>
          <i className="fa fa-plus" aria-hidden="true" />
          &nbsp; Add analysis
        </Button>
      );
    }
    return null;
  }

  renderNoAnalysesMessage() {
    const { genericEl } = this.props;
    const { commentBoxVisible } = this.state;

    return (
      <div>
        <div className="d-flex align-items-center justify-content-between mb-2 mt-4 mx-3">
          <span className="ms-3"> There are currently no Analyses. </span>
          <div className="d-flex gap-1">
            <CommentButton
              toggleCommentBox={this.toggleCommentBox}
              isVisible={commentBoxVisible}
              size="sm"
            />
            {this.addButton()}
          </div>
        </div>
        <CommentBox
          isVisible={commentBoxVisible}
          value={genericEl.container?.description || ''}
          handleCommentTextChange={this.handleCommentTextChange}
        />
      </div>
    );
  }

  renderNoAct(genericEl, readOnly) {
    const { linkedAis, handleSubmit } = this.props;
    const { activeContainer } = this.state;
    if (linkedAis.length < 1) return null; // if layer has no linked analyses
    if (genericEl.container != null) {
      const analysesContainer = genericEl.container.children.filter(
        (element) => ~element.container_type.indexOf('analyses'),
      );
      if (
        analysesContainer.length === 1 &&
        analysesContainer[0].children.length > 0
      ) {
        return (
          <div className="gen_linked_container_group">
            <h4>
              <Badge bg="dark">Linked Analyses</Badge>
            </h4>
            <div className="mb-2 me-1 d-flex justify-content-between align-items-center">
              <GenericContainerSet
                ae={analysesContainer}
                readOnly={readOnly}
                generic={genericEl}
                fnChange={this.handleChange}
                fnSelect={this.handleAccordionOpen}
                fnUndo={this.handleUndo}
                fnRemove={this.handleRemove}
                noAct
                linkedAis={linkedAis}
                handleSubmit={handleSubmit}
                activeKey={activeContainer}
              />
            </div>
          </div>
        );
      }
      return null;
    }
    return null;
  }

  render() {
    const { genericEl, readOnly, noAct, handleSubmit } = this.props;
    const { activeContainer, commentBoxVisible, mode } = this.state;

    if (noAct) return this.renderNoAct(genericEl, readOnly);

    if (genericEl.container != null && genericEl.container.children) {
      const analysesContainer = genericEl.container.children.filter(
        (element) => ~element.container_type.indexOf('analyses'),
      );
      if (
        analysesContainer.length === 1 &&
        analysesContainer[0].children.length > 0
      ) {
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <ButtonGroup>
                <ButtonGroupToggleButton
                  size="sm"
                  active={mode === 'edit'}
                  onClick={() => this.handleToggleMode('edit')}
                >
                  <i className="fa fa-edit me-1" aria-hidden="true" />
                  Edit mode
                </ButtonGroupToggleButton>
                <ButtonGroupToggleButton
                  size="sm"
                  active={mode === 'order'}
                  onClick={() => this.handleToggleMode('order')}
                >
                  <i className="fa fa-reorder me-1" aria-hidden="true" />
                  Order mode
                </ButtonGroupToggleButton>
              </ButtonGroup>
              <div className="d-flex gap-1">
                <CommentButton
                  toggleCommentBox={this.toggleCommentBox}
                  isVisible={commentBoxVisible}
                  size="sm"
                />
                {this.addButton()}
              </div>
            </div>
            <CommentBox
              isVisible={commentBoxVisible}
              value={genericEl.container?.description || ''}
              handleCommentTextChange={this.handleCommentTextChange}
            />
            <GenericContainerSet
              ae={analysesContainer}
              readOnly={readOnly}
              generic={genericEl}
              fnChange={this.handleChange}
              fnSelect={this.handleAccordionOpen}
              fnUndo={this.handleUndo}
              fnRemove={this.handleRemove}
              handleSubmit={handleSubmit}
              activeKey={activeContainer}
              mode={mode}
              handleMove={this.handleMove}
            />
          </div>
        );
      }
      return this.renderNoAnalysesMessage();
    }
    return this.renderNoAnalysesMessage();
  }
}

GenericElDetailsContainers.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  genericEl: PropTypes.object.isRequired,
  handleElChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  noAct: PropTypes.bool,
  linkedAis: PropTypes.array,
};
GenericElDetailsContainers.defaultProps = { noAct: false, linkedAis: [] };

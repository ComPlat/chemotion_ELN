import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Accordion, Card, ButtonToolbar } from 'react-bootstrap';

import Container from 'src/models/Container';
import ArrayUtils from 'src/utilities/ArrayUtils';
import { reOrderArr } from 'src/utilities/DndControl';
import { indexedContainers } from 'src/apps/mydb/elements/details/analyses/utils';
import AnalysisModeToggle from 'src/apps/mydb/elements/details/analyses/AnalysisModeToggle';
import AnalysesOrderRow from 'src/apps/mydb/elements/details/analyses/AnalysesOrderRow';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

export default class ScreenDetailsContainers extends Component {
  constructor(props) {
    super(props);
    const { screen } = props;
    const hasComment = screen.container?.description && screen.container.description.trim() !== '';
    this.state = {
      screen,
      activeContainer: 0,
      commentBoxVisible: hasComment,
      mode: 'edit',
    };
    this.analysesContainer = screen.container.children.filter(element => ~element.container_type.indexOf('analyses'));
  }

  componentDidMount() {
    TextTemplateActions.fetchTextTemplates('screen');
  }

  componentDidUpdate(prevProps) {
    const { screen } = this.props;
    if (screen !== prevProps.screen) {
      this.setState({ screen });
    }
  }

  handleChange() {
    const { handleScreenChanged } = this.props;
    const { screen } = this.state;
    handleScreenChanged(screen);
  }

  handleAdd() {
    const { handleScreenChanged } = this.props;
    const { screen } = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    screen.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey =
      screen.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    handleScreenChanged(screen);
  }

  handleRemove(container) {
    const { handleScreenChanged } = this.props;
    let { screen } = this.state;
    container.is_deleted = true;

    handleScreenChanged(screen);
  }

  handleClickToRemoveContainer(container) {
    if (confirm('Delete the container?')) {
      this.handleRemove(container);
    }
  }

  handleUndo(container) {
    const { handleScreenChanged } = this.props;
    let { screen } = this.state;
    container.is_deleted = false;

    handleScreenChanged(screen);
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  handleToggleMode(mode) {
    this.setState({ mode });
  }

  handleMove(source, target) {
    const { handleScreenChanged } = this.props;
    const { screen } = this.state;
    const analysesContainer = screen.container.children.filter(
      (element) => ~element.container_type.indexOf('analyses'),
    )[0];
    const sortedConts = ArrayUtils.sortArrByIndex(analysesContainer.children);
    const isEqCId = (container, tagEl) => container.id === tagEl.id;
    const newSortConts = reOrderArr(source, target, isEqCId, sortedConts);
    analysesContainer.children = indexedContainers(newSortConts);
    handleScreenChanged(screen);
  }

  stopToggleAccordion(event) {
    event.stopPropagation();
  }

  addButton() {
    const { readOnly } = this.props;
    if (readOnly) { return null; }

    return (
      <Button
        size="sm"
        variant="success"
        onClick={() => this.handleAdd()}
      >
        <i className="fa fa-plus me-1" />
        Add analysis
      </Button>
    );
  }

  headerValues(container) {
    const kind = container.extended_metadata['kind'];
    const typeValue = kind && kind !== '' ? (<div className="mt-2">Type: {kind.split('|')[1] || kind}</div>) : '';
    const status = container.extended_metadata['status'];
    const statusValue = status && status !== '' ? (<div className="mt-2">Status: {status}</div>) : '';
    const containerNameClass = container.is_deleted ? '' : 'fw-bold text-decoration-underline';

    return (
      <>
        <div className={containerNameClass}>{container.name}</div>
        {typeValue}
        {statusValue}
      </>
    );
  }

  containerHeader(container) {
    const { readOnly, screen } = this.props;

    return (
      <div className="d-flex justify-content-between align-items-start w-100 mb-0">
        <div>
          {this.headerValues(container)}
        </div>
        <div className="d-flex" onClick={this.stopToggleAccordion}>
          <PrintCodeButton element={screen} analyses={[container]} />
          <Button
            size="xxsm"
            variant="danger"
            className="ms-2"
            disabled={readOnly}
            onClick={() => { this.handleClickToRemoveContainer(container) }}
          >
            <i className="fa fa-trash"></i>
          </Button>
        </div>
      </div>
    );
  }

  containerHeaderDeleted(container) {
    return (
      <div className="d-flex justify-content-between w-100 mb-0">
        <div className="text-decoration-line-through">
          {this.headerValues(container)}
        </div>
        <div onClick={this.stopToggleAccordion}>
          <Button
            size="xxsm"
            variant="danger"
            onClick={() => this.handleUndo(container)}
          >
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      </div>
    );
  }

  collapsableBody(container, key) {
    if (container.is_deleted) { return null; }
    const { readOnly } = this.props;
    const { screen } = this.state;

    return (
      <Accordion.Collapse eventKey={key}>
        <Card.Body>
          <ContainerComponent
            disabled={readOnly}
            readOnly={readOnly}
            element={screen}
            templateType="screen"
            container={container}
            onChange={() => this.handleChange()}
            rootContainer={screen.container}
            index={key}
          />
        </Card.Body>
      </Accordion.Collapse>
    )
  }

  handleCommentTextChange = (e) => {
    const { screen } = this.state;
    screen.container.description = e.target.value;
    this.handleChange(screen);
  };

  toggleCommentBox = () => {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  };

  render() {
    const { screen, commentBoxVisible, mode } = this.state;
    if (screen.container != null) {
      if (this.analysesContainer.length == 1 && this.analysesContainer[0].children.length > 0) {
        const sortedChildren = ArrayUtils.sortArrByIndex(this.analysesContainer[0].children);
        return (
          <div>
            <div className="mb-2 me-1 d-flex justify-content-between align-items-center">
              {AnalysisModeToggle(mode, this.handleToggleMode.bind(this), this.props.readOnly)}
              <ButtonToolbar className="gap-2">
                <CommentButton
                  toggleCommentBox={this.toggleCommentBox}
                  isVisible={commentBoxVisible}
                  size="sm"
                />
                {this.addButton()}
              </ButtonToolbar>
            </div>
            <CommentBox
              isVisible={commentBoxVisible}
              value={screen.container.description}
              handleCommentTextChange={this.handleCommentTextChange}
            />
            {mode === 'order' ? (
              <div>
                {sortedChildren.map((container) => (
                  <AnalysesOrderRow
                    key={container.id}
                    container={container}
                    handleMove={this.handleMove.bind(this)}
                  />
                ))}
              </div>
            ) : (
              <Accordion className="border rounded overflow-hidden">
                {sortedChildren.map((container, key) => {
                  const isFirstTab = key === 0;
                  return (
                    <Card
                      key={`screen_container_${container.id}`}
                      className={`rounded-0 border-0${isFirstTab ? '' : ' border-top'}`}
                    >
                      <Card.Header className="rounded-0 p-0 border-bottom-0">
                        <AccordionHeaderWithButtons eventKey={key}>
                          {container.is_deleted
                            ? this.containerHeaderDeleted(container)
                            : this.containerHeader(container)}
                        </AccordionHeaderWithButtons>
                      </Card.Header>
                      {this.collapsableBody(container, key)}
                    </Card>
                  );
                })}
              </Accordion>
            )}
          </div>
        );
      } else {
        return (
          <div>
            <div className="d-flex align-items-center justify-content-between my-2">
              <span> There are currently no Analyses.</span>
              <ButtonToolbar>
                <CommentButton
                  toggleCommentBox={this.toggleCommentBox}
                  isVisible={commentBoxVisible}
                  size="sm"
                />
                {this.addButton()}
              </ButtonToolbar>
            </div>
            <CommentBox
              isVisible={commentBoxVisible}
              value={screen.container.description}
              handleCommentTextChange={this.handleCommentTextChange}
            />
          </div>
        )
      }
    } else {
      return (
        <div className="m-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span>There are currently no Analyses.</span>
            <ButtonToolbar>
              <div className="mt-2">
                <CommentButton
                  toggleCommentBox={this.toggleCommentBox}
                  isVisible={commentBoxVisible}
                  size="sm"
                />
              </div>
            </ButtonToolbar>
          </div>
          <CommentBox
            isVisible={commentBoxVisible}
            value={screen.container?.description || ''}
            handleCommentTextChange={this.handleCommentTextChange}
          />
        </div>
      )
    }
  }
}

ScreenDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  handleScreenChanged: PropTypes.func,
};

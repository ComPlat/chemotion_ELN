import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Accordion, Button, Card, ButtonToolbar } from 'react-bootstrap';
import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PrintCodeButton from 'src/components/common/PrintCodeButton'

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

export default class WellplateDetailsContainers extends Component {
  constructor(props) {
    super();
    const { wellplate } = props;
    const hasComment = wellplate.container?.description && wellplate.container.description.trim() !== '';
    this.state = {
      wellplate,
      activeContainer: 0,
      commentBoxVisible: hasComment,
    };
  }

  componentDidMount() {
    TextTemplateActions.fetchTextTemplates('wellplate');
  }

  componentDidUpdate() {
    const { wellplate: newWellplate } = this.props;
    const { wellplate: currentWellplate } = this.state;
    if (newWellplate.id !== currentWellplate.id || newWellplate.updated_at !== currentWellplate.updated_at) {
      this.setState({
        wellplate: newWellplate,
      });
    }
  }

  handleChange(container) {
    const { handleWellplateChanged } = this.props;
    const { wellplate } = this.state
    handleWellplateChanged(wellplate)
  }

  handleAdd() {
    const { setWellplate } = this.props;
    const { wellplate } = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);
    setWellplate(wellplate)
  }

  handleRemove(container) {
    const { setWellplate } = this.props;
    const { wellplate } = this.state;
    container.is_deleted = true;
    setWellplate(wellplate);
  }

  handleUndo(container) {
    const { setWellplate } = this.props;
    const { wellplate } = this.state;
    container.is_deleted = false;
    setWellplate(wellplate);
  }

  handleAccordionOpen = (key) => {
    this.setState({ activeContainer: key });
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <Button
          size="sm"
          variant="success"
          onClick={() => this.handleAdd()}
          className="ms-auto"
        >
          Add analysis
        </Button>
      )
    }
  }

  handleCommentTextChange = (e) => {
    const { wellplate } = this.state;
    wellplate.container.description = e.target.value;
    this.handleChange(wellplate.container);
  };

  toggleCommentBox = () => {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  };

  render() {
    const { wellplate, activeContainer, commentBoxVisible } = this.state;
    const { readOnly } = this.props;

    let containerHeader = (container) => <div className="analysis-header d-flex justify-content-between w-100">
      <div>
        {container.name}
        {(container.extended_metadata['kind'] &&
          container.extended_metadata['kind'] != '')
          ? (` - Type: ${container.extended_metadata['kind'].split('|')[1] || container.extended_metadata['kind']}`) : ''}
        {(container.extended_metadata['status'] &&
          container.extended_metadata['status'] != '')
          ? (' - Status: ' + container.extended_metadata['status']) : ''}
      </div>
      <div className="d-flex justify-content-end gap-2 me-2">
        <PrintCodeButton
          element={wellplate}
          analyses={[container]}
          ident={container.id}
        />
        <Button
          size="xxsm"
          variant="danger"
          disabled={readOnly}
          onClick={() => {
            if (confirm('Delete the container?')) this.handleRemove(container)
          }}>
          <i className="fa fa-trash"></i>
        </Button>
      </div>
    </div>

    let containerHeaderDeleted = (container) => (
      <div className="d-flex justify-content-between w-100">
        <strike>{container.name}
          {(container.extended_metadata['kind'] &&
            container.extended_metadata['kind'] != '')
            ? (` - Type: ${container.extended_metadata['kind'].split('|')[1] || container.extended_metadata['kind']}`) : ''}
          {(container.extended_metadata['status'] && container.extended_metadata['status'] != '') ? (' - Status: ' + container.extended_metadata['status']) : ''}
        </strike>
        <div className="d-flex justify-content-end gap-2 me-2">
          <Button size="xsm" variant="danger" onClick={() => this.handleUndo(container)}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      </div>
    );

    if (wellplate.container == null) {
      return (
        <div className="m-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="m-0">There are currently no Analyses.</p>
            <CommentButton
              toggleCommentBox={this.toggleCommentBox}
              isVisible={commentBoxVisible}
              size="sm"
            />
            <ButtonToolbar className="gap-2" />
          </div>
          <CommentBox
            isVisible={commentBoxVisible}
            value={wellplate.container?.description || ''}
            handleCommentTextChange={this.handleCommentTextChange}
          />
        </div>
      )
    }

    var analyses_container = wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'));

    if (analyses_container.length != 1 || analyses_container[0].children.length == 0) {
      return (
        <div>
          <div className='d-flex justify-content-between align-items-center my-2 mx-3'>
            <p className='m-0'>
              There are currently no Analyses.
            </p>
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
            value={wellplate.container.description}
            handleCommentTextChange={this.handleCommentTextChange}
          />
        </div>
      )
    }

    return (
      <div>
        <div className="d-flex justify-content-end my-2 mx-3">
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
          value={wellplate.container.description}
          handleCommentTextChange={this.handleCommentTextChange}
        />
        <Accordion
          className="border rounded overflow-hidden"
          onSelect={this.handleAccordionOpen}
          activeKey={activeContainer}
        >
          {
            analyses_container[0].children.map((container, key) => {
              const isFirstTab = key === 0;
              return (
                <Card
                  eventKey={key}
                  key={`wellplate_container_${key}`}
                  className={"rounded-0 border-0" + (isFirstTab ? '' : ' border-top')}
                >
                  <Card.Header className="rounded-0 p-0 border-bottom-0">
                    <AccordionHeaderWithButtons eventKey={key}>
                      {container.is_deleted ? containerHeaderDeleted(container) : containerHeader(container)}
                    </AccordionHeaderWithButtons>
                  </Card.Header>
                  {
                    !container.is_deleted &&
                    <Accordion.Collapse eventKey={key}>
                      <Card.Body>
                        <ContainerComponent
                          templateType="wellplate"
                          element={wellplate}
                          readOnly={readOnly}
                          container={container}
                          onChange={container => this.handleChange(container)}
                          rootContainer={wellplate.container}
                          index={key}
                        />
                      </Card.Body>
                    </Accordion.Collapse>
                  }
                </Card>
              );
            })
          }
        </Accordion>
      </div>
    );
  }
}

WellplateDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  handleWellplateChanged: PropTypes.func.isRequired,
  setWellplate: PropTypes.func.isRequired,
};

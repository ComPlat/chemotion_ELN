import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Accordion, Card } from 'react-bootstrap';

import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import AccordionHeaderWithButtons from 'src/apps/mydb/elements/details/AccordionHeaderWithButtons';

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

export default class ScreenDetailsContainers extends Component {
  constructor(props) {
    super();
    const { screen } = props;
    this.state = {
      screen
    };
    this.analysesContainer = screen.container.children.filter(element => ~element.container_type.indexOf('analyses'));
  }

  componentDidMount() {
    TextTemplateActions.fetchTextTemplates('screen');
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      screen: nextProps.screen
    })
  }

  handleChange() {
    const { screen } = this.state;
    this.props.parent.handleScreenChanged(screen);
  }

  handleAdd() {
    const { screen } = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    this.analysesContainer[0].children.push(container);
    const newKey = this.analysesContainer[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({ screen: screen })
  }

  handleRemove(container) {
    let { screen } = this.state;
    container.is_deleted = true;

    this.props.parent.setState({ screen: screen })
  }

  handleClickToRemoveContainer(container) {
    if (confirm('Delete the container?')) {
      this.handleRemove(container);
    }
  }

  handleUndo(container) {
    let { screen } = this.state;
    container.is_deleted = false;

    this.props.parent.setState({ screen: screen })
  }

  addButton() {
    const { readOnly } = this.props;
    if (readOnly) { return null; }

    return (
      <div className="my-2">
        <Button
          size="xxsm"
          variant="success"
          onClick={() => this.handleAdd()}
        >
          <i className="fa fa-plus me-1" />
          Add analysis
        </Button>
      </div>
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
    const { readOnly } = this.props;

    return (
      <div className="d-flex justify-content-between w-100 mb-0">
        <div>
          {this.headerValues(container)}
        </div>
        <div>
          <PrintCodeButton element={screen} analyses={[container]} ident={container.id} />
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
        <div>
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

    return (
      <Accordion.Collapse eventKey={key}>
        <Card.Body>
          <ContainerComponent
            disabled={readOnly}
            readOnly={readOnly}
            templateType="screen"
            container={container}
            onChange={() => this.handleChange()}
          />
        </Card.Body>
      </Accordion.Collapse>
    )
  }

  render() {
    const { screen } = this.state;

    if (screen.container != null) {
      if (this.analysesContainer.length == 1 && this.analysesContainer[0].children.length > 0) {
        return (
          <div>
            <div className="mb-2 me-1 d-flex flex-row-reverse">
              {this.addButton()}
            </div>
            <Accordion>
              {this.analysesContainer[0].children.map((container, key) => {
                return (
                  <Card
                    key={`screen_container_${container.id}`}
                    className="rounded-0"
                  >
                    <Card.Header className="bg-gray-200 py-3 rounded-0">
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
          </div>
        );
      } else {
        return (
          <div className="d-flex align-items-center justify-content-between my-2">
            <span> There are currently no Analyses.</span>
            {this.addButton()}
          </div>
        )
      }
    } else {
      return (
        <div className="m-4">
          There are currently no Analyses.
        </div>
      )
    }
  }
}

ScreenDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  parent: PropTypes.object,
};

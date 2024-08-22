import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Accordion, Button, Row } from 'react-bootstrap';
import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PrintCodeButton from 'src/components/common/PrintCodeButton'

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

export default class WellplateDetailsContainers extends Component {
  constructor(props) {
    super();
    const { wellplate } = props;
    this.state = {
      wellplate,
      activeContainer: 0
    };
  }

  componentDidMount() {
    TextTemplateActions.fetchTextTemplates('wellplate');
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      wellplate: nextProps.wellplate
    })
  }

  handleChange(container) {
    const { wellplate } = this.state
    this.props.parent.handleWellplateChanged(wellplate)
  }

  handleAdd() {
    const { wellplate } = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({ wellplate: wellplate })
  }

  handleRemove(container) {
    let { wellplate } = this.state;
    container.is_deleted = true;

    this.props.parent.setState({ wellplate: wellplate })
  }

  handleUndo(container) {
    let { wellplate } = this.state;
    container.is_deleted = false;

    this.props.parent.setState({ wellplate: wellplate })
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <Button size="sm" variant="success" onClick={() => this.handleAdd()}>
          Add analysis
        </Button>
      )
    }
  }

  render() {
    const { wellplate, activeContainer } = this.state;
    const { readOnly } = this.props;

    let containerHeader = (container) => <div className="d-flex justify-content-between w-100">
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
          size="sm"
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
          <Button size="sm" variant="danger" onClick={() => this.handleUndo(container)}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      </div>
    );

    if (wellplate.container == null) {
      return (
        <div>
          <p className='m-4'>
            There are currently no Analyses.
          </p>
        </div>
      )
    }

    var analyses_container = wellplate.container.children.filter(element => ~element.container_type.indexOf('analyses'));

    if (analyses_container.length != 1 || analyses_container[0].children.length == 0) {
      return (
        <div className='d-flex justify-content-between align-items-center'>
          <p className='m-0'>
            There are currently no Analyses.
            {this.addButton()}
          </p>
        </div>
      )
    }

    return (
      <div>
        <div className="my-3">
          {this.addButton()}
        </div>
        <Accordion defaultActiveKey={0}>
          {
            analyses_container[0].children.map((container, key) => {
              return (
                <Accordion.Item eventKey={key} key={key}>
                  <Accordion.Header>
                    {container.is_deleted ? containerHeaderDeleted(container) : containerHeader(container)}
                  </Accordion.Header>
                  {
                    !container.is_deleted &&
                      <Accordion.Body>
                        <ContainerComponent
                          templateType="wellplate"
                          readOnly={readOnly}
                          container={container}
                          onChange={container => this.handleChange(container)}
                        />
                      </Accordion.Body>
                  }
                </Accordion.Item>
              )
            })
          }
        </Accordion>
      </div>
    )
  }
}

WellplateDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  parent: PropTypes.object,
};

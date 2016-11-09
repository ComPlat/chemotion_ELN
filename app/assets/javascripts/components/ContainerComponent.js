import React, {Component} from 'react';
import {Col, FormControl,FormGroup, ControlLabel} from 'react-bootstrap';
import Select from 'react-select'
import ContainerDatasets from './ContainerDatasets';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();
    const {container} = props;
    this.state = {
      container
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container
    });
  }

  handleInputChange(type, event) {
    const {container} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        container.name = value;
        break;
      case 'description':
        container.description = value;
        break;
    }
    this.props.onChange(container);

  }

/*  handleAdd() {
    const {container} = this.state;
    let subcontainer = Container.buildEmpty();
    container.children.push(subcontainer);

    this.props.parent.setState({container: container})
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
            <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
              Add container
            </Button>
      );
    }
  }
*/
  render() {
    const {container} = this.state;
    const {readOnly} = this.props;
    return (
      <div>
        <Col md={4}>
          <label>Name</label>
          <FormControl
            type="text"
            label="Name"
            value={container.name || '***'}
            onChange={event => this.handleInputChange('name', event)}/>
        </Col>
        <Col md={12}>
          <FormGroup>
            <ControlLabel>Description</ControlLabel>
            <FormControl
              componentClass="textarea"
              label="Description"
              value={container.description || ''}
              disabled={readOnly}
              onChange={event => this.handleInputChange('description', event)}
              />
          </FormGroup>
        </Col>
        <Col md={12}>
          <label>Datasets</label>
          <ContainerDatasets
            container={container}
            readOnly={readOnly}
            onChange={container => this.props.onChange(container)}
            />
        </Col>
      </div>
    );
  }
}

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
      case 'kind':
        container.extended_metadata['kind'] = value;
        break;
      case 'status':
        container.extended_metadata['status'] = value;
        break;
      case 'content':
        container.extended_metadata['content'] = value;
        break;
      case 'description':
        container.description = value;
        break;
    }
    this.props.onChange(container);

  }

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
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Type</label>
            <Select
              name='kind'
              multi={false}
              options={kindOptions}
              value={container.extended_metadata['kind']}
              disabled={readOnly}
              onChange={(event, selectedOptions) => {
                const values = selectedOptions.map(o => o.value);
                const wrappedEvent = {target: {value: values[0]}};
                this.handleInputChange('kind', wrappedEvent)
              }}
              />
          </div>
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Status</label>
            <Select
              name='status'
              multi={false}
              options={statusOptions}
              value={container.extended_metadata['status']}
              disabled={readOnly}
              onChange={(event, selectedOptions) => {
                const values = selectedOptions.map(o => o.value);
                const wrappedEvent = {target: {value: values[0]}};
                this.handleInputChange('status', wrappedEvent)
              }}
            />
          </div>
        </Col>
        <Col md={12}>
        <FormGroup>
          <ControlLabel>Content</ControlLabel>
          <FormControl
            componentClass="textarea"
            label="Content"
            value={container.extended_metadata['content'] || ''}
            disabled={readOnly}
            onChange={event => this.handleInputChange('content', event)}
            />
        </FormGroup>
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

const statusOptions = [{
  label: "Confirmed",
  value: "Confirmed"
},{
  label: "Unconfirmed",
  value: "Unconfirmed"
}];

const kindOptions = [{
  label: "1H NMR",
  value: "1H NMR"
},{
  label: "13C NMR",
  value: "13C NMR"
},{
  label: "Mass",
  value: "Mass"
},{
  label: "IR",
  value: "IR"
},{
  label: "EA",
  value: "EA"
},{
  label: "GCMS",
  value: "GCMS"
},{
  label: "HPLC",
  value: "HPLC"
},{
  label: "TLC",
  value: "TLC"
},{
  label: "Crystall-Structure",
  value: "Crystall-Structure"
},{
  label: "Others",
  value: "Others"
}];

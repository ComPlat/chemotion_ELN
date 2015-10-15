import React, {Component} from 'react';
import {Row, Col, Input, ListGroup, ListGroupItem, Button} from 'react-bootstrap';
import Select from 'react-select'
import AnalysisDatasets from './AnalysisDatasets';

export default class Analysis extends Component {
  constructor(props) {
    super();
    const {analysis} = props;
    this.state = {
      analysis
    };
  }

  handleInputChange(type, event) {
    const {analysis} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        analysis.name = value;
        break;
      case 'type':
        analysis.type = value;
        break;
      case 'status':
        analysis.status = value;
        break;
      case 'content':
        analysis.content = value;
        break;
      case 'description':
        analysis.description = value;
        break;
    }
    this.props.onChange(analysis);
  }

  render() {
    const {analysis} = this.state;
    return (
      <div>
        <Col md={4}>
          <Input
            type="text"
            label="Name"
            value={analysis.name}
            onChange={event => this.handleInputChange('name', event)}
            />
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Type</label>
            <Select
              name='type'
              multi={false}
              options={typeOptions}
              value={analysis.type}
              onChange={(event, selectedOptions) => {
                const values = selectedOptions.map(o => o.value);
                const wrappedEvent = {target: {value: values[0]}};
                this.handleInputChange('type', wrappedEvent)
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
              value={analysis.status}
              onChange={(event, selectedOptions) => {
                const values = selectedOptions.map(o => o.value);
                const wrappedEvent = {target: {value: values[0]}};
                this.handleInputChange('status', wrappedEvent)
              }}
            />
          </div>
        </Col>
        <Col md={8}>
          <Input
            type="textarea"
            label="Content"
            value={analysis.content}
            onChange={event => this.handleInputChange('content', event)}
            />
          <Input
            type="textarea"
            label="Description"
            value={analysis.description}
            onChange={event => this.handleInputChange('description', event)}
            />
        </Col>
        <Col md={4}>
          <label>Datasets</label>
          <AnalysisDatasets
            analysis={analysis}
            onChange={analysis => this.props.onChange(analysis)}
            />
        </Col>
        <Button bsStyle="danger" onClick={() => this.props.onRemove(analysis)}>Remove</Button>
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

const typeOptions = [{
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

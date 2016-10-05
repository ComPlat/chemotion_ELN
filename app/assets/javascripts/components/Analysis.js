import React, {Component} from 'react';
import {Col, FormControl,FormGroup, ControlLabel} from 'react-bootstrap';
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

  componentWillReceiveProps(nextProps) {
    this.setState({
      analysis: nextProps.analysis
    });
  }

  handleInputChange(type, event) {
    const {analysis} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'name':
        analysis.name = value;
        break;
      case 'kind':
        analysis.kind = value;
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
    const {readOnly} = this.props;
    return (
      <div>
        <Col md={4}>
          <label>Name</label>
          <FormControl
            type="text"
            label="Name"
            value={analysis.name || '***'}
            onChange={event => this.handleInputChange('name', event)}
            disabled={readOnly || analysis.isMethodDisabled('name')}
            />
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Type</label>
            <Select
              name='kind'
              multi={false}
              options={kindOptions}
              value={analysis.kind}
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
              value={analysis.status}
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
              value={analysis.content || ''}
              disabled={readOnly}
              onChange={event => this.handleInputChange('content', event)}
              />
          </FormGroup>
          <FormGroup>
            <ControlLabel>Description</ControlLabel>
            <FormControl
              componentClass="textarea"
              label="Description"
              value={analysis.description || ''}
              disabled={readOnly}
              onChange={event => this.handleInputChange('description', event)}
              />
          </FormGroup>
        </Col>
        <Col md={12}>
          <label>Datasets</label>
          <AnalysisDatasets
            analysis={analysis}
            readOnly={readOnly}
            onChange={analysis => this.props.onChange(analysis)}
            />
        </Col>
      </div>
    );
  }
}

Analysis.propTypes = {
  onChange: React.PropTypes.func,
  readOnly: React.PropTypes.bool,
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

import React, {Component} from 'react';
import {PanelGroup, Panel, Button, Row, Col} from 'react-bootstrap';
import AnalysisComponent from './Analysis';
import Analysis from './models/Analysis';

export default class SampleDetailsAnalyses extends Component {
  constructor(props) {
    super();
    const {sample} = props;
    this.state = {
      sample,
      activeAnalysis: 0
    };
  }

  handleChange(analysis) {
    const {sample} = this.state;
    sample.updateAnalysis(analysis);
    this.props.parent.handleSampleChanged(sample)
  }

  handleAdd() {
    const {sample} = this.state;
    // model: sample.createAnalysis()

    let analysis = Analysis.buildEmpty();

    sample.addAnalysis(analysis);

    const newKey = sample.analyses.length - 1;
    this.handleAccordionOpen(newKey);

    this.props.parent.setState({sample: sample})
  }

  handleRemove(analysis) {
    let {sample} = this.state;
    sample.removeAnalysis(analysis);
    this.props.parent.setState({sample: sample})
  }

  handleAccordionOpen(key) {
    this.setState({activeAnalysis: key});
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        <div className="button-right" >
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            Add analysis
          </Button>
        </div>
      )
    }
  }

  render() {
    const {sample, activeAnalysis} = this.state;
    const {readOnly} = this.props;
    let analysisHeader = (analysis) => <p style={{width: '100%'}}>{analysis.name}
      {(analysis.kind && analysis.kind != '') ? (' - Type: ' + analysis.kind) : ''}
      {(analysis.status && analysis.status != '') ? (' - Status: ' + analysis.status) :''}
      <Button bsSize="xsmall" bsStyle="danger"
         className="button-right" disabled={readOnly}
        onClick={() => {if(confirm('Delete the analysis?')) {this.handleRemove(analysis)}}}>
        <i className="fa fa-trash"></i>
      </Button></p>
    if(sample.analyses.length > 0) {
      return (
        <div>
          <p>&nbsp;{this.addButton()}</p>
          <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
            {sample.analyses.map(
              (analysis, key) =>
                <Panel header={analysisHeader(analysis)} eventKey={key}
                    key={key} onClick={() => this.handleAccordionOpen(key)}>
                  <AnalysisComponent
                    readOnly={readOnly}
                    analysis={analysis}
                    onChange={analysis => this.handleChange(analysis)}
                    />
                </Panel>
            )}
          </PanelGroup>
        </div>
      );
    } else {
      return (
      <p>
        There are currently no Analyses.
        {this.addButton()}
      </p>
      )
    }
  }
}

SampleDetailsAnalyses.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.obj,
};

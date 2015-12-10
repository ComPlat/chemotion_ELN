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
    this.props.onSampleChanged(sample);
  }

  handleAdd() {
    const {sample} = this.state;
    // model: sample.createAnalysis()

    let analysis = Analysis.buildEmpty();

    sample.addAnalysis(analysis);

    const newKey = sample.analyses.length - 1;
    this.handleAccordionOpen(newKey);

    this.props.onSampleChanged(sample);
  }

  handleRemove(analysis) {
    const {sample} = this.state;
    // sample.removeAnalysis(analysis)
    const analysisId = sample.analyses.indexOf(analysis);
    sample.analyses.splice(analysisId, 1);
    this.props.onSampleChanged(sample);
  }

  handleAccordionOpen(key) {
    this.setState({activeAnalysis: key});
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        <div className="pull-right" style={{marginTop: -12}}>
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            <i className="fa fa-plus"></i>
          </Button>
        </div>
      )
    }
  }

  render() {
    const {sample, activeAnalysis} = this.state;
    const {readOnly} = this.props;
    if(sample.analyses.length > 0) {
      return (
        <div>
          <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
            {sample.analyses.map((analysis, key) => {
              return (
                <Panel header={analysis.name || " "} key={key} onClick={() => this.handleAccordionOpen(key)} eventKey={key}>
                  <AnalysisComponent
                    readOnly={readOnly}
                    analysis={analysis}
                    onChange={analysis => this.handleChange(analysis)}
                    onRemove={analysis => this.handleRemove(analysis)}
                    />
                </Panel>
              )
            })}
          </PanelGroup>
          {this.addButton()}
        </div>
      );
    } else {
      return (
      <div>
        There are currently no Analyses.<br/>
        {this.addButton()}
      </div>
      )
    }
  }
}

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
    console.log(this.state.sample);
  }

  handleChange(analysis) {
    const {sample} = this.state;
    sample.updateAnalysis(analysis);
    this.props.onSampleChanged(sample);
  }

  handleAdd() {
    console.log("*** handleAdd ***")
    const {sample} = this.state;
    // model: sample.createAnalysis()

    let analysis = Analysis.buildEmpty();
    console.log(analysis);

    sample.addAnalysis(analysis);
    console.log(sample.analyses);

    const newKey = sample.analyses.length - 1;
    this.handleAccordionOpen(newKey);

    this.props.onSampleChanged(sample);

    console.log(sample);
  }

  handleRemove(analysis) {
    const {sample} = this.state;
    // sample.removeAnalysis(analysis)
    const analysisId = sample.analyses.indexOf(analysis);
    sample.analyses.splice(analysisId, 1);
    //
    this.props.onSampleChanged(sample);
    console.log(this.state.sample);
  }

  handleAccordionOpen(key) {
    this.setState({activeAnalysis: key});
  }

  render() {
    const {sample, activeAnalysis} = this.state;
    return (
      <div>
        <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
          {sample.analyses.map((analysis, key) => {
            return (
              <Panel header={analysis.name} key={key} onClick={() => this.handleAccordionOpen(key)} eventKey={key}>
                <AnalysisComponent
                  analysis={analysis}
                  onChange={analysis => this.handleChange(analysis)}
                  onRemove={analysis => this.handleRemove(analysis)}
                  />
              </Panel>
            )
          })}
        </PanelGroup>
        <div className="pull-right" style={{marginTop: -12}}>
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            <i className="fa fa-plus"></i>
          </Button>
        </div>
      </div>
    );
  }
}

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, FormGroup } from 'react-bootstrap';
import Select from 'react-select';
import 'moment-precise-range-plugin';
import { purificationOptions } from './staticDropdownOptions/options';
import MaterialGroupContainer from './MaterialGroupContainer';
import QuillEditor from './QuillEditor';
import Sample from './models/Sample';
import { observationPurification, solventsTL } from './utils/reactionPredefined';

function dummy() { return true; }

export default class ReactionDetailsPurification extends Component {
  constructor(props) {
    super(props);
    this.handlePurificationChange = this.handlePurificationChange.bind(this);
    this.handleOnReactionChange = this.handleOnReactionChange.bind(this);
    this.handleOnSolventSelect = this.handleOnSolventSelect.bind(this);
    this.handlePSolventChange = this.handlePSolventChange.bind(this);
    this.deletePSolvent = this.deletePSolvent.bind(this);
    this.dropPSolvent = this.dropPSolvent.bind(this);
  }

  handleOnReactionChange(reaction) {
    this.props.onReactionChange(reaction);
  }

  handlePurificationChange(selected) {
    if (selected.length === 0) {
      return this.handleMultiselectChange('purification', selected);
    }

    const obs = observationPurification;
    const { reaction } = this.props;

    const selectedVal = selected[selected.length - 1].value;
    const predefinedObs = obs.filter(x =>
      Object.keys(x).filter(k =>
        k.toLowerCase().localeCompare(selectedVal.toLowerCase()) === 0,
      ).length > 0,
    );

    if (predefinedObs.length > 0) {
      const values = selected.map(option => option.value);
      reaction.purification = values;

      const predefined = predefinedObs[0][selectedVal.toLowerCase()];
      reaction.concat_text_observation(predefined);

      this.handleOnReactionChange(reaction);
    } else {
      this.handleMultiselectChange('purification', selected);
    }

    return 0;
  }

  handlePSolventChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const { reaction, onReactionChange } = this.props;
    const updatedSample = reaction.sampleById(sampleID);
    updatedSample.setAmount(amount);
    onReactionChange(reaction);
  }

  deletePSolvent(material) {
    const { reaction, onReactionChange } = this.props;
    reaction.deleteMaterial(material, 'purification_solvents');
    onReactionChange(reaction);
  }

  dropPSolvent(srcSample, tagMaterial, tagGroup, extLabel) {
    const { reaction, onReactionChange } = this.props;
    const splitSample = Sample.buildNew(srcSample, reaction.collection_id, tagGroup);
    splitSample.short_label = tagGroup.slice(0, -1);
    splitSample.external_label = extLabel;
    reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
    onReactionChange(reaction, { schemaChanged: true });
  }

  handleMultiselectChange(type, selectedOptions) {
    const values = selectedOptions.map(option => option.value);
    const wrappedEvent = { target: { value: values } };
    this.props.onInputChange(type, wrappedEvent);
  }

  handleOnSolventSelect(eventKey) {
    const { reaction } = this.props;
    let val;
    if (eventKey > solventsTL.length) {
      val = '';
    } else {
      const key = Object.keys(solventsTL[eventKey])[0];
      val = solventsTL[eventKey][key];
    }
    reaction.tlc_solvents = val;
    this.handleOnReactionChange(reaction);
  }

  render() {
    const { reaction, onInputChange, additionQuillRef } = this.props;
    return (
      <span>
        <Row>
          <Col md={12}>
            <div><b>Purification</b></div>
            <Select
              className="status-select"
              style={{ zIndex: 10 }}
              name="purification"
              multi
              disabled={reaction.isMethodDisabled('purification')}
              options={purificationOptions}
              onChange={this.handlePurificationChange}
              value={reaction.purification}
            />
          </Col>
        </Row>
        <Row style={{ marginTop: '10px' }}>
          <Col md={12}>
            <div><b>Purification Solvents</b></div>
            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="purification_solvents"
              materials={reaction.purification_solvents}
              dropMaterial={dummy}
              deleteMaterial={this.deletePSolvent}
              dropSample={this.dropPSolvent}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={this.handlePSolventChange}
              headIndex={0}
            />
          </Col>
        </Row>
        <Row style={{ marginTop: '10px' }}>
          <Col md={12}>
            <FormGroup>
              <div><b>Additional information for publication and purification details</b></div>
              <div className="quill-resize">
                <QuillEditor
                  ref={additionQuillRef}
                  value={reaction.observation}
                  height="100%"
                  disabled={reaction.isMethodDisabled('observation')}
                  onChange={event => onInputChange('observation', event)}
                />
              </div>
            </FormGroup>
          </Col>
        </Row>
      </span>
    );
  }
}

ReactionDetailsPurification.propTypes = {
  reaction: PropTypes.object,
  onReactionChange: PropTypes.func,
  onInputChange: PropTypes.func,
  additionQuillRef: PropTypes.object
};

ReactionDetailsPurification.defaultProps = {
  reaction: {},
  onReactionChange: () => {},
  onInputChange: () => {},
  additionQuillRef: {}
};

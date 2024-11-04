import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Form } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import 'moment-precise-range-plugin';
import { purificationOptions } from 'src/components/staticDropdownOptions/options';
import MaterialGroupContainer from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroupContainer';
import QuillEditor from 'src/components/QuillEditor';
import QuillViewer from 'src/components/QuillViewer';
import Sample from 'src/models/Sample';
import { observationPurification, solventsTL } from 'src/utilities/reactionPredefined';
import { permitOn } from 'src/components/common/uis';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';

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
    if (selected.lenth == 0) {
      return this.handleMultiselectChange('purification', []);
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
      <>
        <Row className='mb-2'>
          <Col sm={12}>
            <Form.Group>
              <Form.Label>Purification</Form.Label>
              <Select
                name="purification"
                isMulti
                isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('purification')}
                options={purificationOptions}
                onChange={this.handlePurificationChange}
                value={purificationOptions.filter(({value}) => reaction.purification.includes(value))}
              />
            </Form.Group>
          </Col>
        </Row>
        <Row className='mb-2'>
          <Col sm={12}>
            <Form.Label>Purification Solvents</Form.Label>
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
        <Row className='mb-3'>
          <Col md={12}>
            <Form.Label>Additional information for publication and purification details</Form.Label>
            <div className="quill-resize">
              {
                permitOn(reaction) ?
                  <QuillEditor
                    ref={additionQuillRef}
                    value={reaction.observation}
                    height="100%"
                    disabled={!permitOn(reaction) || reaction.isMethodDisabled('observation')}
                    onChange={event => onInputChange('observation', event)}
                  /> : <QuillViewer value={reaction.observation} />
              }
            </div>
            <PrivateNoteElement element={reaction} disabled={!reaction.can_update} />
          </Col>
        </Row>
      </>
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

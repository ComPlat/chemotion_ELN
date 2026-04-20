import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Form } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import 'moment-precise-range-plugin';
import { purificationOptions } from 'src/components/staticDropdownOptions/options';
import MaterialGroup from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import QuillEditor from 'src/components/QuillEditor';
import QuillViewer from 'src/components/QuillViewer';
import Sample from 'src/models/Sample';
import { observationPurification, solventsTL } from 'src/utilities/reactionPredefined';
import { permitOn } from 'src/components/common/uis';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import { EditUserLabels } from 'src/components/UserLabels';

function dummy() { return true; }

function ReactionDetailsPurification({
  reaction,
  onReactionChange,
  onInputChange,
  additionQuillRef,
  onChange,
}) {
  const handleMultiselectChange = useCallback((type, selectedOptions) => {
    const values = selectedOptions.map(option => option.value);
    const wrappedEvent = { target: { value: values } };
    onInputChange(type, wrappedEvent);
  }, [onInputChange]);

  const handleOnReactionChange = useCallback((rxn) => {
    onReactionChange(rxn);
  }, [onReactionChange]);

  const handlePurificationChange = useCallback((selected) => {
    if (selected.length === 0) {
      return handleMultiselectChange('purification', []);
    }

    const obs = observationPurification;

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

      handleOnReactionChange(reaction);
    } else {
      handleMultiselectChange('purification', selected);
    }
  }, [reaction, handleOnReactionChange, handleMultiselectChange]);

  const deletePSolvent = useCallback((material) => {
    reaction.deleteMaterial(material, 'purification_solvents');
    onReactionChange(reaction);
  }, [reaction, onReactionChange]);

  const dropPSolvent = useCallback((srcSample, tagMaterial, tagGroup, extLabel) => {
    const splitSample = Sample.buildNew(srcSample, reaction.collection_id, tagGroup);
    splitSample.short_label = tagGroup.slice(0, -1);
    splitSample.external_label = extLabel;
    reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
    onReactionChange(reaction, { updateGraphic: true });
  }, [reaction, onReactionChange]);

  const handleOnSolventSelect = useCallback((eventKey) => {
    let val;
    if (eventKey > solventsTL.length) {
      val = '';
    } else {
      const key = Object.keys(solventsTL[eventKey])[0];
      val = solventsTL[eventKey][key];
    }
    reaction.tlc_solvents = val;
    handleOnReactionChange(reaction);
  }, [reaction, handleOnReactionChange]);

  return (
    <>
      <Row className="mb-3">
        <Col sm={12}>
          <Form.Group>
            <Form.Label>Purification</Form.Label>
            <Select
              name="purification"
              isMulti
              isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('purification')}
              options={purificationOptions}
              onChange={handlePurificationChange}
              value={purificationOptions.filter(({ value }) => reaction.purification.includes(value))}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col sm={12}>
          <Form.Label>Purification solvents</Form.Label>
          <MaterialGroup
            reaction={reaction}
            materialGroup="purification_solvents"
            materials={reaction.purification_solvents}
            dropMaterial={dummy}
            deleteMaterial={deletePSolvent}
            dropSample={dropPSolvent}
            showLoadingColumn={!!reaction.hasPolymers()}
            onChange={onChange}
          />
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={12}>
          <Form.Label>Additional information for publication and purification details</Form.Label>
          <div>
            {
              permitOn(reaction) ? (
                <QuillEditor
                  ref={additionQuillRef}
                  value={reaction.observation}
                  height="100%"
                  disabled={!permitOn(reaction) || reaction.isMethodDisabled('observation')}
                  onChange={(event) => onInputChange('observation', event)}
                />
              ) : <QuillViewer value={reaction.observation} />
            }
          </div>
          <div className="mx-0 mt-2">
            <EditUserLabels element={reaction} fnCb={handleOnReactionChange} />
          </div>
          <PrivateNoteElement element={reaction} disabled={!reaction.can_update} />
        </Col>
      </Row>
    </>
  );
}

ReactionDetailsPurification.propTypes = {
  reaction: PropTypes.object,
  onReactionChange: PropTypes.func,
  onInputChange: PropTypes.func,
  additionQuillRef: PropTypes.object,
  onChange: PropTypes.func,
};

ReactionDetailsPurification.defaultProps = {
  reaction: {},
  onReactionChange: () => {},
  onInputChange: () => {},
  onChange: () => {},
  additionQuillRef: {}
};

export default ReactionDetailsPurification;

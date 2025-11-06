import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Table, Card
} from 'react-bootstrap';
import Molecule from 'src/models/Molecule';
import { Select } from 'src/components/common/Select';
import { defaultMultiSolventsSmilesOptions } from 'src/components/staticDropdownOptions/options';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

function SolventDetails({
  solvent, deleteSolvent, onChangeSolvent, sampleType
}) {
  const [purityInput, setPurityInput] = React.useState(solvent?.purity ?? 1.0);

  // Update when solvent prop changes (important if parent updates solvents)
  React.useEffect(() => {
    setPurityInput(solvent.purity ?? 1.0);
  }, [solvent.purity]);

  if (!solvent) {
    return null;
  }

  const changeLabel = (event) => {
    solvent.label = event.target.value;
    onChangeSolvent(solvent);
  };

  const changeRatio = (event) => {
    solvent.ratio = event.target.value;
    onChangeSolvent(solvent);
  };

  const changeVolume = (event) => {
    solvent.amount_l = event.value;
    onChangeSolvent(solvent);
  };

  /**
   * Handles purity input changes while typing.
   * Updates the input field state to show what the user types (including invalid values)
   * and displays an error notification if the parsed value is outside the valid range (0-1).
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event from the input field
   */
  const changePurity = (event) => {
    const { value } = event.target;
    setPurityInput(value);

    const num = parseFloat(value);
    if (!Number.isNaN(num) && (num < 0 || num > 1)) {
      NotificationActions.add({
        message: 'Purity value should be ≥ 0 and ≤ 1',
        level: 'error',
      });
    }
  };

  /**
   * Handles purity input blur event.
   * Validates the current input value and commits it to the solvent object.
   * If the value is invalid (NaN, < 0, or > 1), it resets to the default value of 1.0.
   * Updates both the local state and the solvent object, then notifies the parent component.
   */
  const handlePurityBlur = () => {
    let num = parseFloat(purityInput);

    if (Number.isNaN(num) || num < 0 || num > 1) {
      num = 1.0; // Reset to default valid value
    }

    solvent.purity = num;
    setPurityInput(num); // Update input field
    onChangeSolvent(solvent);
  };

  const changeVendor = (event) => {
    solvent.vendor = event.target.value;
    onChangeSolvent(solvent);
  };

  // onChangeRatio
  const metricPrefixes = ['m', 'n', 'u'];
  const hasValidMetrics = solvent.metrics && solvent.metrics.length > 2;
  const isValidPrefix = hasValidMetrics && metricPrefixes.includes(solvent.metrics[1]);
  const metric = isValidPrefix ? solvent.metrics[1] : 'm';

  return (
    <tr>
      <td>
        <Form.Control
          type="text"
          name="solvent_label"
          value={solvent.label}
          onChange={changeLabel}
          disabled
        />
      </td>
      {sampleType && sampleType === 'Mixture' && (
        <td className="align-bottom">
          <NumeralInputWithUnitsCompo
            value={solvent.amount_l}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            onChange={changeVolume}
          />
        </td>
      )}
      <td>
        <Form.Control
          type="text"
          name="solvent_ratio"
          value={solvent.ratio}
          onChange={changeRatio}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          name="solvent_purity"
          value={purityInput}
          onChange={changePurity}
          onBlur={handlePurityBlur}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          name="solvent_vendor"
          value={solvent.vendor}
          onChange={changeVendor}
        />
      </td>
      <td>
        <Button
          variant="danger"
          onClick={() => deleteSolvent(solvent)}
          style={{
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fa fa-trash-o fa-lg" />
        </Button>
      </td>
    </tr>
  );
}

function SampleSolventGroup({
  materialGroup, sample, dropSample, deleteSolvent, onChangeSolvent
}) {
  const sampleSolvents = sample.solvent ?? [];
  const sampleType = sample.sample_type;

  const createDefaultSolvents = (event) => {
    const solvent = event.value;
    const smi = solvent.smiles;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        const d = molecule.density;
        const solventDensity = solvent.density || 1;
        molecule.density = (d && d > 0) || solventDensity;
        dropSample(molecule, null, materialGroup, solvent.external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
        NotificationActions.add({
          title: 'Error',
          message: 'Failed to fetch molecule data.',
          level: 'error',
          dismissible: true,
          autoDismiss: 5
        });
      });
  };

  const solventOptions = Object.keys(ionic_liquids).reduce((solvents, ionicLiquid) => solvents.concat({
    label: ionicLiquid,
    value: {
      external_label: ionicLiquid,
      smiles: ionic_liquids[ionicLiquid],
      density: 1.0
    }
  }), defaultMultiSolventsSmilesOptions);

  return (
    <Card>
      <Card.Header>Solvents</Card.Header>
      <Card.Body>
        <Select
          name="default solvents"
          options={solventOptions}
          placeholder="Select solvents or drag-n-drop molecules from the sample list"
          onChange={createDefaultSolvents}
        />
        {sampleSolvents.length > 0 && (
          <Table className="mt-2">
            <thead>
              <tr>
                <td>Label</td>
                {sampleSolvents && sampleSolvents.length > 0 && sampleType === 'Mixture' && (
                  <td>Volume</td>
                )}
                <td>Ratio</td>
                <td>Purity</td>
                <td>Vendor</td>
                <td>Action</td>
              </tr>
            </thead>

            <tbody>
              {sampleSolvents.map((solv) => (
                <SolventDetails
                  key={`${solv.label}-${solv.inchikey}`}
                  solvent={solv}
                  deleteSolvent={deleteSolvent}
                  onChangeSolvent={onChangeSolvent}
                  sampleType={sampleType}
                />
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

SampleSolventGroup.propTypes = {
  sample: PropTypes.object.isRequired,
  dropSample: PropTypes.func.isRequired,
  deleteSolvent: PropTypes.func.isRequired,
  onChangeSolvent: PropTypes.func.isRequired,
  materialGroup: PropTypes.string.isRequired,
};

export { SampleSolventGroup, SolventDetails };

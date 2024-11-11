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

function SolventDetails({ solvent, deleteSolvent, onChangeSolvent, sampleType }) {
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

  // onChangeRatio
  const metricPrefixes = ['m', 'n', 'u'];
  const metric = (solvent.metrics && solvent.metrics.length > 2 && metricPrefixes.indexOf(solvent.metrics[1]) > -1) ? solvent.metrics[1] : 'm';

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
          type="number"
          name="solvent_ratio"
          value={solvent.ratio}
          onChange={changeRatio}
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

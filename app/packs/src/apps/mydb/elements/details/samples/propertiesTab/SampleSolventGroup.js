import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Table, Card
} from 'react-bootstrap';
import Molecule from 'src/models/Molecule';
import Select from 'react-select3';
import { defaultMultiSolventsSmilesOptions } from 'src/components/staticDropdownOptions/options';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

function SolventDetails({ solvent, deleteSolvent, onChangeSolvent }) {
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

  // onChangeRatio
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
  materialGroup: PropTypes.string.isRequired,
  headIndex: PropTypes.number.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool,
  addDefaultSolvent: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool
};

SampleSolventGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false
};

export { SampleSolventGroup, SolventDetails };

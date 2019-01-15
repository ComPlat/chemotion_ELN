import { Map, List } from 'immutable';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import 'whatwg-fetch';
import XLSX from 'xlsx';

import {
  ButtonGroup,
  Button,
  DropdownButton,
  MenuItem
} from 'react-bootstrap';

import { catalyst } from '../../staticDropdownOptions/reagents/catalyst';
import { chiralAuxiliaries } from '../../staticDropdownOptions/reagents/chiral_auxiliaries';
import { couplingReagents } from '../../staticDropdownOptions/reagents/coupling_reagents';
import { fluorination } from '../../staticDropdownOptions/reagents/fluorination';
import { halogenationBrClI } from '../../staticDropdownOptions/reagents/halogenation_BrClI';
import { ionicLiquids } from '../../staticDropdownOptions/reagents/ionic_liquids';
import { lewisAcids } from '../../staticDropdownOptions/reagents/lewis_acids';
import { ligands } from '../../staticDropdownOptions/reagents/ligands';
import { metallorganics } from '../../staticDropdownOptions/reagents/metallorganics';
import { orgBases } from '../../staticDropdownOptions/reagents/org_bases';
import { organoboron } from '../../staticDropdownOptions/reagents/organoboron';
import { organocatalysts } from '../../staticDropdownOptions/reagents/organocatalysts';
import { oxidation } from '../../staticDropdownOptions/reagents/oxidation';
import { phaseTransferReagents } from '../../staticDropdownOptions/reagents/phase_transfer_reagents';
import { reducingReagents } from '../../staticDropdownOptions/reagents/reducing_reagents';
import { solvents } from '../../staticDropdownOptions/reagents/solvents';

import SmiSelect from './SmiSelect';
import {
  extractReaction,
  generateExcelMoleculeRow,
  generateExcelReactionRow
} from '../utils';

const allReagents = Object.assign(
  {}, ionicLiquids, catalyst, ligands,
  chiralAuxiliaries, couplingReagents, halogenationBrClI, fluorination,
  orgBases, lewisAcids, organocatalysts, organoboron, metallorganics,
  oxidation, reducingReagents, phaseTransferReagents
);

export default class HeaderMenu extends Component {
  constructor(props) {
    super(props);

    this.clickUploadMolecule = this.clickUploadMolecule.bind(this);
    this.clickUploadReaction = this.clickUploadReaction.bind(this);

    this.scanFilesForMolecules = this.scanFilesForMolecules.bind(this);
    this.scanFilesForReactions = this.scanFilesForReactions.bind(this);
    this.addReagents = this.addReagents.bind(this);

    this.exportCml = this.exportCml.bind(this);
    this.exportExcel = this.exportExcel.bind(this);
  }

  exportCml() {
    const { reactions, molecules } = this.props;

    let selectedR = reactions.filter(r => r.get('selected'));
    let selectedM = molecules.filter(r => r.get('selected'));
    if (selectedR.size === 0 && selectedM.size === 0) {
      selectedR = reactions;
      selectedM = molecules;
    }

    const simpleReactions = selectedR.toJS().map(r => ({
      ...extractReaction(r),
      yield: r.yield || '',
      time: r.time || '',
      temperature: r.temperature || '',
      description: r.description || ''
    }));

    const simpleMolecules = selectedM.toJS().map(m => ({
      id: m.id,
      mdl: m.mdl,
    }));

    fetch('/api/v1/chemscanner/export/cml', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ reactions: simpleReactions, molecules: simpleMolecules })
    }).then((response) => {
      if (response.ok === false) return null;

      return response.json();
    }).then((res) => {
      if (!res) return;

      const a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      ['reactions', 'molecules'].forEach((group) => {
        const url = window.URL.createObjectURL(new Blob([res[group]]));
        a.href = url;
        a.download = `chemscanner_${group}.cml`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  exportExcel() {
    const { reactions, molecules } = this.props;
    let selectedR = reactions.filter(r => r.get('selected'));
    let selectedM = molecules.filter(r => r.get('selected'));
    if (selectedR.size === 0 && selectedM.size === 0) {
      selectedR = reactions;
      selectedM = molecules;
    }

    const wb = {};
    wb.SheetNames = [];
    wb.Sheets = {};

    const moleculeSheet = 'Molecules';
    const moleculeRows = selectedM.toJS().reduce((rows, mol) => {
      rows.push(generateExcelMoleculeRow(mol));
      return rows;
    }, [['Smiles', 'MDL', 'Description']]);
    const moleculeWs = XLSX.utils.aoa_to_sheet(moleculeRows);
    wb.SheetNames.push(moleculeSheet);
    wb.Sheets[moleculeSheet] = moleculeWs;

    const reactionSheet = 'Reactions';
    const reactionRows = selectedR.toJS().reduce((rows, reaction) => {
      rows.push(generateExcelReactionRow(reaction));
      return rows;
    }, [[
      'ReactionSmiles', 'Temperature', 'Yield', 'Time', 'Reaction Description',
      'Reactants SDF', 'Reagents SDF', 'Products SDF',
      'Reactants Description', 'Products Description',
    ]]);
    const reactionWs = XLSX.utils.aoa_to_sheet(reactionRows);
    wb.SheetNames.push(reactionSheet);
    wb.Sheets[reactionSheet] = reactionWs;

    XLSX.writeFile(wb, 'chemscanner.xlsx', { bookSST: true });
  }

  scanFilesForMolecules() {
    const { scanFile } = this.props;
    const { files } = this.molInput;
    scanFile(Array.from(files), true);

    this.molInput.value = '';
  }

  scanFilesForReactions() {
    const { scanFile } = this.props;
    const { files } = this.reactionInput;
    scanFile(Array.from(files), false);

    this.reactionInput.value = '';
  }

  addReagents({ value, type }) {
    const { addSmi, reactions } = this.props;
    addSmi(reactions, value, type);
  }

  clickUploadMolecule() {
    this.molInput.click();
    document.getElementById('chemscanner-scan-file-dd').click();
  }

  clickUploadReaction() {
    this.reactionInput.click();
    document.getElementById('chemscanner-scan-file-dd').click();
  }

  render() {
    const {
      ui, reactions, cleanUp, toggleAbbView,
    } = this.props;

    const isAbb = ui.get('abbView');
    const switchText = isAbb ? 'Extracted Items' : 'Abbreviation Management';
    // const partition = partitionSolventsReagents(value);
    const selectedR = reactions.filter(r => r.get('selected'));
    const disabled = selectedR.size === 0;
    const selectedReagents = (
      disabled ? [] : (selectedR.getIn([0, 'addedReagentsSmi']) || List()).toArray()
    );
    const selectedSolvents = (
      disabled ? [] : (selectedR.getIn([0, 'addedSolventsSmi']) || List()).toArray()
    );

    return (
      <div className="chemscanner-menu">
        <input
          type="file"
          multiple="multiple"
          style={{ display: 'none' }}
          ref={(molInput) => { this.molInput = molInput; }}
          onChange={this.scanFilesForMolecules}
        />
        <input
          type="file"
          multiple="multiple"
          style={{ display: 'none' }}
          ref={(reactionInput) => { this.reactionInput = reactionInput; }}
          onChange={this.scanFilesForReactions}
        />
        <ButtonGroup>
          <DropdownButton
            title="Scan File"
            id="chemscanner-scan-file-dd"
          >
            <MenuItem className="chemscanner-menu-item" onSelect={this.clickUploadReaction}>
              Scan for reactions
            </MenuItem>
            <MenuItem className="chemscanner-menu-item" onSelect={this.clickUploadMolecule}>
              Scan for molecules
            </MenuItem>
          </DropdownButton>
        </ButtonGroup>
        <ButtonGroup>
          <Button onClick={cleanUp}>Clean Up</Button>
        </ButtonGroup>
        <div style={{ width: '160px' }}>
          <SmiSelect
            disabled={disabled}
            obj={solvents}
            type="solvents"
            value={selectedSolvents}
            onSelect={this.addReagents}
          />
        </div>
        <div style={{ width: '200px' }}>
          <SmiSelect
            disabled={disabled}
            obj={allReagents}
            onSelect={this.addReagents}
            value={selectedReagents}
            type="reagents"
            optionHeight={80}
          />
        </div>
        <ButtonGroup>
          <DropdownButton title="Export" id="chemscanner-export-dd">
            <MenuItem eventKey="1" onSelect={this.exportCml}>CML</MenuItem>
            <MenuItem eventKey="2" onSelect={this.exportExcel}>Excel</MenuItem>
          </DropdownButton>
        </ButtonGroup>
        &nbsp;
        &nbsp;
        <ButtonGroup>
          <Button onClick={toggleAbbView}>{switchText}</Button>
        </ButtonGroup>
      </div>
    );
  }
}

HeaderMenu.propTypes = {
  ui: PropTypes.instanceOf(Map).isRequired,
  reactions: PropTypes.instanceOf(List).isRequired,
  molecules: PropTypes.instanceOf(List).isRequired,
  scanFile: PropTypes.func.isRequired,
  cleanUp: PropTypes.func.isRequired,
  toggleAbbView: PropTypes.func.isRequired,
  addSmi: PropTypes.func.isRequired,
};

/* eslint-disable react/sort-comp */
import React, { Component } from 'react';
import {
  Table, Button, Tooltip, OverlayTrigger, Badge,
} from 'react-bootstrap';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementReactionLabels from 'src/apps/mydb/elements/labels/ElementReactionLabels';
import ElementWellplateLabels from 'src/apps/mydb/elements/labels/ElementWellplateLabels';
import GenericElementLabels from 'src/apps/mydb/elements/labels/GenericElementLabels';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import ChemrepoLabels from 'src/apps/mydb/elements/labels/ChemrepoLabels';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';

import UIStore from 'src/stores/alt/stores/UIStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import { DragDropItemTypes } from 'src/utilities/DndConst';
import SampleName from 'src/components/common/SampleName';
import { sampleShowOrNew } from 'src/utilities/routesUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import ChevronIcon from 'src/components/common/ChevronIcon';
import { getDisplayedMoleculeGroup, getMoleculeGroupsShown } from 'src/utilities/SampleUtils'

const buildFlattenSampleIds = (displayedMoleculeGroup) => {
  let flatIndex = 0;
  const flattenSamplesId = [];

  displayedMoleculeGroup.forEach((groupSample, index) => {
    const length = displayedMoleculeGroup[index].numSamples;
    for (let i = 0; i < length; i++) {
      flattenSamplesId[flatIndex + i] = groupSample[i].id;
    }
    flatIndex += length;
  });

  return flattenSamplesId;
};

const showDetails = (id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/sample/${id}`;
  Aviator.navigate(uri, { silent: true });
  sampleShowOrNew({ params: { sampleID: id, collectionID: currentCollection.id } });
};

const dragColumn = (element, sourceType) => (
  <td className="text-center align-middle">
    <ElementDragHandle
      sourceType={sourceType}
      element={element}
    />
  </td>
);

function TopSecretIcon({ element }) {
  if (element.type === 'sample' && element.is_top_secret === true) {
    const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <i className="fa fa-user-secret" />
      </OverlayTrigger>
    );
  }
  return null;
}

TopSecretIcon.propTypes = {
  element: PropTypes.object,
};

function XvialIcon({ label }) {
  return (label || '').match(/^X\d+.*/) ? (
    <i className="icon-xvial px-1 fs-5" />
  ) : null;
}

XvialIcon.propTypes = {
  label: PropTypes.string,
};

XvialIcon.defaultProps = {
  label: ''
};

const showDecoupledIcon = (sample) => (sample.decoupled ? (
  <OverlayTrigger placement="top" overlay={<Tooltip id="tip_decoupled_icon">is decoupled from molecule</Tooltip>}>
    <Button size="xxsm" variant="light"><i className="fa fa-chain-broken" aria-hidden="true" /></Button>
  </OverlayTrigger>
) : null);

const showInventoryLabelIcon = (sample) => (sample.inventory_sample && sample.inventory_label ? (
  <OverlayTrigger
    placement="top"
    overlay={<Tooltip id="sample_inventory_label">Inventory Label</Tooltip>}
  >
    <Badge
      className="bg-info text-light p-1 mt-0 rounded"
      key={`inventory_label_${sample.inventory_label}`}
    >
      {sample.inventory_label}
    </Badge>
  </OverlayTrigger>
) : null);

const overlayToggle = <Tooltip id="toggle_molecule">Toggle Molecule</Tooltip>;

const svgPreview = (sample) => (
  <SvgWithPopover
    hasPop
    previewObject={{
      txtOnly: '',
      isSVG: true,
      src: sample.svgPath
    }}
    popObject={{
      title: sample.molecule_iupac_name,
      src: sample.svgPath,
      height: '26vh',
      width: '52vw',
    }}
  />
);

function MoleculeHeader({ sample, show, showPreviews, onClick }) {
  const isNoStructureSample = sample.molecule?.inchikey === 'DUMMY' && sample.molfile == null;

  return (
    <tr
      className="bg-gray-100"
      role="button"
      onClick={onClick}
    >
      {isNoStructureSample
        ? (
          <td colSpan="3" className="position-relative">
            <div>
              <h4>
                (No-structure sample)
              </h4>
            </div>
          </td>
        )
        : (
          <td colSpan="2">
            <div className="d-flex align-items-start gap-1">
              {showPreviews && svgPreview(sample)}
              <h4 className="flex-grow-1"><SampleName sample={sample} /></h4>
              <div className="d-flex align-items-center gap-1">
                {sample.molecule.chem_repo && sample.molecule.chem_repo.id && <ChemrepoLabels chemrepoId={sample.molecule.chem_repo.id} />}
                <PubchemLabels element={sample} />
                <ComputedPropLabel cprops={sample.molecule_computed_props} />
                <OverlayTrigger placement="bottom" overlay={overlayToggle}>
                  <ChevronIcon direction={show ? 'down' : 'right'} color="primary"/>
                </OverlayTrigger>
              </div>
            </div>
          </td>
        )}
      {!isNoStructureSample && dragColumn(sample, DragDropItemTypes.MOLECULE)}
    </tr>
  );
}

export default class ElementsTableSampleEntries extends Component {
  constructor(props) {
    super(props);

    const { showPreviews } = UIStore.getState();
    this.state = {
      displayedMoleculeGroup: [],
      showPreviews,
      flattenSamplesId: [],
      keyboardIndex: null,
      keyboardSeletectedElementId: null,
    };

    this.sampleOnKeyDown = this.sampleOnKeyDown.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  componentDidMount() {
    KeyboardStore.listen(this.sampleOnKeyDown);
    UIStore.listen(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    const { showPreviews } = state;
    if (this.state.showPreviews !== showPreviews) {
      this.setState({ showPreviews });
    }
  }

  componentDidUpdate(prevProps) {
    const { elements, moleculeSort, collapseAll } = this.props;

    if (elements === prevProps.elements && moleculeSort === prevProps.moleculeSort) {
      return;
    }

    const displayedMoleculeGroup = getDisplayedMoleculeGroup(elements, moleculeSort);
    const moleculeGroupsShown = getMoleculeGroupsShown(displayedMoleculeGroup);

    this.props.onChangeCollapse(collapseAll, 'moleculeGroupsShown', moleculeGroupsShown);

    this.setState({
      displayedMoleculeGroup,
      flattenSamplesId: buildFlattenSampleIds(displayedMoleculeGroup),
    }, this.forceUpdate());
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.sampleOnKeyDown);
    UIStore.unlisten(this.onUIStoreChange);
  }

  handleMoleculeToggle(moleculeName, showGroup) {

    const { moleculeGroupsShown } = this.props;

    let moleculeGroupsShownUpdated = [];
    if (showGroup) {
      moleculeGroupsShownUpdated = moleculeGroupsShown.filter((item) => item !== moleculeName);
    }
    else {
      moleculeGroupsShownUpdated = moleculeGroupsShown.concat(moleculeName);
    }
    this.props.onChangeCollapse(false, 'moleculeGroupsShown', moleculeGroupsShownUpdated);
  }

  sampleOnKeyDown(state) {
    const { context } = state;
    if (context != 'sample') { return false; }

    const { documentKeyDownCode } = state;
    let { keyboardIndex, keyboardSeletectedElementId, flattenSamplesId } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSeletectedElementId != null) {
          showDetails(keyboardSeletectedElementId);
        }
        break;
      case 38: // Up
        if (keyboardIndex > 0) {
          keyboardIndex--;
        } else {
          keyboardIndex = 0;
        }
        break;
      case 40: // Down
        if (keyboardIndex == null) {
          keyboardIndex = 0;
        } else if (keyboardIndex < (flattenSamplesId.length - 1)) {
          keyboardIndex++;
        }
        break;
      default:
        break;
    }

    keyboardSeletectedElementId = flattenSamplesId[keyboardIndex];
    this.setState({ keyboardIndex, keyboardSeletectedElementId });
  }

  showMoreSamples(index) {
    const { displayedMoleculeGroup } = this.state;
    let length = displayedMoleculeGroup[index].numSamples;
    length += 3;
    if (displayedMoleculeGroup[index].length < length) {
      length = displayedMoleculeGroup[index].length;
    }
    displayedMoleculeGroup[index].numSamples = length;

    this.setState({
      displayedMoleculeGroup,
      flattenSamplesId: buildFlattenSampleIds(displayedMoleculeGroup)
    }, this.forceUpdate());
  }

  isElementChecked(element) {
    const { ui: { checkedIds = [], uncheckedIds = [], checkedAll } } = this.props;
    return (checkedAll && !uncheckedIds.includes(element.id)) || checkedIds.includes(element.id);
  }

  renderSamples(samples, index) {
    const { keyboardSeletectedElementId, displayedMoleculeGroup } = this.state;
    const { isElementSelected } = this.props;
    const { length } = samples;
    const { numSamples } = displayedMoleculeGroup[index];

    const sampleRows = samples.slice(0, numSamples).map((sample) => {
      const selected = isElementSelected(sample);
      const applyHighlight = selected || keyboardSeletectedElementId === sample.id

      return (
        <tr key={sample.id} className={classnames({ 'text-bg-primary': applyHighlight })}>
          <td width="30px">
            <ElementCheckbox
              element={sample}
              key={sample.id}
              checked={this.isElementChecked(sample)}
            />
          </td>
          <td
            onClick={() => showDetails(sample.id)}
            role="button"
          >
            <div className="d-flex justify-content-between flex-wrap">
              {sample.title(selected)}

              <div className="d-flex align-items-center gap-1 flex-wrap">
                {showInventoryLabelIcon(sample)}
                <CommentIcon commentCount={sample.comment_count} />
                <ShowUserLabels element={sample} />
                <XvialIcon label={sample.external_label} />
                <div className="d-flex align-items-center gap-1 ms-auto">
                  <ElementReactionLabels element={sample} key={`${sample.id}_reactions`} />
                  <ElementWellplateLabels element={sample} key={`${sample.id}_wellplate`} />
                  <GenericElementLabels element={sample} key={`${sample.id}_element`} />
                  <ElementCollectionLabels element={sample} key={`${sample.id}`} />
                  <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
                </div>
                {showDecoupledIcon(sample)}
                <TopSecretIcon element={sample} />
              </div>
            </div>
          </td>
          {dragColumn(sample, DragDropItemTypes.SAMPLE)}
        </tr>
      );
    });

    if (numSamples < length) {
      const showMoreSamples = (
        <tr key={`${index}_showMore`}>
          <td colSpan="3" className="p-0">
            <Button
              variant="info"
              onClick={() => this.showMoreSamples(index)}
              className="w-100"
            >
              Show more samples
            </Button>
          </td>

        </tr>
      );
      sampleRows.push(showMoreSamples);
    }

    return sampleRows;
  }

  renderMoleculeGroup(moleculeGroup, index) {
    const { moleculeGroupsShown } = this.props;
    const { showPreviews } = this.state;
    const { molecule } = moleculeGroup[0];
    const moleculeName = molecule.iupac_name || molecule.inchistring;
    const showGroup = moleculeGroupsShown.includes(moleculeName);

    return (
      <tbody key={index}>
        <MoleculeHeader
          sample={moleculeGroup[0]}
          show={showGroup}
          showPreviews={showPreviews}
          onClick={() => this.handleMoleculeToggle(moleculeName, showGroup )}
        />
        {showGroup ? this.renderSamples(moleculeGroup, index) : null}
      </tbody>
    );
  }

  render() {
    const { displayedMoleculeGroup } = this.state;
    return (
      <Table className="sample-entries">
        {Object.keys(displayedMoleculeGroup).map((group, index) => {
          const moleculeGroup = displayedMoleculeGroup[group];
          const { numSamples } = displayedMoleculeGroup[group];
          return this.renderMoleculeGroup(moleculeGroup, index, numSamples);
        })}
      </Table>
    );
  }
}

ElementsTableSampleEntries.propTypes = {
  onChangeCollapse: PropTypes.func,
  collapseAll: PropTypes.bool,
  elements: PropTypes.array,
  isElementSelected: PropTypes.func.isRequired,
  ui: PropTypes.object,
  moleculeSort: PropTypes.bool,
};

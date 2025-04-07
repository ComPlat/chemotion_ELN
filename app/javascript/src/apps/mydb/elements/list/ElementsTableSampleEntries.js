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
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import ChevronIcon from 'src/components/common/ChevronIcon';
import { getDisplayedMoleculeGroup } from 'src/utilities/SampleUtils';

const buildFlattenSampleIds = (groups) => {
  let flatIndex = 0;
  const flattenSamplesId = [];

  groups.forEach((groupSample, index) => {
    const length = groups[index].numSamples;
    for (let i = 0; i < length; i++) {
      flattenSamplesId[flatIndex + i] = groupSample[i].id;
    }
    flatIndex += length;
  });

  return flattenSamplesId;
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
    const { elements, moleculeSort } = props;
    const groups = getDisplayedMoleculeGroup(elements, moleculeSort);

    this.state = {
      groups,
      showPreviews,
      flattenSamplesId: [],
      keyboardIndex: null,
      keyboardSeletectedElementId: buildFlattenSampleIds(groups),
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
    const { elements, moleculeSort } = this.props;
    if (prevProps.elements !== elements || prevProps.moleculeSort !== moleculeSort) {
      const displayedMoleculeGroup = getDisplayedMoleculeGroup(elements, moleculeSort);
      this.setState({
        groups: displayedMoleculeGroup,
        flattenSamplesId: buildFlattenSampleIds(displayedMoleculeGroup),
      });
    }
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.sampleOnKeyDown);
    UIStore.unlisten(this.onUIStoreChange);
  }

  sampleOnKeyDown(state) {
    const { context } = state;
    if (context != 'sample') { return false; }

    const { documentKeyDownCode } = state;
    let { keyboardIndex, keyboardSeletectedElementId, flattenSamplesId } = this.state;
    const { showDetails } = this.props;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSeletectedElementId != null) {
          showDetails({ id: keyboardSeletectedElementId, type: 'sample' });
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
    const { groups } = this.state;
    let length = groups[index].numSamples;
    length += 3;
    if (groups[index].length < length) {
      length = groups[index].length;
    }
    groups[index].numSamples = length;

    this.setState({
      groups,
      flattenSamplesId: buildFlattenSampleIds(groups)
    }, this.forceUpdate());
  }

  renderSamples(samples, index) {
    const { keyboardSeletectedElementId, groups } = this.state;
    const { isElementSelected, showDetails } = this.props;
    const { length } = samples;
    const { numSamples } = groups[index];

    const sampleRows = samples.slice(0, numSamples).map((sample) => {
      const selected = isElementSelected(sample);
      const applyHighlight = selected || keyboardSeletectedElementId === sample.id

      return (
        <tr key={sample.id} className={classnames({ 'text-bg-primary': applyHighlight })}>
          <td width="30px">
            <ElementCheckbox element={sample} />
          </td>
          <td
            onClick={() => showDetails(sample)}
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
    const { toggleGroupCollapse, isGroupCollapsed } = this.props;
    const { showPreviews } = this.state;
    const sample = moleculeGroup[0];
    const groupKey = sample.getMoleculeId();
    const showGroup = !isGroupCollapsed(groupKey);

    return (
      <tbody key={index}>
        <MoleculeHeader
          sample={sample}
          show={showGroup}
          showPreviews={showPreviews}
          onClick={() => toggleGroupCollapse(groupKey)}
        />
        {showGroup && this.renderSamples(moleculeGroup, index)}
      </tbody>
    );
  }

  render() {
    const { groups } = this.state;

    return (
      <Table className="sample-entries">
        {groups.map((group, index) => {
          const { numSamples } = group;
          return this.renderMoleculeGroup(group, index, numSamples);
        })}
      </Table>
    );
  }
}

ElementsTableSampleEntries.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  elements: PropTypes.array.isRequired,
  isElementSelected: PropTypes.func.isRequired,
  isGroupCollapsed: PropTypes.func.isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
  moleculeSort: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
};

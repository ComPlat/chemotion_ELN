import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

import SvgWithPopover from 'src/components/common/SvgWithPopover';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import SampleName from 'src/components/common/SampleName';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import ChemrepoLabels from 'src/apps/mydb/elements/labels/ChemrepoLabels';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';
import ChevronIcon from 'src/components/common/ChevronIcon';
import { DragDropItemTypes } from 'src/utilities/DndConst';

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

export default function SampleGroupHeader({
  element: sample,
  show,
  showDragColumn,
  toggleGroup,
}) {
  const isNoStructureSample = sample.molecule?.inchikey === 'DUMMY' && sample.molfile == null;

  const uiState = UIStore.getState();
  const [showPreviews, setShowPreviews] = useState(uiState.showPreviews);

  useEffect(() => {
    const onUiChange = ({ showPreviews: s }) => setShowPreviews(s);
    UIStore.listen(onUiChange);
    return () => UIStore.unlisten(onUiChange);
  }, []);

  return (
    <tr
      role="button"
      onClick={toggleGroup}
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
                {sample.molecule.chem_repo && sample.molecule.chem_repo.id && (
                  <ChemrepoLabels chemrepoId={sample.molecule.chem_repo.id} />
                )}
                <PubchemLabels element={sample} />
                <ComputedPropLabel cprops={sample.molecule_computed_props} />
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Toggle Molecule</Tooltip>}>
                  <ChevronIcon direction={show ? 'down' : 'right'} color="primary" />
                </OverlayTrigger>
              </div>
            </div>
          </td>
        )}
      {!isNoStructureSample && showDragColumn && (
        <td className="text-center align-middle">
          <ElementContainer
            key={sample.id}
            sourceType={DragDropItemTypes.MOLECULE}
            element={sample}
          />
        </td>
      )}
    </tr>
  );
}

SampleGroupHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  show: PropTypes.bool.isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  toggleGroup: PropTypes.func.isRequired,
};

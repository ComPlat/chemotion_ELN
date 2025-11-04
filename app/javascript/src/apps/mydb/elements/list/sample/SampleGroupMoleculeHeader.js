import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';
import Sample from 'src/models/Sample';

import SampleName from 'src/components/common/SampleName';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import ChemrepoLabels from 'src/apps/mydb/elements/labels/ChemrepoLabels';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';

import SampleEditorLink from 'src/apps/mydb/elements/details/reactions/reactionProcessEditor/SampleEditorLink';

function MoleculeHeader({ sample }) {
  const [showPreviews, setShowPreviews] = useState(UIStore.getState().showPreviews);

  useEffect(() => {
    const updateShowPreviews = (state) => {
      setShowPreviews(state.showPreviews);
    };

    UIStore.listen(updateShowPreviews);
    return () => UIStore.unlisten(updateShowPreviews);
  }, []);

  return (
    <div className="flex-grow-1 sample-group-molecule-header">
      {sample.isNoStructureSample()
        ? (<h5>(No-structure sample)</h5>)
        : (
          <div className="d-flex align-items-start gap-1">
            {showPreviews && (
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
            )}
            <div className="flex-grow-1 sample-group-molecule-header__name">
              <SampleName sample={sample} />
              <SampleEditorLink sample={sample} />
              <div className="d-flex align-items-center gap-1 h5">
                {sample.molecule.chem_repo && sample.molecule.chem_repo.id && (
                  <ChemrepoLabels chemrepoId={sample.molecule.chem_repo.id} />
                )}
                <PubchemLabels element={sample} />
                <ComputedPropLabel cprops={sample.molecule_computed_props} />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

MoleculeHeader.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
};

export default MoleculeHeader;

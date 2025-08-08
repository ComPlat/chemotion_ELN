import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';
import Sample from 'src/models/Sample';

import SampleName from 'src/components/common/SampleName';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import ChemrepoLabels from 'src/apps/mydb/elements/labels/ChemrepoLabels';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';

function MoleculeHeader({ sample, onClick }) {
  const [showPreviews, setShowPreviews] = useState(UIStore.getState().showPreviews);

  useEffect(() => {
    const updateShowPreviews = (state) => {
      setShowPreviews(state.showPreviews);
    };

    UIStore.listen(updateShowPreviews);
    return () => UIStore.unlisten(updateShowPreviews);
  }, []);

  return (
    <div role="button" onClick={onClick} className="flex-grow-1">
      {sample.isNoStructureSample()
        ? (<h4>(No-structure sample)</h4>)
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
            <h4 className="flex-grow-1"><SampleName sample={sample} /></h4>
            <div className="d-flex align-items-center gap-1">
              {sample.molecule.chem_repo && sample.molecule.chem_repo.id && (
                <ChemrepoLabels chemrepoId={sample.molecule.chem_repo.id} />
              )}
              <PubchemLabels element={sample} />
              <ComputedPropLabel cprops={sample.molecule_computed_props} />
            </div>
          </div>
        )}
    </div>
  );
}

MoleculeHeader.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default MoleculeHeader;

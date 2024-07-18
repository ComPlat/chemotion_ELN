import React, { Component, useState } from 'react';
import PropTypes from 'prop-types';
import WellContainer from 'src/apps/mydb/elements/details/wellplates/designerTab/WellContainer';
import WellplateLabels from 'src/apps/mydb/elements/details/wellplates/designerTab/WellplateLabels';
import WellDetails from 'src/apps/mydb/elements/details/wellplates/designerTab/WellDetails';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import WellplateModel from 'src/models/Wellplate';

const Wellplate = ({ wellplate, handleWellsChange }) => {
  const [selectedWell, setSelectedWell] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const wellSize = 60

  const swapWells = (firstWell, secondWell) => {
    const wells = wellplate.wells
    const firstWellId = wells.indexOf(firstWell);
    const secondWellId = wells.indexOf(secondWell);
    const sample = wells[firstWellId].sample;
    wells[firstWellId].sample = wells[secondWellId].sample;
    wells[secondWellId].sample = sample;
    handleWellsChange(wells);
  }

  const dropSample = (droppedSample, well) => {
    const wells = wellplate.wells
    const wellId = wells.indexOf(well);
    const sample = droppedSample.buildChild();
    wells[wellId] = {
      ...well,
      sample
    };
    handleWellsChange(wells);
  }

  const hideDetails = () => {
    setSelectedWell(null);
  }

  const isWellActive = (well) => {
    if (selectedWell == null) return false

    return selectedWell.id === well.id;
  }

  const updateSelectedWell = (updatedWell) => {
    const wells = wellplate.wells
    const wellIndex = wells.findIndex(well => well.id == updatedWell.id)
    if (wellIndex == -1) return;

    wells[wellIndex] = updatedWell
    handleWellsChange(wells);
  }

  const style = {
    width: (wellplate.width + 1) * wellSize,
    height: ((wellplate.size / wellplate.width) + 1) * wellSize
  };
  const containerStyle = {
    width: wellSize,
    height: wellSize,
    fontSize: 8
  };
  return (
    <div style={style}>
      <WellplateLabels
        size={wellplate.size}
        cols={wellplate.width}
        width={wellSize}
        type="horizontal"
      />
      <WellplateLabels
        size={wellplate.size}
        cols={wellplate.width}
        width={wellSize}
        type="vertical"
      />
      {wellplate.wells.map((well, key) => (
        <div
          key={`well_${well.id}`}
          onClick={event => setSelectedWell(well)}
        >
          <WellContainer
            well={well}
            style={containerStyle}
            swapWells={swapWells}
            dropSample={dropSample}
            active={isWellActive(well)}
          />
        </div>
      ))}
      {selectedWell &&
        <WellDetails
          well={selectedWell}
          readoutTitles={wellplate.readout_titles}
          handleClose={hideDetails}
          onChange={updateSelectedWell}
        />
      }
    </div>
  );
}

Wellplate.propTypes = {
  wellplate: PropTypes.instanceOf(WellplateModel),
  handleWellsChange: PropTypes.func.isRequired
};

export default Wellplate;

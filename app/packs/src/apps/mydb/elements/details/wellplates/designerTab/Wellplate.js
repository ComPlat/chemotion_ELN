import React, { Component, useState } from 'react';
import PropTypes from 'prop-types';
import WellContainer from 'src/apps/mydb/elements/details/wellplates/designerTab/WellContainer';
import WellDetails from 'src/apps/mydb/elements/details/wellplates/designerTab/WellDetails';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import WellplateModel from 'src/models/Wellplate';
import { Container, Row } from 'react-bootstrap'

const HorizontalHeaderField = ({label}) => {
  return (<div className="fw-bold text-center wellplate-horizontal-header-field">{label}</div>)
}

const VerticalHeaderField = ({label}) => {
  return (<div className="d-inline-flex align-items-center fw-bold text-right wellplate-vertical-header-field">{label}</div>)
}

const Wellplate = ({ wellplate, handleWellsChange }) => {
  const [selectedWell, setSelectedWell] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)

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

  const wellplateRows = (wellplate) => {
    const rows = []
    // generate first row - empty leading cell + column labels
    const columnLabels = []
    for (let columnIndex = 0; columnIndex <= wellplate.width; columnIndex += 1) {
      const label = WellplateModel.columnLabel(columnIndex);
      const key = `column_header_${columnIndex}`
      columnLabels.push(<HorizontalHeaderField label={label} key={key} />)
    }
    rows.push(columnLabels)

    // generate remaining rows with leading header field
    for (let rowIndex = 1; rowIndex <= wellplate.height; rowIndex += 1) {
      const label = WellplateModel.rowLabel(rowIndex);
      const key = `row_header_${rowIndex}`
      const row = [<VerticalHeaderField label={label} key={key} />]
      rows.push(row)
    }

    // fill rows with well cells
    wellplate.wells.forEach(well => {
      rows[well.position.y][well.position.x] = (
        <div key={`well_${well.id}`} onClick={event => setSelectedWell(well)}>
          <WellContainer
            well={well}
            swapWells={swapWells}
            dropSample={dropSample}
            active={isWellActive(well)}
          />
        </div>
      )
    })

    // fill

    return rows
  }

  const wellSize = 60
  return(
    <div className="d-inline-flex flex-column">
      {wellplateRows(wellplate).map((rowContent, index) => (<div className="d-inline-flex flex-row" key={index}>{rowContent}</div>))}
      {selectedWell &&
        <WellDetails
          well={selectedWell}
          readoutTitles={wellplate.readout_titles}
          handleClose={hideDetails}
          onChange={updateSelectedWell}
        />
      }
    </div>
  )
}

Wellplate.propTypes = {
  wellplate: PropTypes.instanceOf(WellplateModel),
  handleWellsChange: PropTypes.func.isRequired
};

export default Wellplate;

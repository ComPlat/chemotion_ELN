import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import WellContainer from 'src/apps/mydb/elements/details/wellplates/designerTab/WellContainer';
import WellDetails from 'src/apps/mydb/elements/details/wellplates/designerTab/WellDetails';
import HeaderDropTarget from 'src/apps/mydb/elements/details/wellplates/designerTab/HeaderDropTarget';
import fillWells, {
  wellsInLine, clearWells
} from 'src/apps/mydb/elements/details/wellplates/designerTab/fillWells';
import ConfirmModal from 'src/components/common/ConfirmModal';
import { StoreContext } from 'src/stores/mobx/RootStore';
import WellplateModel from 'src/models/Wellplate';

const HorizontalHeaderField = ({ label }) => {
  return (<div className="fw-bold text-center wellplate-horizontal-header-field">{label}</div>);
}

const VerticalHeaderField = ({ label }) => {
  return (
    <div className="d-inline-flex align-items-center fw-bold text-right wellplate-vertical-header-field">{label}</div>
  );
}

const Wellplate = ({ wellplate, handleWellsChange, readOnly }) => {
  const [selectedWell, setSelectedWell] = useState(null)
  const [pendingClear, setPendingClear] = useState(null);
  const { notifications } = useContext(StoreContext);

  const lineName = (axis, index) => (axis === 'y'
    ? `row ${WellplateModel.rowLabel(index)}`
    : `column ${WellplateModel.columnLabel(index)}`);

  const swapWells = (firstWell, secondWell) => {
    if (readOnly) { return; }

    const wells = wellplate.wells
    const firstWellId = wells.indexOf(firstWell);
    const secondWellId = wells.indexOf(secondWell);
    const sample = wells[firstWellId].sample;
    wells[firstWellId].sample = wells[secondWellId].sample;
    wells[secondWellId].sample = sample;
    handleWellsChange(wells);
  }

  const dropSample = (droppedSample, well) => {
    if (readOnly) { return; }

    const wells = wellplate.wells
    const wellId = wells.indexOf(well);
    const sample = droppedSample.buildChild();
    wells[wellId] = {
      ...well,
      sample
    };
    handleWellsChange(wells);
  }

  const fillLine = (sample, axis, index) => {
    handleWellsChange(fillWells(wellplate.wells, sample, axis, index));
  };

  const warnFull = (axis, index) => {
    const name = lineName(axis, index);
    notifications.add({
      message: `${name.charAt(0).toUpperCase()}${name.slice(1)} is full, clear it first`,
      level: 'warning',
      position: 'tc',
    });
  };

  const askClear = (axis, index, count) => setPendingClear({ axis, index, count });

  const clearMessage = ({ axis, index, count }) => `Clear ${count} well${count === 1 ? '' : 's'} `
    + `in ${lineName(axis, index)}? Their split samples are deleted when you save.`;

  const answerClear = (confirmed) => {
    if (confirmed) {
      handleWellsChange(clearWells(wellplate.wells, pendingClear.axis, pendingClear.index));
    }
    setPendingClear(null);
  };

  const headerProps = (axis, index) => {
    const line = wellsInLine(wellplate.wells, axis, index);
    const filled = line.filter((well) => well.sample).length;
    return {
      axis,
      index,
      filled,
      empty: line.length - filled,
      onFill: fillLine,
      onFull: warnFull,
      onClear: askClear,
      readOnly,
    };
  };

  const hideDetails = () => {
    setSelectedWell(null);
  }

  const isWellActive = (well) => {
    if (selectedWell == null) return false

    return selectedWell.id === well.id;
  }

  const updateSelectedWell = (updatedWell) => {
    if (readOnly) { return; }

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
      let label = WellplateModel.columnLabel(columnIndex);
      const header = <HorizontalHeaderField key={`${label}-header`} label={label} />;
      columnLabels.push(columnIndex === 0 ? header : (
        <HeaderDropTarget key={`${label}-header`} {...headerProps('x', columnIndex)}>
          {header}
        </HeaderDropTarget>
      ))
    }
    rows.push(columnLabels)

    // generate remaining rows with leading header field
    for (let rowIndex = 1; rowIndex <= wellplate.height; rowIndex += 1) {
      const row = [
        <HeaderDropTarget key={`${rowIndex}-vertical-header`} {...headerProps('y', rowIndex)}>
          <VerticalHeaderField label={WellplateModel.rowLabel(rowIndex)} />
        </HeaderDropTarget>
      ]
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
            readOnly={readOnly}
            key={`${well.id}-container`}
          />
        </div>
      )
    })

    // fill
    return rows;
  }

  return (
    <div className="d-inline-flex flex-column">
      {wellplateRows(wellplate).map(rowContent => (
        <div className="d-inline-flex flex-row" key={`${wellplate.id}-row-content-${Math.random()}`}>{rowContent}</div>
      ))}
      {selectedWell &&
        <WellDetails
          well={selectedWell}
          readoutTitles={wellplate.readout_titles}
          handleClose={hideDetails}
          onChange={updateSelectedWell}
          readOnly={readOnly}
        />
      }
      {pendingClear && (
        <ConfirmModal
          showModal
          title="Clear wells"
          content={clearMessage(pendingClear)}
          onClick={answerClear}
        />
      )}
    </div>
  )
}

Wellplate.propTypes = {
  wellplate: PropTypes.instanceOf(WellplateModel),
  handleWellsChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
};

Wellplate.defaultProps = {
  readOnly: false,
};

export default Wellplate;

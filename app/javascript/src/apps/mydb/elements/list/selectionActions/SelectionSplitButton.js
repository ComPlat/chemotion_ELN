/* eslint-disable class-methods-use-this */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import MatrixCheck from 'src/components/common/MatrixCheck';

const SelectionSplitButton = ({ collectionWritable }) => {
  const { userStore } = useContext(StoreContext);
  const uiState = UIStore.getState();
  const { genericEls } = userStore || [];
  const showGenericEls = MatrixCheck(userStore.currentUser?.matrix, 'genericElement');
  const layout = userStore.profile?.data?.layout || {};

  const [currentCollection, setCurrentCollection] = useState(uiState.currentCollection);
  const [selectedElements, setSelectedElements] = useState({});

  const sortedLayout = Object.entries(layout)
    .filter((o) => o[1] && o[1] > 0)
    .sort((a, b) => a[1] - b[1]);

  const sortedGenericEls = [];
  if (showGenericEls) {
    sortedLayout.forEach(([k]) => {
      const el = genericEls.find((ael) => ael.name === k);
      if (typeof el !== 'undefined') {
        sortedGenericEls.push(el);
      }
    });
  }

  const onUIStoreChange = useCallback((state) => {
    const { currentCollection: newCurrentCollection } = state;
    if (newCurrentCollection !== currentCollection) {
      setCurrentCollection(newCurrentCollection);
    }

    const splitableElements = [
      'sample', 'wellplate', 'cell_line', 'device_description', 'sequence_based_macromolecule_sample',
      ...genericEls.map((el) => el.name)
    ];

    const newSelectedElements = splitableElements.reduce(
      (acc, el) => {
        const { checkedIds, checkedAll } = state[el] || {};
        const hasSelected = checkedIds?.size > 0 || checkedAll === true;
        return { ...acc, [el]: hasSelected };
      },
      {}
    );
    if (JSON.stringify(newSelectedElements) !== JSON.stringify(selectedElements)) {
      setSelectedElements(newSelectedElements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    UIStore.listen(onUIStoreChange);
    return () => UIStore.unlisten(onUIStoreChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const splitSelectionAsSubsamples = () => {
    ElementActions.splitAsSubsamples(uiState);
  };

  const splitElements = (name) => {
    ElementActions.splitElements(uiState, name);
  };

  const isAllCollection = () => currentCollection && currentCollection.label === 'All';
  const isDisabled = isAllCollection()
    || Object.values(selectedElements).every((v) => !v)
    // Splitting adds a new sub-element to the current collection (:add_elements), so it must be
    // disabled unless that collection is writable (read-only shared collections included).
    || !collectionWritable;

  const splitSelectionAsSubwellplates = () => {
    ElementActions.splitAsSubwellplates(uiState);
  };

  const splitSelectionAsSubDeviceDescription = () => {
    const params = {
      ui_state: {
        device_description: {
          all: uiState.device_description.checkedAll,
          included_ids: uiState.device_description.checkedIds,
          excluded_ids: uiState.device_description.uncheckedIds,
        },
        currentCollectionId: uiState.currentCollection.id,
      }
    };

    ElementActions.splitAsSubDeviceDescription(params);
  };

  const splitSelectionAsSubSequenceBasedMacromoleculeSample = () => {
    const params = {
      ui_state: {
        sequence_based_macromolecule_sample: {
          all: uiState.sequence_based_macromolecule_sample.checkedAll,
          included_ids: uiState.sequence_based_macromolecule_sample.checkedIds,
          excluded_ids: uiState.sequence_based_macromolecule_sample.uncheckedIds,
        },
        currentCollectionId: uiState.currentCollection.id,
      }
    };

    ElementActions.splitAsSubSequenceBasedMacromoleculeSample(params);
  };

  return (
    <Dropdown id="split-dropdown">
      <Dropdown.Toggle
        variant="light"
        size="sm"
        disabled={isDisabled}
        title="Split"
        aria-label="Split"
      >
        <i className="fa fa-code-fork me-1" aria-hidden="true" />
        <span className="selection-action-text-label">Split</span>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item
          onClick={() => splitSelectionAsSubsamples()}
          disabled={!selectedElements.sample}
        >
          Split Sample
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => splitSelectionAsSubwellplates()}
          disabled={!selectedElements.wellplate}
        >
          Split Wellplate
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => ElementActions.splitAsSubCellLines(uiState)}
          disabled={!selectedElements.cell_line}
        >
          Split Cell line
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => splitSelectionAsSubDeviceDescription()}
          disabled={!selectedElements.device_description}
        >
          Split Device Description
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => splitSelectionAsSubSequenceBasedMacromoleculeSample()}
          disabled={!selectedElements.sequence_based_macromolecule_sample}
        >
          Split Sequence Based Macromolecule Sample
        </Dropdown.Item>
        {sortedGenericEls.map((el) => (
          <Dropdown.Item
            id={`split-${el.name}-button`}
            key={el.name}
            onClick={() => splitElements(`${el.name}`)}
            disabled={!selectedElements[el.name]}
          >
            Split
            {' '}
            {el.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

SelectionSplitButton.propTypes = {
  // Whether the *current* collection is writable by the user (:add_elements or higher). Derived by
  // SelectionActions from currentCollection.permission_level, not from record-level sharing_allowed.
  collectionWritable: PropTypes.bool,
};

SelectionSplitButton.defaultProps = {
  collectionWritable: false,
};

export default observer(SelectionSplitButton);

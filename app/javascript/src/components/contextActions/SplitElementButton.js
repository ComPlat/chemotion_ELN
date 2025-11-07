/* eslint-disable class-methods-use-this */
import React from 'react';
import { Dropdown, DropdownButton, ButtonGroup } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';

export default class SplitElementButton extends React.Component {
  constructor(props) {
    super(props);

    const uiState = UIStore.getState();
    const userState = UserStore.getState();
    this.state = {
      currentCollection: uiState.currentCollection,
      currentUser: {},
      genericEls: [],
      showGenericEls: MatrixCheck(userState.currentUser?.matrix, 'genericEl'),
      layout: {},
      selectedElements: {},
    };

    this.onUserStoreChange = this.onUserStoreChange.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserStoreChange);
    UIStore.listen(this.onUIStoreChange);
    this.onUserStoreChange(UserStore.getState());
    this.onUIStoreChange(UIStore.getState());
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserStoreChange);
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUserStoreChange(state) {
    const { layout, showGenericEls, genericEls } = this.state;
    const newLayout = state.profile?.data?.layout;
    const newCurrentUser = state.currentUser;
    const newGenericEls = state.genericEls;

    if (
      typeof newLayout !== 'undefined'
      && newLayout !== null
      && newLayout !== layout
    ) {
      this.setState({ layout: newLayout });
    }

    const newShowGenericEls = MatrixCheck(newCurrentUser?.matrix, 'genericEl');
    if (newShowGenericEls !== showGenericEls) {
      this.setState({ currentUser: newCurrentUser });
    }

    if (newGenericEls !== genericEls) {
      this.setState({ genericEls: newGenericEls });
    }
  }

  onUIStoreChange(state) {
    const { currentCollection, genericEls, selectedElements } = this.state;
    const { currentCollection: newCurrentCollection } = state;
    if (newCurrentCollection !== currentCollection) {
      this.setState({ currentCollection: newCurrentCollection });
    }

    const newSelectedElements = ['sample', 'wellplate', 'cell_line', 'device_description',
      ...genericEls.map((el) => el.name)].reduce(
      (acc, el) => {
        const { checkedIds, checkedAll } = state[el] || {};
        const hasSelected = checkedIds?.size > 0 || checkedAll === true;
        return { ...acc, [el]: hasSelected };
      },
      {}
    );
    if (JSON.stringify(newSelectedElements) !== JSON.stringify(selectedElements)) {
      this.setState({ selectedElements: newSelectedElements });
    }
  }

  splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState());
  }

  splitElements(name) {
    ElementActions.splitElements(UIStore.getState(), name);
  }

  isAllCollection() {
    const { currentCollection } = this.state;
    return currentCollection && currentCollection.label === 'All';
  }

  splitSelectionAsSubwellplates() {
    ElementActions.splitAsSubwellplates(UIStore.getState());
  }

  splitSelectionAsSubDeviceDescription() {
    const uiState = UIStore.getState();
    const params = {
      ui_state: {
        device_description: {
          all: uiState.device_description.checkedAll,
          included_ids: uiState.device_description.checkedIds,
          excluded_ids: uiState.device_description.uncheckedIds,
        },
        currentCollectionId: uiState.currentCollection.id,
        isSync: uiState.isSync,
      }
    };

    ElementActions.splitAsSubDeviceDescription(params);
  }

  render() {
    const {
      layout, genericEls, showGenericEls, selectedElements
    } = this.state;

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

    const isDisabled = this.isAllCollection()
      || Object.values(selectedElements).every((v) => !v);

    return (
      <DropdownButton
        as={ButtonGroup}
        variant="primary"
        title={<i className="fa fa-code-fork" />}
        disabled={isDisabled}
      >
        <Dropdown.Item
          onClick={() => this.splitSelectionAsSubsamples()}
          disabled={!selectedElements.sample}
        >
          Split Sample
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => this.splitSelectionAsSubwellplates()}
          disabled={!selectedElements.wellplate}
        >
          Split Wellplate
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => ElementActions.splitAsSubCellLines(UIStore.getState())}
          disabled={!selectedElements.cell_line}
        >
          Split Cell line
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => this.splitSelectionAsSubDeviceDescription()}
          disabled={!selectedElements.device_description}
        >
          Split Device Description
        </Dropdown.Item>
        {sortedGenericEls.map((el) => (
          <Dropdown.Item
            id={`split-${el.name}-button`}
            key={el.name}
            onClick={() => this.splitElements(`${el.name}`)}
            disabled={!selectedElements[el.name]}
          >
            Split
            {' '}
            {el.label}
          </Dropdown.Item>
        ))}
      </DropdownButton>
    );
  }
}

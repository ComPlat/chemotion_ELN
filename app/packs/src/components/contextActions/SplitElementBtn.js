/* eslint-disable class-methods-use-this */
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { filter } from 'lodash';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';

export default class SplitElementBtn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      layout: UserStore.getState().profile?.data?.layout || {},
    };

    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const layout = state.profile?.data?.layout;
    // eslint-disable-next-line react/destructuring-assignment
    if (typeof layout !== 'undefined' && layout !== null && layout !== this.state.layout) {
      this.setState({ layout });
    }
  }

  splitSelectionAsSubsamples() {
    ElementActions.splitAsSubsamples(UIStore.getState());
  }

  splitElements(name) {
    ElementActions.splitElements(UIStore.getState(), name);
  }

  noSelected(name) {
    const state = UIStore.getState() || {};
    return state[name]?.checkedIds?.size === 0 && state[name]?.checkedAll === false;
  }

  isAllCollection() {
    const { currentCollection } = UIStore.getState();
    return currentCollection && currentCollection.label === 'All';
  }

  splitSelectionAsSubwellplates() {
    ElementActions.splitAsSubwellplates(UIStore.getState());
  }

  render() {
    const { layout } = this.state;
    let genericEls = [];
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericElement')) {
      genericEls = UserStore.getState().genericEls || [];
    }
    const itemTables = [];
    const sortedLayout = filter(Object.entries(layout), (o) => o[1] && o[1] > 0).sort((a, b) => a[1] - b[1]);

    sortedLayout?.forEach(([k]) => {
      const el = genericEls.find((ael) => ael.name === k);
      // eslint-disable-next-line max-len
      if (el) itemTables.push(<MenuItem id={`split-${el.name}-button`} key={el.name} onSelect={() => this.splitElements(`${el.name}`)} disabled={this.noSelected(`${el.name}`) || this.isAllCollection()}>Split {el.label}</MenuItem>);
    });

    return (
      <DropdownButton bsStyle="primary" title={<i className="fa fa-code-fork" />}>
        <MenuItem
          onSelect={() => this.splitSelectionAsSubsamples()}
          disabled={this.noSelected('sample') || this.isAllCollection()}
        >
          Split Sample
        </MenuItem>
        <MenuItem
          onSelect={() => this.splitSelectionAsSubwellplates()}
          disabled={this.noSelected('wellplate') || this.isAllCollection()}
        >
          Split Wellplate
        </MenuItem>
        <MenuItem
          onSelect={() => ElementActions.splitAsSubCellLines(UIStore.getState())}
          disabled={this.noSelected('cell_line') || this.isAllCollection()}
        >
          Split Cell line
        </MenuItem>
        {itemTables}
      </DropdownButton>
    );
  }
}

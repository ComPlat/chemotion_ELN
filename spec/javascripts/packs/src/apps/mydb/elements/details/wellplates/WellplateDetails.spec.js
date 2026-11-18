/* eslint-disable import/no-unresolved, no-undef */
import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import WellplateDetails from 'src/apps/mydb/elements/details/wellplates/WellplateDetails';
import Wellplate from 'src/models/Wellplate';
import UserStore from 'src/stores/alt/stores/UserStore';
import wellplate2x3EmptyJson from 'fixture/wellplates/wellplate_2_3_empty';

configure({ adapter: new Adapter() });

describe('WellplateDetails', () => {
  beforeEach(() => {
    UserStore.state.currentUser = { id: 1, name: 'Test User' };
  });

  describe('componentDidUpdate()', () => {
    it('does not overwrite a locally-updated wellplate (e.g. after a history revert) when props have not changed', () => {
      const wellplate = new Wellplate({
        ...wellplate2x3EmptyJson, is_new: false, updated_at: '2024-01-01T00:00:00Z'
      });
      const wrapper = shallow(
        <WellplateDetails wellplate={wellplate} openedFromCollectionId={1} />
      );

      const revertedWellplate = new Wellplate({
        ...wellplate2x3EmptyJson, is_new: false, name: 'Reverted name', updated_at: '2024-02-02T00:00:00Z'
      });

      // simulates VersionsTable#reloadEntity calling parent.setState({ wellplate })
      // directly after a revert, without props.wellplate itself changing
      wrapper.instance().setState({ wellplate: revertedWellplate });
      wrapper.update();

      expect(wrapper.state().wellplate.name).toEqual('Reverted name');
    });

    it('still adopts a genuinely new wellplate coming in from props', () => {
      const wellplate = new Wellplate({
        ...wellplate2x3EmptyJson, is_new: false, updated_at: '2024-01-01T00:00:00Z'
      });
      const wrapper = shallow(
        <WellplateDetails wellplate={wellplate} openedFromCollectionId={1} />
      );

      const updatedWellplate = new Wellplate({
        ...wellplate2x3EmptyJson, is_new: false, name: 'Updated elsewhere', updated_at: '2024-02-02T00:00:00Z'
      });
      wrapper.setProps({ wellplate: updatedWellplate });

      expect(wrapper.state().wellplate.name).toEqual('Updated elsewhere');
    });
  });
});

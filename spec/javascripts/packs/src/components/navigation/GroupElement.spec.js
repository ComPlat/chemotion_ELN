import React from 'react';
import expect from 'expect';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import GroupElement from 'src/components/navigation/GroupElement';

Enzyme.configure({ adapter: new Adapter() });

// Regression coverage for confirmDelete('user', ...): it used to fire onDeleteUser (the
// actual removal request) before checking whether the target is the group's sole admin,
// so a doomed request went out and only a same-tick, unrelated demote call happened to
// surface the warning. The check must now run first and block the call outright.
describe('GroupElement', () => {
  const admin = { id: 1, name: 'Admin One', initials: 'A1' };
  const otherAdmin = { id: 2, name: 'Admin Two', initials: 'A2' };
  const member = { id: 3, name: 'Member One', initials: 'M1' };

  const buildGroupElement = (admins) => ({
    id: 10,
    name: 'Test Group',
    initials: 'TG',
    admins,
    users: [...admins, member],
  });

  const mountElement = (groupElement, onDeleteUser) => mount(React.createElement(GroupElement, {
    groupElement,
    currentUser: admin,
    currentGroup: [groupElement],
    onDeleteGroup: sinon.spy(),
    onDeleteUser,
    onChangeData: sinon.spy(),
  }));

  // confirmDelete takes the click event explicitly (not the legacy `window.event` global)
  // so the admin-warning popover can be positioned without relying on an ambient DOM event.
  const fakeEvent = () => ({ target: null });

  describe('.confirmDelete(event, "user", ...)', () => {
    it('blocks removal and shows the admin warning when the target is the sole admin', () => {
      const groupElement = buildGroupElement([admin]);
      const onDeleteUser = sinon.spy();
      const wrapper = mountElement(groupElement, onDeleteUser);

      wrapper.instance().confirmDelete(fakeEvent(), 'user', groupElement, admin);

      expect(onDeleteUser.called).toBe(false);
      expect(wrapper.instance().state.showAdminAlert).toBe(true);
    });

    it('removes a non-admin member and does not show the admin warning', () => {
      const groupElement = buildGroupElement([admin]);
      const onDeleteUser = sinon.spy();
      const wrapper = mountElement(groupElement, onDeleteUser);

      wrapper.instance().confirmDelete(fakeEvent(), 'user', groupElement, member);

      expect(onDeleteUser.calledOnceWith(groupElement, member)).toBe(true);
      expect(wrapper.instance().state.showAdminAlert).toBe(false);
    });

    it('removes an admin member when another admin remains', () => {
      const groupElement = buildGroupElement([admin, otherAdmin]);
      const onDeleteUser = sinon.spy();
      const wrapper = mountElement(groupElement, onDeleteUser);

      wrapper.instance().confirmDelete(fakeEvent(), 'user', groupElement, otherAdmin);

      expect(onDeleteUser.calledOnceWith(groupElement, otherAdmin)).toBe(true);
      expect(wrapper.instance().state.showAdminAlert).toBe(false);
    });
  });
});

import React from 'react';
import expect from 'expect';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import GroupElement from 'src/components/navigation/GroupElement';
import UsersFetcher from 'src/fetchers/UsersFetcher';

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

  // Regression coverage: admins and members are independent lists (GroupEntity exposes
  // both unfiltered), so an admin who isn't a member must still be visible and able to
  // manage the group; a plain member must not see management controls.
  describe('.render()', () => {
    const nonMemberAdmin = { id: 4, name: 'Admin Remote', initials: 'AR' };

    const buildGroupElementWithNonMemberAdmin = () => ({
      id: 10,
      name: 'Test Group',
      initials: 'TG',
      admins: [admin, nonMemberAdmin],
      users: [admin, member],
    });

    const mountAs = (groupElement, currentUser) => mount(React.createElement(GroupElement, {
      groupElement,
      currentUser,
      currentGroup: [groupElement],
      onDeleteGroup: sinon.spy(),
      onDeleteUser: sinon.spy(),
      onChangeData: sinon.spy(),
    }));

    it('shows a non-member admin\'s name in the Admin-by column', () => {
      const groupElement = buildGroupElementWithNonMemberAdmin();
      const wrapper = mountAs(groupElement, member);

      const adminColumn = wrapper.find('tr.fw-bold.align-middle td').at(2).text();
      expect(adminColumn).toContain(nonMemberAdmin.name);
      expect(groupElement.users.some((u) => u.id === nonMemberAdmin.id)).toBe(false);
    });

    it('hides management controls from a plain member but shows them to a non-member admin', () => {
      const groupElement = buildGroupElementWithNonMemberAdmin();

      const asMember = mountAs(groupElement, member);
      expect(asMember.find('.fa-plus').length).toBe(0);
      expect(asMember.find('.fa-trash-o').length).toBe(0);

      const asNonMemberAdmin = mountAs(groupElement, nonMemberAdmin);
      expect(asNonMemberAdmin.find('.fa-plus').length).toBeGreaterThan(0);
      expect(asNonMemberAdmin.find('.fa-trash-o').length).toBeGreaterThan(0);
      expect(asNonMemberAdmin.find('.fa-key').length).toBeGreaterThan(0);
    });
  });

  describe('.addAdmin(...)', () => {
    afterEach(() => { sinon.restore(); });

    it('promotes each newly selected user and skips users who are already admins', () => {
      const groupElement = buildGroupElement([admin]);
      const promoteStub = sinon.stub(UsersFetcher, 'promoteAdmin').returns(new Promise(() => {}));
      const wrapper = mountElement(groupElement, sinon.spy());

      wrapper.instance().setState({
        selectedAdminUsers: [
          { value: member.id, name: member.name, initials: member.initials },
          { value: admin.id, name: admin.name, initials: admin.initials },
        ],
      });

      wrapper.instance().addAdmin(groupElement);

      expect(promoteStub.calledOnce).toBe(true);
      expect(promoteStub.calledWith(groupElement.id, member.id)).toBe(true);
      expect(wrapper.instance().state.selectedAdminUsers).toEqual([]);
    });
  });
});

import React from 'react';
import expect from 'expect';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import sinon from 'sinon';
import {
  Table, Popover, Button, Overlay
} from 'react-bootstrap';
import GroupElement from 'src/components/navigation/GroupElement';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { AsyncSelect } from 'src/components/common/Select';

Enzyme.configure({ adapter: new Adapter() });

// Regression coverage for confirmDelete('user', ...): membership and admin status are
// independent, so removing someone as a member must never check or alter their admin
// status (it used to block/demote based on it, which contradicted that invariant).
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

  const mountElement = (group, onDeleteUser) => mount(React.createElement(GroupElement, {
    group,
    currentUser: admin,
    onDeleteGroup: sinon.spy(),
    onDeleteUser,
    onUpdateGroup: sinon.spy(),
  }));

  // GroupElement is a function component, so there is no wrapper.instance() to call
  // confirmDelete()/state on directly. Instead, drive the same code path through the
  // actual UI: expand the members table, focus the target row's delete button (the
  // focus-triggered OverlayTrigger reveals the confirm popover), then click "Yes".
  const deleteUserViaUi = (wrapper, targetName) => {
    wrapper.find('.fa-list').closest('button').simulate('click');
    wrapper.update();

    const row = wrapper.find(Table).find('tr').filterWhere((tr) => tr.text().includes(targetName));
    row.find('.fa-trash-o').closest('button').simulate('focus');
    wrapper.update();

    wrapper.find(Popover.Body).find(Button).filterWhere((b) => b.text().trim() === 'Yes').first().simulate('click');
    wrapper.update();
  };

  describe('.confirmDelete(event, "user", ...)', () => {
    it('removes a member even when they are the sole admin, without touching admin status', () => {
      const group = buildGroupElement([admin]);
      const onDeleteUser = sinon.spy();
      const wrapper = mountElement(group, onDeleteUser);

      deleteUserViaUi(wrapper, admin.name);

      expect(onDeleteUser.calledOnceWith(group, admin)).toBe(true);
      // OverlayTrigger renders its own <Overlay> internally, so multiple instances exist;
      // the admin-warning one is the only one using placement="left".
      expect(wrapper.find(Overlay).filterWhere((o) => o.prop('placement') === 'left').prop('show')).toBe(false);
      expect(group.admins).toContain(admin);
    });

    it('removes a non-admin member and does not show the admin warning', () => {
      const group = buildGroupElement([admin]);
      const onDeleteUser = sinon.spy();
      const wrapper = mountElement(group, onDeleteUser);

      deleteUserViaUi(wrapper, member.name);

      expect(onDeleteUser.calledOnceWith(group, member)).toBe(true);
      // OverlayTrigger renders its own <Overlay> internally, so multiple instances exist;
      // the admin-warning one is the only one using placement="left".
      expect(wrapper.find(Overlay).filterWhere((o) => o.prop('placement') === 'left').prop('show')).toBe(false);
    });

    it('removes an admin member when another admin remains', () => {
      const group = buildGroupElement([admin, otherAdmin]);
      const onDeleteUser = sinon.spy();
      const wrapper = mountElement(group, onDeleteUser);

      deleteUserViaUi(wrapper, otherAdmin.name);

      expect(onDeleteUser.calledOnceWith(group, otherAdmin)).toBe(true);
      // OverlayTrigger renders its own <Overlay> internally, so multiple instances exist;
      // the admin-warning one is the only one using placement="left".
      expect(wrapper.find(Overlay).filterWhere((o) => o.prop('placement') === 'left').prop('show')).toBe(false);
    });
  });

  // Regression coverage: admins and members are independent lists (GroupEntity exposes
  // both unfiltered), so an admin who isn't a member must still be visible and able to
  // manage the group; a plain member must not see management controls.
  describe('.render()', () => {
    afterEach(() => { sinon.restore(); });

    const nonMemberAdmin = { id: 4, name: 'Admin Remote', initials: 'AR' };

    const buildGroupElementWithNonMemberAdmin = () => ({
      id: 10,
      name: 'Test Group',
      initials: 'TG',
      admins: [admin, nonMemberAdmin],
      users: [admin, member],
    });

    const mountAs = (group, currentUser) => mount(React.createElement(GroupElement, {
      group,
      currentUser,
      onDeleteGroup: sinon.spy(),
      onDeleteUser: sinon.spy(),
      onUpdateGroup: sinon.spy(),
    }));

    it('shows a non-member admin\'s name in the Admin-by column', () => {
      const group = buildGroupElementWithNonMemberAdmin();
      const wrapper = mountAs(group, member);

      const adminColumn = wrapper.find('tr.fw-bold.align-middle td').at(2).text();
      expect(adminColumn).toContain(nonMemberAdmin.name);
      expect(group.users.some((u) => u.id === nonMemberAdmin.id)).toBe(false);
    });

    it('hides management controls from a plain member but shows them to a non-member admin', () => {
      const group = buildGroupElementWithNonMemberAdmin();

      const asMember = mountAs(group, member);
      expect(asMember.find('.fa-plus').length).toBe(0);
      expect(asMember.find('.fa-trash-o').length).toBe(0);

      const asNonMemberAdmin = mountAs(group, nonMemberAdmin);
      expect(asNonMemberAdmin.find('.fa-plus').length).toBeGreaterThan(0);
      expect(asNonMemberAdmin.find('.fa-trash-o').length).toBeGreaterThan(0);
      expect(asNonMemberAdmin.find('.fa-key').length).toBeGreaterThan(0);
    });

    // Regression: previously the only way to demote a non-member admin was to add them
    // as a member first, demote, then remove membership again - there was no direct
    // control. The Admin-by column now carries its own demote button for exactly this
    // case (member admins are demoted via their row in the expanded users table).
    it('lets a non-member admin be demoted directly from the Admin-by column', () => {
      const group = buildGroupElementWithNonMemberAdmin();
      const demoteStub = sinon.stub(UsersFetcher, 'demoteAdmin').returns(new Promise(() => {}));
      const wrapper = mountAs(group, nonMemberAdmin);

      wrapper.find('tr.fw-bold.align-middle td').at(2).find('button').first().simulate('click');

      expect(demoteStub.calledOnceWith(group.id, nonMemberAdmin.id)).toBe(true);
    });
  });

  describe('.addAdmin(...)', () => {
    afterEach(() => { sinon.restore(); });

    it('promotes each newly selected user and skips users who are already admins', () => {
      const group = buildGroupElement([admin]);
      const promoteStub = sinon.stub(UsersFetcher, 'promoteAdmin').returns(new Promise(() => {}));
      const wrapper = mountElement(group, sinon.spy());

      // Reveal the "add admin" selector row (only one .fa-key button exists before this).
      wrapper.find('.fa-key').first().closest('button').simulate('click');
      wrapper.update();

      wrapper.find(AsyncSelect).prop('onChange')([
        { value: member.id, name: member.name, initials: member.initials },
        { value: admin.id, name: admin.name, initials: admin.initials },
      ]);
      wrapper.update();

      // The confirm button is the second .fa-key button, rendered after the toggle.
      wrapper.find('.fa-key').last().closest('button').simulate('click');
      wrapper.update();

      expect(promoteStub.calledOnce).toBe(true);
      expect(promoteStub.calledWith(group.id, member.id)).toBe(true);
      expect(wrapper.find(AsyncSelect).prop('value')).toEqual([]);
    });
  });
});

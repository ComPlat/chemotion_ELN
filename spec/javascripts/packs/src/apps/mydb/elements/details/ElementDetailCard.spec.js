import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach } from 'mocha';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';

Enzyme.configure({ adapter: new Adapter() });

describe('ElementDetailCard save button wiring', () => {
  let onSave;
  let onClose;

  const element = {
    id: 1,
    type: 'sample',
    isPendingToSave: true,
    isNew: false,
    can_copy: false,
  };

  const mountCard = (props = {}) => mount(
    <ElementDetailCard
      element={element}
      title="Test"
      onSave={onSave}
      onClose={onClose}
      showUserLabels={false}
      showHeaderCommentSection={false}
      {...props}
    >
      <div>content</div>
    </ElementDetailCard>
  );

  // The header Save button is primary and carries the floppy icon without the combi overlay.
  const findSaveButton = (wrapper) => wrapper.find('button').filterWhere(
    (btn) => btn.find('.fa-floppy-o').exists()
      && !btn.find('.combi-icon-close').exists()
      && btn.hasClass('btn-primary')
  ).first();

  // The Save and Close header button uses the combi-icon-close modifier.
  const findSaveCloseButton = (wrapper) => wrapper.find('button').filterWhere(
    (btn) => btn.find('.combi-icon-close').exists()
  ).first();

  beforeEach(() => {
    onSave = sinon.spy();
    onClose = sinon.spy();
  });

  it('calls onSave(false) when the plain Save button is clicked', () => {
    const wrapper = mountCard();
    findSaveButton(wrapper).simulate('click');
    expect(onSave.calledOnce).toBe(true);
    expect(onSave.firstCall.args[0]).toBe(false);
  });

  it('calls onSave(true) when Save and Close is clicked', () => {
    const wrapper = mountCard();
    findSaveCloseButton(wrapper).simulate('click');
    expect(onSave.calledOnce).toBe(true);
    expect(onSave.firstCall.args[0]).toBe(true);
  });

  it('invokes onClose cleanup on Save and Close (Copilot review #1/#6)', () => {
    const wrapper = mountCard();
    findSaveCloseButton(wrapper).simulate('click');
    expect(onClose.calledOnce).toBe(true);
  });

  it('does not throw if onClose is not provided on Save and Close', () => {
    const wrapper = mountCard({ onClose: undefined });
    expect(() => findSaveCloseButton(wrapper).simulate('click')).not.toThrow();
    expect(onSave.calledOnce).toBe(true);
    expect(onSave.firstCall.args[0]).toBe(true);
  });
});

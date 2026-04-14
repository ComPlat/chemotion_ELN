import expect from 'expect';
import sinon from 'sinon';
import { describe, it } from 'mocha';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';

describe('ReactionDetailsScheme#onChangeRole', () => {
  it("forwards '' (not null) to onInputChange when the dropdown is cleared", () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, null);

    expect(onInputChange.calledOnceWith('role', '')).toBe(true);
  });

  it("forwards '' to onInputChange when called with { value: null }", () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, { value: null });

    expect(onInputChange.calledOnceWith('role', '')).toBe(true);
  });

  it("forwards '' to onInputChange when called with { value: undefined }", () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, { value: undefined });

    expect(onInputChange.calledOnceWith('role', '')).toBe(true);
  });

  it('forwards the selected value to onInputChange on a normal pick', () => {
    const onInputChange = sinon.spy();
    const instance = { props: { onInputChange } };

    ReactionDetailsScheme.prototype.onChangeRole.call(instance, { value: 'gp' });

    expect(onInputChange.calledOnceWith('role', 'gp')).toBe(true);
  });
});

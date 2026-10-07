import expect from 'expect';
import { effectiveProviderChoice } from 'src/apps/userSettings/LlmSettings';

describe('effectiveProviderChoice', () => {
  const gates = { personal: true, institutionOk: true };
  const own = [{ id: 7, enabled: true }, { id: 9, enabled: true }];

  it('keeps a saved default that is still one of the user\'s providers', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: 9 }, own, gates))
      .toEqual({ type: 'custom', defaultProviderId: 9 });
  });

  it('falls back to the oldest provider when the saved default is gone', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: null }, own, gates))
      .toEqual({ type: 'custom', defaultProviderId: 7 });
  });

  it('skips a disabled provider', () => {
    const mixed = [{ id: 7, enabled: false }, { id: 9, enabled: true }];
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: 7 }, mixed, gates))
      .toEqual({ type: 'custom', defaultProviderId: 9 });
  });

  it('shows the institution mode once the user has no provider left', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: null }, [], gates))
      .toEqual({ type: 'global', defaultProviderId: null });
  });

  it('stays on custom without providers when the institution is closed to the user', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom' }, [], { personal: true, institutionOk: false }))
      .toEqual({ type: 'custom', defaultProviderId: null });
  });

  it('leaves the institution mode when personal keys are off', () => {
    expect(effectiveProviderChoice({ provider_type: 'custom', default_llm_provider_id: 7 }, own,
      { personal: false, institutionOk: true }).type).toEqual('global');
  });
});

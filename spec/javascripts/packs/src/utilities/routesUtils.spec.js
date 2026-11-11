import expect from 'expect';
import { startRouteForRole } from 'src/utilities/routesUtils';

describe('routesUtils.startRouteForRole', () => {
  it('sends an admin to /admin', () => {
    expect(startRouteForRole('Admin')).toEqual('/admin');
  });

  it('sends a group to /command_n_control', () => {
    expect(startRouteForRole('Group')).toEqual('/command_n_control');
  });

  it('sends a person to the collections', () => {
    expect(startRouteForRole('Person')).toEqual('/mydb/collection/all');
  });

  it('falls back to the collections for an unknown role', () => {
    expect(startRouteForRole(undefined)).toEqual('/mydb/collection/all');
  });
});

/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */
import { types } from 'mobx-state-tree';

export const VersioningStore = types
  .model({
    versions: '[]',
    changed: false
  }).actions((self) => ({
    setChanged(newChanged) {
      self.changed = newChanged;
    },
    updateVersions(versions) {
      self.versions = versions;
    }
  }));

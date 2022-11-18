import { keys } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SampleTasksFetcher from 'src/fetchers/SampleTasksFetcher';

const SampleTask = types.model({
  id: types.identifierNumber,
  measurement_value: types.maybeNull(types.number),
  measurement_unit: types.maybeNull(types.string),
  description: types.maybeNull(types.string),
  private_note: types.maybeNull(types.string),
  additional_note: types.maybeNull(types.string),
  sample_id: types.maybeNull(types.number), // could be a reference later when we have samples inside the Mobx store
  display_name: types.maybeNull(types.string),
  short_label: types.maybeNull(types.string),
  sample_svg_file: types.maybeNull(types.string),
  image: types.maybeNull(types.string),
});

export const SampleTasksStore = types
  .model({
    open_sample_tasks: types.map(SampleTask), // automatically wrapped to types.optional(types.map(SampleTask), {})
    open_free_scans: types.map(SampleTask), // dito
    done: types.map(SampleTask), // dito
    sample_task_inbox_visible: types.optional(types.boolean, false) // default set manually
  })
  .actions(self => ({
    // here we are using async actions (https://mobx-state-tree.js.org/concepts/async-actions) to use promises
    // within an action
    loadOpenSampleTasks: flow(function* loadOpenSampleTasks() {
      let result = yield SampleTasksFetcher.openSampleTasks();
      result.forEach(entry => {
        let sampleTask = SampleTask.create({ ...entry })
        self.open_sample_tasks.set(sampleTask.id, sampleTask)
      });
    }),
    loadOpenFreeScans: flow(function* loadOpenFreeScans() {
      let result = yield SampleTasksFetcher.openFreeScans();
      result.forEach(entry => {
        let sampleTask = SampleTask.create({ ...entry })
        self.open_free_scans.set(sampleTask.id, sampleTask)
      });
    }),
    showSampleTaskInbox() {
      self.sample_task_inbox_visible = true;
    },
    hideSampleTaskInbox() {
      self.sample_task_inbox_visible = false;
    }
  }))
  .views(self => ({
    get openSampleTaskCount() { return keys(self.open_sample_tasks).length },
    get openFreeScanCount() { return keys(self.open_free_scans).length },
    get doneCount() { return keys(self.done).length },
    get sampleTaskInboxVisible() { return self.sample_task_inbox_visible },
  }));

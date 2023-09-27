import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import SampleTasksFetcher from 'src/fetchers/SampleTasksFetcher';
const ScanResult = types.model({
  id: types.identifierNumber,
  title: types.string,
  measurement_value: types.number,
  measurement_unit: types.string,
  attachment_id: types.number,
  position: types.number
});
const SampleTask = types.model({
  id: types.identifierNumber,
  result_value: types.maybeNull(types.number),
  result_unit: types.maybeNull(types.string),
  description: types.maybeNull(types.string),
  sample_id: types.maybeNull(types.number), // could be a reference later when we have samples inside the Mobx store
  display_name: types.maybeNull(types.string),
  short_label: types.maybeNull(types.string),
  sample_svg_file: types.maybeNull(types.string),
  required_scan_results: types.number,
  scan_results: types.array(ScanResult)
});

export const SampleTasksStore = types
  .model({
    sample_tasks: types.map(SampleTask), // automatically wrapped to types.optional(types.map(SampleTask), {})
    inbox_visible: types.optional(types.boolean, false), // default set manually
  })
  .actions(self => ({
    // here we are using async actions (https://mobx-state-tree.js.org/concepts/async-actions) to use promises
    // within an action
    load: flow(function* loadOpenSampleTasks() {
      let result = yield SampleTasksFetcher.openSampleTasks();
      self.sample_tasks.clear();
      result.forEach(entry => self.sample_tasks.set(entry.id, SampleTask.create({ ...entry })));
    }),
    showSampleTaskInbox() {
      self.inbox_visible = true;
    },
    hideSampleTaskInbox() {
      self.inbox_visible = false;
    },
    assignSample: flow(function* assignSample(sample, sampleTask) {
      let result = yield SampleTasksFetcher.assignSample(sample.id, sampleTask.id)
      if (result.id && result.done) {
        self.sample_tasks.delete(result.id);
      }
    }),
    createSampleTask: flow(function* createSampleTask(sampleId, requiredScanResults) {
      let result = yield SampleTasksFetcher.createSampleTask(sampleId, requiredScanResults)
      if (result.id) {
        let createdSampleTask = SampleTask.create({ ...result });
        self.sample_tasks.set(createdSampleTask.id, createdSampleTask)
      }
    }),
    deleteSampleTask: flow(function* deleteSampleTask(sampleTask) {
      let result = yield SampleTasksFetcher.deleteSampleTask(sampleTask.id)
      if (result.deleted == sampleTask.id) {
        self.sample_tasks.delete(sampleTask.id)
      }
      return result
    })
  }))
  .views(self => ({
    get openSampleTaskCount() { return keys(self.sample_tasks).length },
    get inboxVisible() { return self.inbox_visible },
    sampleTaskForSample(sampleId) {
      return values(self.sample_tasks).find(task => task.sample_id == sampleId)
    },
    get sortedSampleTasks() { return values(self.sample_tasks).sort((taskA, taskB) => taskB.id - taskA.id) },
  }));

import { keys, values } from 'mobx';
import { types } from 'mobx-state-tree';

import SampleTasksFetcher from 'src/fetchers/SampleTasksFetcher';

const SampleTask = types.model({
  id: types.identifierNumber,
  measurement_value: types.number,
  measurement_unit: types.string,
  description: types.string,
  private_note: types.string,
  additional_note: types.string,
  sample_id: types.number, // could be a reference later when we have samples inside the Mobx store
  display_name: types.string,
  short_label: types.string,
  sample_svg_file: types.string,
  image: types.string,
});

export const SampleTasksStore = types
  .model({
    open_sample_tasks: types.map(SampleTask),
    open_free_scans: types.map(SampleTask),
    done: types.map(SampleTask),
  })
  .actions({
    loadOpenSampleTasks() {
      SampleTasksFetcher.openSampleTasks().then(result => {
        result.forEach(entry => {
          sampleTask = SampleTask.create({ ...entry })
          self.open_sample_tasks.set(sampleTask.id, sampleTask)
        })
      })
    },
    loadOpenFreeScans() {
      SampleTasksFetcher.openFreeScans().then(result => {
        result.forEach(entry => {
          sampleTask = SampleTask.create({ ...entry })
          self.open_free_scans.set(sampleTask.id, sampleTask)
        })
      })
    },
    assignSampleId(sample_id) {
      // TODO
    }
  });

# frozen_string_literal: true

describe Chemotion::SampleTaskAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:sample) { create(:valid_sample, creator: user) }
  let(:open_sample_task) { create(:sample_task, :open, creator: user, sample: sample)}
  let(:open_free_scan) { create(:sample_task, :open_free_scan, creator: user) }
  let(:done) { create(:sample_task, :done, creator: other_user, sample: sample) }

  describe 'GET /api/v1/sample_tasks' do
    before do
      open_sample_task
      open_free_scan
      done
    end

    context 'with status = open' do
      it 'fetches all open SampleTasks for the current user' do
        get '/api/v1/sample_tasks', params: { status: :open }

        sample_task_ids = parsed_json_response.map { |sample_task| sample_task['id'] }

        expect(sample_task_ids).to eq [open_sample_task.id]
      end
    end

    context 'with status = open_free_scan' do
      it 'fetches all open SampleTasks that are free scans from the Chemobile app' do
        get '/api/v1/sample_tasks', params: { status: :open_free_scan }

        sample_task_ids = parsed_json_response.map { |sample_task| sample_task['id'] }

        expect(sample_task_ids).to eq [open_free_scan.id]
      end
    end

    context 'with status = done' do
      let(:user) { other_user } # the "done" SampleTask was created by other_user

      it 'fetches all done SampleTasks' do
        get '/api/v1/sample_tasks', params: { status: :done }

        sample_task_ids = parsed_json_response.map { |sample_task| sample_task['id'] }

        expect(sample_task_ids).to eq [done.id]
      end
    end

    context 'with unknown status' do
      it 'returns an error' do
        get '/api/v1/sample_tasks', params: { status: :something_unknown }

        expect(parsed_json_response).to eq({"error"=>"status does not have a valid value"})
        expect(response.status).to eq 400
      end
    end
  end
end

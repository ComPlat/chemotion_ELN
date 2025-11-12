# frozen_string_literal: true

describe Chemotion::SampleTaskAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:sample) do
    create(
      :valid_sample,
      creator: user,
      collections: [
        create(:collection, user: user),
        create(:collection, user: other_user),
      ],
    )
  end
  let(:forbidden_sample) do
    create(
      :sample,
      creator: other_user,
      collections: [create(:collection, user: other_user)]
    )
  end
  let(:new_sample_task) { create(:sample_task, :single_scan, creator: user, sample: sample) }
  let(:only_sample_missing) { create(:sample_task, :single_scan, :with_scan_results, creator: user) }
  let(:only_scan_result_missing) { create(:sample_task_with_incomplete_scan_results, creator: user, sample: sample) }
  let(:finished_scan) { create(:sample_task_finished, creator: user, sample: sample) }

  describe 'GET /api/v1/sample_tasks' do
    let(:sample_task_ids) { parsed_json_response['sample_tasks'].pluck('id') }

    before do
      new_sample_task
      only_sample_missing
      only_scan_result_missing
      finished_scan
    end

    context 'with status = open' do
      it 'fetches all open SampleTasks for the current user' do
        get '/api/v1/sample_tasks', params: { status: :open }

        expect(sample_task_ids).to contain_exactly(
          new_sample_task.id,
          only_sample_missing.id,
          only_scan_result_missing.id,
        )
      end
    end

    context 'with status = with_missing_scan_results' do
      it 'fetches all open SampleTasks that require more scans from the Chemobile app' do
        get '/api/v1/sample_tasks', params: { status: :with_missing_scan_results }

        expect(sample_task_ids).to contain_exactly(
          new_sample_task.id,
          only_scan_result_missing.id,
        )
      end
    end

    context 'with status = done' do
      let(:user) { other_user } # the "done" SampleTask was created by other_user

      it 'fetches all done SampleTasks' do
        get '/api/v1/sample_tasks', params: { status: :done }

        expect(sample_task_ids).to eq [finished_scan.id]
      end
    end

    context 'with unknown status' do
      it 'returns an error' do
        get '/api/v1/sample_tasks', params: { status: :something_unknown }

        expect(parsed_json_response).to eq({ 'error' => 'status does not have a valid value' })
      end

      it 'returns error 422' do
        get '/api/v1/sample_tasks', params: { status: :something_unknown }

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'POST /api/v1/sample_tasks' do
    let(:sample_task_params) do
      {
        description: 'whatever',
        required_scan_results: 2,
        sample_id: sample.id,
      }
    end

    let(:expected_result) do
      {
        description: 'whatever',
        display_name: sample.name,
        done: false,
        required_scan_results: 2,
        result_unit: 'g',
        result_value: nil,
        sample_id: sample.id,
        sample_svg_file: sample.sample_svg_file,
        scan_results: [],
        short_label: sample.short_label,
      }.stringify_keys
    end

    it 'creates a sample task' do
      post '/api/v1/sample_tasks', params: sample_task_params

      expect(parsed_json_response).to include(expected_result)
    end

    context 'when the sample can not be found' do
      let(:params) do
        {
          sample_id: forbidden_sample.id,
        }
      end

      it 'responds with an error' do
        post '/api/v1/sample_tasks', params: params

        expect(parsed_json_response).to eq({ 'error' => 'Sample not found' })
      end
    end
  end

  describe 'PUT /api/v1/sample_tasks/:id' do
    context 'when updating an open sample task' do
      let(:params) do
        {
          sample_id: sample.id,
          description: 'whatever',
        }
      end

      it 'returns the updated SampleTask' do
        put "/api/v1/sample_tasks/#{new_sample_task.id}", params: params

        expect(parsed_json_response).to include(params.stringify_keys)
      end
    end
  end

  describe 'DELETE /api/v1/sample_tasks/:id' do
    context 'when sample task is open' do
      it 'deletes the sample task and its related scan results and attachments' do
        delete "/api/v1/sample_tasks/#{new_sample_task.id}"

        expect(parsed_json_response).to include('deleted' => new_sample_task.id)
      end
    end

    context 'when sample task is not open' do
      it 'returns a 400' do
        delete "/api/v1/sample_tasks/#{finished_scan.id}"

        expect(parsed_json_response).to include('error' => 'Task could not be deleted')
      end
    end
  end
end

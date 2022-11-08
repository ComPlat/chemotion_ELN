# frozen_string_literal: true

describe Chemotion::SampleTaskAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: other_user) }
  let(:sample) { create(:valid_sample, creator: user, collections: [collection, other_collection]) }
  let(:open_sample_task) { create(:sample_task, :open, creator: user, sample: sample)}
  let(:open_free_scan) { create(:sample_task, :open_free_scan, creator: user) }
  let(:done) { create(:sample_task, :done, creator: other_user, sample: sample) }

  describe 'GET /api/v1/sample_tasks' do
    let(:sample_task_ids) { parsed_json_response['sample_tasks'].map { |sample_task| sample_task['id'] } }

    before do
      open_sample_task
      open_free_scan
      done
    end

    context 'with status = open' do
      it 'fetches all open SampleTasks for the current user' do
        get '/api/v1/sample_tasks', params: { status: :open }

        expect(sample_task_ids).to eq [open_sample_task.id]
      end
    end

    context 'with status = open_free_scan' do
      it 'fetches all open SampleTasks that are free scans from the Chemobile app' do
        get '/api/v1/sample_tasks', params: { status: :open_free_scan }

        expect(sample_task_ids).to eq [open_free_scan.id]
      end
    end

    context 'with status = done' do
      let(:user) { other_user } # the "done" SampleTask was created by other_user

      it 'fetches all done SampleTasks' do
        get '/api/v1/sample_tasks', params: { status: :done }

        expect(sample_task_ids).to eq [done.id]
      end
    end

    context 'with unknown status' do
      it 'returns an error' do
        get '/api/v1/sample_tasks', params: { status: :something_unknown }

        expect(parsed_json_response).to eq({"error"=>"status does not have a valid value"})
        expect(response.status).to eq 422
      end
    end
  end

  describe 'POST /api/v1/sample_tasks' do
    let(:open_sample_task_params) do
      {
        create_open_sample_task: {
          sample_id: sample.id
        }
      }
    end

    let(:open_free_scan_params) do
      {
        create_open_free_scan: {
          measurement_value: 123.45,
          measurement_unit: 'mg',
          description: 'description',
          additional_note: 'additional note',
          private_note: 'private note',
          file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.jpg'))
        }
      }
    end

    context 'when given a sample_id' do
      let(:expected_result) do
        {
          sample_id: sample.id,
          display_name: sample.showed_name,
          short_label: sample.short_label,
          sample_svg_file: sample.sample_svg_file,
          measurement_value: nil,
          measurement_unit: 'g', # this is the DB-default
          description: nil,
          additional_note: nil,
          private_note: nil,
          image: nil,
        }.stringify_keys
      end

      it 'creates an open sample task' do
        post '/api/v1/sample_tasks', params: open_sample_task_params

        expect(parsed_json_response).to include(expected_result)
        expect(parsed_json_response['id']).not_to be_nil
      end
    end

    context 'when given data for a free scan' do
      let(:expected_result) do
        {
          sample_id: nil,
          display_name: nil,
          short_label: nil,
          sample_svg_file: nil,
          measurement_value: 123.45,
          measurement_unit: 'mg',
          description: 'description',
          additional_note: 'additional note',
          private_note: 'private note',
        }.stringify_keys
      end

      it 'creates an open free scan' do
        post '/api/v1/sample_tasks', params: open_free_scan_params

        expect(parsed_json_response).to include(expected_result)
        expect(parsed_json_response['id']).not_to be_nil
        expect(parsed_json_response['image']).not_to be_nil
      end
    end

    context 'when both parameter groups are given' do
      let(:params) do
        {}.merge(open_sample_task_params).merge(open_free_scan_params)
      end

      it 'returns an 422 error' do
        post '/api/v1/sample_tasks', params: params

        expect(response.status).to eq 422
      end
    end

    context 'when the sample can not be found' do
      let(:params) do
        {
          create_open_sample_task: {
            sample_id: 0
          }
        }
      end
      it 'responds with an error' do
        post '/api/v1/sample_tasks', params: params

        expect(parsed_json_response).to eq({ 'error' => 'Sample not found' })
      end
    end

    context 'when required params are missing' do
      let(:params_with_missing_file) do
        {
          create_open_free_scan: {
            measurement_value: 123.45,
            measurement_unit: 'mg',
            description: 'description',
            additional_note: 'additional note',
            private_note: 'private note',
          }
        }
      end
      let(:expected_result) do
        { 'error' => 'create_open_free_scan[file] is missing' }
      end
      it 'responds with an error' do
        post '/api/v1/sample_tasks', params: params_with_missing_file

        expect(parsed_json_response).to eq(expected_result)
      end
    end
  end

  describe 'PUT /api/v1/sample_tasks/:id' do
    context 'when updating an open sample task' do
      let(:params) do
        {
          update_open_sample_task: {
            measurement_value: 123.45,
            measurement_unit: 'mg',
            description: 'description',
            additional_note: 'additional note',
            private_note: 'private note',
            file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.jpg'))
          }
        }
      end

      it 'returns the updated SampleTask' do
        put "/api/v1/sample_tasks/#{open_sample_task.id}", params: params

        expect(parsed_json_response).to include(params[:update_open_sample_task].except(:file).stringify_keys)
      end

      it 'updates the referenced sample with the measurement data' do
        put "/api/v1/sample_tasks/#{open_sample_task.id}", params: params

        expect(parsed_json_response).not_to have_key('error')

        updated_sample_task = SampleTask.find(open_sample_task.id)

        expect(updated_sample_task.measurement_value).to eq 123.45
        expect(updated_sample_task.measurement_unit).to eq 'mg'
        expect(updated_sample_task.description).to eq 'description'
        expect(updated_sample_task.additional_note).to eq 'additional note'
        expect(updated_sample_task.additional_note).to eq 'additional note'
        expect(updated_sample_task.attachment).not_to be_nil
      end
    end

    context 'when updating an open free scan with a sample id' do
      let(:params) do
        {
          update_open_free_scan: {
            sample_id: sample.id
          }
        }
      end

      it 'returns the updated SampleTask' do
        put "/api/v1/sample_tasks/#{open_free_scan.id}", params: params

        expected_attributes = { sample_id: sample.id, measurement_value: 123.45 }.stringify_keys
        expect(parsed_json_response).to include(expected_attributes)
      end

      it 'updates the referenced sample with the measurement data' do
        put "/api/v1/sample_tasks/#{open_free_scan.id}", params: params

        sample.reload

        expect(sample.real_amount_value).to eq open_free_scan.measurement_value
        expect(sample.real_amount_unit).to eq open_free_scan.measurement_unit
        expect(sample.description).to eq open_free_scan.description
      end
    end
  end
end

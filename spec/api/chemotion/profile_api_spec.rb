# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ProfileAPI do
  include_context 'api request authorization context'

  let(:user) { create(:user) }
  let(:headers) { { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' } }
  let(:content) { 'Test ketcher file content' }
  let(:folder_path) { Rails.root.join('uploads', Rails.env, "user_templates/#{user.id}") }
  let(:file_path) { "#{folder_path}/#{SecureRandom.alphanumeric(10)}.txt" }

  describe 'GET /api/v1/profiles' do
    before do
      # Avoid picking up stale, non-JSON template files left on disk by other
      # specs when a user id is reused across runs.
      FileUtils.rm_rf(Rails.root.join('uploads', Rails.env, "user_templates/#{user.id}"))
    end

    context 'when the profile has no stored layout yet' do
      # Non-Person users skip Profile#set_default, and legacy profiles can also
      # have empty profile data with no 'layout' key.
      before { user.profile.update!(data: {}) }

      it 'returns the profile successfully' do
        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
        response_body = JSON.parse(response.body)
        expect(response_body['data']).not_to be_nil
        # Profiles with no stored layout still receive the configured defaults.
        expect(response_body.dig('data', 'layout', 'sample')).to eq(
          Rails.configuration.profile_default.layout.dig(:layout, :sample),
        )
      end

      it 'does not mutate the shared default-layout config' do
        # The layout config is one hash shared across every request. Deep-freeze
        # it: the old code leaked a reference into the per-request data and then
        # mutated it, which (a) corrupted process-wide state and (b) made
        # concurrent first-time sign-ins raise
        # "can't add a new key into hash during iteration". Mutating a frozen
        # hash raises here instead, so a regression fails this test loudly.
        frozen = Rails.configuration.profile_default.layout.deep_dup
        frozen.each_value { |v| v.freeze if v.is_a?(Hash) }
        frozen.freeze
        allow(Rails.configuration.profile_default).to receive(:layout).and_return(frozen)

        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
      end
    end

    context 'when genericElement is enabled but no generic ElementKlass is active' do
      before do
        allow(user).to receive(:matrix_check_by_name).and_call_original
        allow(user).to receive(:matrix_check_by_name).with('genericElement').and_return(true)
      end

      it 'keeps the built-in ELN elements in the returned layout' do
        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
        layout = JSON.parse(response.body).dig('data', 'layout')

        # Regression: the layout filter used to strip built-in elements when no
        # generic element was active, wiping sample/reaction/etc. from the tab
        # layout and the "Create" menu.
        expect(layout).to include('sample', 'reaction', 'wellplate', 'screen', 'research_plan')
        expect(layout['sample']).to be_positive
      end
    end

    context 'when the config default omits a built-in element' do
      before do
        # A site whose profile_default.yml predates vessel, or that dropped it
        # deliberately. The file is the single source of truth, so the endpoint
        # must not reinstate the element behind the administrator's back.
        stale_config = ActiveSupport::OrderedOptions.new
        stale_config.layout = { layout: { sample: 1, reaction: 2 } }
        allow(Rails.configuration).to receive(:profile_default).and_return(stale_config)
        user.profile.update!(data: user.profile.data.merge('layout' => { 'sample' => 1, 'reaction' => 2 }))
      end

      it 'does not inject the element into the layout' do
        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
        layout = JSON.parse(response.body).dig('data', 'layout')

        expect(layout.keys).to contain_exactly('sample', 'reaction')
        expect(layout).not_to include('vessel')
      end
    end

    context 'when the layout configuration is blank' do
      # The initializer's rescue path, or a hand-emptied :layout: key. The
      # allow-list would be empty, and filtering on it would strip every element
      # out of the layout - the very failure this endpoint was fixed for.
      let(:stored_layout) { { 'sample' => 1, 'reaction' => 2, 'vessel' => -1 } }

      before do
        blank_config = ActiveSupport::OrderedOptions.new
        blank_config.layout = {}
        allow(Rails.configuration).to receive(:profile_default).and_return(blank_config)
        allow(user).to receive(:matrix_check_by_name).and_call_original
        allow(user).to receive(:matrix_check_by_name).with('genericElement').and_return(true)
        user.profile.update!(data: user.profile.data.merge('layout' => stored_layout))
      end

      it 'returns the stored layout unstripped' do
        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
        layout = JSON.parse(response.body).dig('data', 'layout')

        expect(layout.keys).to match_array(stored_layout.keys)
      end

      it 'does not persist an empty layout on update' do
        put '/api/v1/profiles', params: { data: {} }.to_json, headers: headers

        expect(response).to have_http_status(:success)
        expect(user.profile.reload.data['layout']).to eq(stored_layout)
      end
    end

    context 'when the stored layout holds a zero position' do
      before do
        user.profile.update!(
          data: user.profile.data.merge('layout' => { 'sample' => 1, 'reaction' => 0, 'vessel' => -1 }),
        )
        allow(user).to receive(:matrix_check_by_name).and_call_original
        allow(user).to receive(:matrix_check_by_name).with('genericElement').and_return(true)
      end

      it 'keeps the entry as hidden instead of dropping it' do
        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
        layout = JSON.parse(response.body).dig('data', 'layout')

        # 0 is neither positive nor negative, so the old sign test discarded it
        # from both sides of the reindex and the element vanished.
        expect(layout).to include('reaction')
        expect(layout['reaction']).to be_negative
      end
    end

    context 'when the profile is seeded from the configured default' do
      before { user.profile.update!(data: {}) }

      it 'stores the layout under string keys only' do
        get '/api/v1/profiles', headers: headers

        expect(response).to have_http_status(:success)
        # The configuration is symbol-keyed while the endpoint works in strings.
        # Mixing the two persists :sample alongside 'sample' - invisible in the
        # response, because JSON collapses them.
        layout = JSON.parse(response.body).dig('data', 'layout')
        expect(layout.keys).to all(be_a(String))
        expect(layout.keys.uniq.size).to eq(layout.keys.size)
      end
    end
  end

  describe 'POST /api/v1/profiles' do
    context 'when the request is valid' do
      it 'creates a new template and saves the file' do
        post '/api/v1/profiles', params: { content: content }.to_json, headers: headers
        expect(response).to have_http_status(:success)
        response_body = JSON.parse(response.body)
        expect(response_body['template_details']).not_to be_nil
        expect(response_body['error_messages']).to be_empty
      end
    end

    context 'when the request is invalid' do
      it 'returns an error if content is missing' do
        post '/api/v1/profiles', params: { content: '' }.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        response_body = JSON.parse(response.body)
        expect(response_body['error_messages']).not_to be_empty
      end
    end

    context 'when file saving fails due to permission issues' do
      before do
        allow(File).to receive(:write).and_raise(Errno::EACCES)
      end

      it 'returns a 500 status code' do
        post '/api/v1/profiles', params: { content: content }.to_json, headers: headers

        expect(response).to have_http_status(:internal_server_error)
        expect(response.body).to include('Save files error!')
      end
    end
  end

  describe 'DELETE /api/v1/profiles' do
    before do
      # Ensure the file exists
      FileUtils.mkdir_p(folder_path)
      File.write(file_path, 'Test content')
    end

    after do
      # Clean up the file if it still exists
      FileUtils.rm_f(file_path)
    end

    context 'when the file exists' do
      it 'deletes the user template and returns status true' do
        # Assuming file_path is a valid path to an existing file
        delete '/api/v1/profiles', params: { path: file_path }.to_json, headers: headers
        expect(response).to have_http_status(:success)
        response_body = JSON.parse(response.body)
        expect(response_body['status']).to be true
      end
    end

    context 'when the file does not exist' do
      it 'returns a 422 error when the file does not exist' do
        non_existent_path = "#{folder_path}/non_existent_file.txt"

        delete '/api/v1/profiles', params: { path: non_existent_path }.to_json, headers: headers

        expect(response).to have_http_status(:success)

        # Verify the file still does not exist
        expect(File.exist?(non_existent_path)).to be false
      end
    end

    context 'when the path is empty' do
      it 'returns a 422 error when the path is empty' do
        empty_path = ''

        delete '/api/v1/profiles', params: { path: empty_path }.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        response_body = JSON.parse(response.body)
        expect(response_body['error_messages']).to include('path cannot be blank')
      end
    end

    context 'when the path is invalid' do
      it 'returns a 422 error when the path is invalid' do
        invalid_path = '/invalid/path/to/template.txt'

        delete '/api/v1/profiles', params: { path: invalid_path }.to_json, headers: headers

        expect(response).to have_http_status(:success)
      end
    end
  end

  describe 'PUT /api/v1/profiles/editors/ketcher-options' do
    let(:folder_path) { 'ketcher-optns' }
    let(:complete_folder_path) { Rails.root.join('uploads', Rails.env, folder_path) }
    let(:file_path) { "#{complete_folder_path}/#{user.id}.json" }
    let(:valid_data) { { option1: 'value1', option2: 'value2' } }
    let(:headers) { { 'Content-Type': 'application/json' } }

    before do
      # Ensure the file exists
      FileUtils.mkdir_p(complete_folder_path)
      File.write(file_path, valid_data)
    end

    after do
      # Clean up the file if it still exists
      FileUtils.rm_f(file_path)
    end

    context 'when valid data is provided' do
      it 'creates or updates the ketcher options file and saves the attachment' do
        put '/api/v1/profiles/editors/ketcher-options', params: { data: valid_data }.to_json, headers: headers

        expect(response).to have_http_status(:success)

        expect(File.exist?(file_path)).to be true
        file_content = JSON.parse(File.read(file_path))
        expect(file_content).to eq(valid_data.stringify_keys)
      end
    end

    context 'when the attachment cannot be saved' do
      it 'returns a 422 error if the attachment record cannot be saved' do
        attachment = instance_double(Attachment, save: false) # Create a double for the Attachment
        allow(Attachment).to receive(:new).and_return(attachment) # Stub the creation of the attachment

        put '/api/v1/profiles/editors/ketcher-options', params: { data: valid_data }.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        response_body = JSON.parse(response.body)
        expect(response_body['status']).to be false
        expect(response_body['error_messages']).not_to be_empty
      end
    end

    context 'when an unexpected error occurs' do
      it 'returns a 500 error if an unexpected error occurs' do
        allow(File).to receive(:write).and_raise(StandardError.new('Unexpected error'))

        put '/api/v1/profiles/editors/ketcher-options', params: { data: valid_data }.to_json, headers: headers
        response_body = JSON.parse(response.body)
        expect(response_body['status']).to be false
        expect(response_body['error_messages']).to include('Unexpected error')
      end
    end
  end

  describe 'GET /api/v1/profiles/editors/ketcher-options' do
    context 'when the settings file exists' do
      it 'returns the Ketcher 2 settings successfully' do
        file_content = { 'option1' => 'value1', 'option2' => 'value2' }.to_json
        file_path = Rails.root.join('uploads', Rails.env, "ketcher-optns/#{user.id}.json")

        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(File).to receive(:read).with(file_path).and_return(file_content)

        get '/api/v1/profiles/editors/ketcher-options', headers: headers

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)).to eq('status' => true, 'settings' => JSON.parse(file_content))
      end
    end

    context 'when the settings file does not exist' do
      it 'returns default settings with a success status' do
        file_path = Rails.root.join('uploads', Rails.env, "ketcher-optns/#{user.id}.json")

        allow(File).to receive(:exist?).with(file_path).and_return(false)

        get '/api/v1/profiles/editors/ketcher-options', headers: headers

        expect(response).to have_http_status(:ok)
        response_body = JSON.parse(response.body)
        expect(response_body['status']).to be true
        expect(response_body['settings']).to eq({})
        expect(response_body['message']).to eq('Settings file not found, using default settings')
      end
    end

    context 'when the settings file is unreadable' do
      it 'returns an error message' do
        file_path = Rails.root.join('uploads', Rails.env, "ketcher-optns/#{user.id}.json")

        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(File).to receive(:read).with(file_path).and_raise(Errno::EACCES)

        get '/api/v1/profiles/editors/ketcher-options', headers: headers

        expect(response).to have_http_status(:ok)
        response_body = JSON.parse(response.body)
      end
    end

    context 'when a StandardError occurs while reading the file' do
      it 'returns an error message' do
        file_path = Rails.root.join('uploads', Rails.env, "ketcher-optns/#{user.id}.json")

        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(File).to receive(:read).with(file_path).and_raise(StandardError.new('Unexpected error'))

        get '/api/v1/profiles/editors/ketcher-options', headers: headers

        expect(response).to have_http_status(:ok)
        response_body = JSON.parse(response.body)
        expect(response_body['status']).to be false
        expect(response_body['error_messages']).to include('Issues with reading settings file')
      end
    end
  end
end

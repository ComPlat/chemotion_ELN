# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ProfileAPI do
  include_context 'api request authorization context'

  let(:user) { create(:user) }
  let(:headers) { { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' } }
  let(:content) { 'Test ketcher file content' }
  let(:folder_path) { Rails.root.join('uploads', Rails.env, "user_templates/#{user.id}") }
  let(:file_path) { "#{folder_path}/#{SecureRandom.alphanumeric(10)}.txt" }

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

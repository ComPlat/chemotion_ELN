# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AttachmentAPI do
  include_context 'api request authorization context'

  let(:expected_response) do
    {
      'attachment' => {
        'aasm_state' => attachment.aasm_state,
        'content_type' => attachment.content_type,
        'filename' => attachment.filename,
        'id' => attachment.id,
        'identifier' => attachment.identifier,
        'thumb' => attachment.thumb
      }
    }
  end
  let(:attachment_id) { attachment.id }

  describe 'DELETE /api/v1/attachments/{attachment_id}' do
    let(:execute_request) { delete "/api/v1/attachments/#{attachment_id}" }

    before do |example|
      allow(Usecases::Attachments::Delete).to receive(:execute!) if example.metadata[:enable_usecases_attachments_delete].present?
      allow(AttachmentPolicy).to receive(:can_delete?).and_return(true) if example.metadata[:enable_attachment_policy_can_delete].present?
      execute_request
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when "AttachmentPolicy" denies deletion' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when "AttachmentPolicy" allows deletion', :enable_attachment_policy_can_delete do
      let(:attachment) { create(:attachment) }

      it 'returns with the right http status' do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'deletes the attachment on database', :enable_usecases_attachments_delete do
        expect(Usecases::Attachments::Delete).to have_received(:execute!)
      end
    end
  end

  describe 'DELETE /api/v1/attachments/link/{attachment_id}' do
    let(:execute_request) { delete "/api/v1/attachments/link/#{attachment_id}" }

    before do |example|
      allow(Usecases::Attachments::Unlink).to receive(:execute!) if example.metadata[:enable_usecases_attachments_unlink].present?
      allow(AttachmentPolicy).to receive(:can_delete?).and_return(true) if example.metadata[:enable_attachment_policy_can_delete].present?
      execute_request
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when "AttachmentPolicy" denies deletion' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when "AttachmentPolicy" allows deletion', :enable_attachment_policy_can_delete do
      let(:container) { create(:container, containable: user) }
      let(:attachment) { create(:attachment, attachable: container) }

      it 'returns with the right http status' do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'unlinks the attachment from container', :enable_usecases_attachments_unlink do
        expect(Usecases::Attachments::Unlink).to have_received(:execute!)
      end
    end
  end

  describe 'POST /api/v1/attachments/upload_dataset_attachments' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/upload_chunk' do
    let(:params) do
      {
        file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt')),
        key: '116d5a66-7188-4527-ba42-9a97edab9dfc',
        counter: 1
      }
    end
    let(:execute_request) { post '/api/v1/attachments/upload_chunk', params: params }

    before do |example|
      allow(Usecases::Attachments::UploadChunk).to receive(:execute!) if example.metadata[:enable_usecases_attachments_upload_chunk].present?
      allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(false) if example.metadata[:disable_attachment_policy_can_upload_chunk].present?
      allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(true) if example.metadata[:enable_attachment_policy_can_upload_chunk].present?
      execute_request
    end

    context 'when "AttachmentPolicy" denies upload', :disable_attachment_policy_can_upload_chunk do
      let(:expected_response) do
        { 'ok' => false, 'statusText' => 'File key is not valid' }
      end

      it 'returns with the right http status' do
        expect(response.status).to eq(201)
      end

      it 'returns a custom error message' do
        expect(parsed_json_response).to eq(expected_response)
      end
    end

    context 'when "AttachmentPolicy" allows upload', :enable_attachment_policy_can_upload_chunk do
      let(:expected_response) { true }

      after { FileUtils.rm_rf(Rails.root.join('tmp', 'uploads', 'chunks')) }

      it 'returns with the right http status' do
        expect(response.status).to eq(201)
      end

      it 'returns a simple true' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'stores the file', :enable_usecases_attachments_upload_chunk do
        expect(Usecases::Attachments::UploadChunk).to have_received(:execute!)
      end
    end
  end

  describe 'POST /api/v1/attachments/upload_chunk_complete' do
    let(:filename) { 'upload_chunks_completed.txt' }
    let(:key) { '453cc77f-e0e6-4757-b47b-656137eb7084' }
    let(:checksum) { 'adb11f193ccbcb0cfe7d28806bc43e8e' }
    let(:params) { { filename: filename, key: key, checksum: checksum } }

    let(:execute_request) { post '/api/v1/attachments/upload_chunk_complete', params: params }
    let(:chunk_file1) { Rails.root.join('tmp', 'uploads', 'chunks', "#{key}$0") }
    let(:chunk_file2) { Rails.root.join('tmp', 'uploads', 'chunks', "#{key}$1") }
    let(:simulate_upload_chunks) do
      source = Rails.root.join('spec', 'fixtures', 'upload.txt')
      FileUtils.mkdir_p(Rails.root.join('tmp', 'uploads', 'chunks'))

      FileUtils.cp(source, chunk_file1)
      FileUtils.cp(source, chunk_file2)
    end

    before do |example|
      simulate_upload_chunks
      allow(Usecases::Attachments::UploadChunkComplete).to receive(:execute!) if example.metadata[:enable_usecases_attachments_upload_chunk_complete].present?
      allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(false) if example.metadata[:disable_attachment_policy_can_upload_chunk].present?
      allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(true) if example.metadata[:enable_attachment_policy_can_upload_chunk].present?
      execute_request
    end

    after do
      FileUtils.rm_rf(Rails.root.join('tmp', 'uploads', 'full'))
      FileUtils.rm_rf(Rails.root.join('tmp', 'uploads', 'chunks'))
    end

    context 'when "AttachmentPolicy" denies upload', :disable_attachment_policy_can_upload_chunk do
      let(:expected_response) do
        { 'ok' => false, 'statusText' => 'File key is not valid' }
      end

      it 'returns with the right http status' do
        expect(response.status).to eq(201)
      end

      it 'returns a custom error message' do
        expect(parsed_json_response).to eq(expected_response)
      end
    end

    context 'when "AttachmentPolicy" allows upload but checksum is wrong', :enable_attachment_policy_can_upload_chunk do
      let(:checksum) { 'invalid' }
      let(:expected_response) do
        { 'ok' => false, 'statusText' => 'File upload has error. Please try again!' }
      end

      it 'returns with the right http status' do
        expect(response.status).to eq(201)
      end

      it 'returns a custom error message' do
        expect(parsed_json_response).to eq(expected_response)
      end
    end

    context 'when "AttachmentPolicy" allows upload', :enable_attachment_policy_can_upload_chunk do
      let(:expected_response) { true }

      it 'returns with the right http status' do
        expect(response.status).to eq(201)
      end

      it 'returns a simple true' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'create the attachment', :enable_usecases_attachments_upload_chunk_complete do
        expect(Usecases::Attachments::UploadChunkComplete).to have_received(:execute!)
      end
    end
  end

  describe 'POST /api/v1/attachments/upload_to_inbox' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/{attachment_id}' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/zip/{container_id}' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/sample_analyses/{sample_id}' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/image/{attachment_id}' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/thumbnail/{attachment_id}' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/thumbnails' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/files' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/regenerate_spectrum' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/save_spectrum' do
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/infer' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/svgs' do
    pending 'not yet implemented'
  end
end

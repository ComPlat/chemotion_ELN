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
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/upload_chunk' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/upload_chunk_complete' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/upload_to_inbox' do
    pending 'work in progress'
  end

  describe 'GET /api/v1/attachments/{attachment_id}' do
    pending 'work in progress'
  end

  describe 'GET /api/v1/attachments/zip/{container_id}' do
    pending 'work in progress'
  end

  describe 'GET /api/v1/attachments/sample_analyses/{sample_id}' do
    pending 'work in progress'
  end

  describe 'GET /api/v1/attachments/image/{attachment_id}' do
    pending 'work in progress'
  end

  describe 'GET /api/v1/attachments/thumbnail/{attachment_id}' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/thumbnails' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/files' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/regenerate_spectrum' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/save_spectrum' do
    pending 'work in progress'
  end

  describe 'POST /api/v1/attachments/infer' do
    pending 'work in progress'
  end

  describe 'GET /api/v1/attachments/svgs' do
    pending 'work in progress'
  end
end

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
      allow(ElementPolicy).to receive(:update?).and_return(true) if example.metadata[:enable_element_policy_mock].present?
      execute_request if example.metadata[:skip_execute_request].blank?
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when attachment is unrelated to current user' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when attachment is not attached to a container and created for current user' do
      let(:attachment) { create(:attachment, created_for: user.id, attachable: nil) }

      it 'returns with the right http status' do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'deletes the attachment on database', :skip_execute_request do
        attachment.save
        expect { execute_request }.to change(Attachment, :count).by(-1)
      end
    end

    context 'when attachment is attached to a container owned by current user' do
      let(:container) { create(:container, containable: user) }
      let(:attachment) { create(:attachment, attachable: container) }

      it 'returns with the right http status' do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'deletes the attachment on database', :skip_execute_request do
        attachment.save
        expect { execute_request }.to change(Attachment, :count).by(-1)
      end
    end

    context 'when attachment is attached to a container and current user has update rights' do
      let(:other_user) { create(:person) }
      let(:container) { create(:container, containable: other_user) }
      let(:attachment) { create(:attachment, attachable: container) }

      it 'returns with the right http status', :enable_element_policy_mock do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment', :enable_element_policy_mock do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'deletes the attachment on database', :skip_execute_request, :enable_element_policy_mock do
        attachment.save
        expect { execute_request }.to change(Attachment, :count).by(-1)
      end
    end
  end

  describe 'DELETE /api/v1/attachments/link/{attachment_id}' do
    let(:execute_request) { delete "/api/v1/attachments/link/#{attachment_id}" }

    before do |example|
      allow(ElementPolicy).to receive(:update?).and_return(true) if example.metadata[:enable_element_policy_mock].present?
      execute_request if example.metadata[:skip_execute_request].blank?
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when attachment is unrelated to current user' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response.status).to eq(401)
      end
    end

    context 'when attachment is not attached to a container and created for current user' do
      let(:attachment) { create(:attachment, created_for: user.id, attachable: nil) }

      it 'returns with the right http status' do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'sets the attachment_type to "Container"', :skip_execute_request do
        attachment.save
        expect do
          execute_request
          attachment.reload
        end.to change(attachment, :attachable_type).from(nil).to('Container')
      end
    end

    context 'when attachment is attached to a container owned by current user' do
      let(:container) { create(:container, containable: user) }
      let(:attachment) { create(:attachment, attachable: container) }

      it 'returns with the right http status' do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'unlinks the attachment from container', :skip_execute_request do
        attachment.save
        expect do
          execute_request
          attachment.reload
        end.to change(attachment, :attachable_id).from(container.id).to(nil)
      end

      it 'sets the attachment_type to "Container"', :skip_execute_request do
        attachment.save
        expect do
          execute_request
          attachment.reload
        end.not_to change(attachment, :attachable_type)
      end
    end

    context 'when attachment is attached to a container and current user has update rights' do
      let(:other_user) { create(:person) }
      let(:container) { create(:container, containable: other_user) }
      let(:attachment) { create(:attachment, attachable: container) }

      it 'returns with the right http status', :enable_element_policy_mock do
        expect(response.status).to eq(200)
      end

      it 'returns the deleted attachment', :enable_element_policy_mock do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'unlinks the attachment from container', :skip_execute_request, :enable_element_policy_mock do
        attachment.save
        expect do
          execute_request
          attachment.reload
        end.to change(attachment, :attachable_id).from(container.id).to(nil)
      end

      it 'sets the attachment_type to "Container"', :skip_execute_request, :enable_element_policy_mock do
        attachment.save
        expect do
          execute_request
          attachment.reload
        end.not_to change(attachment, :attachable_type)
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

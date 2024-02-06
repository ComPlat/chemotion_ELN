# frozen_string_literal: true

require 'rails_helper'
require 'labimotion/helpers/generic_helpers'

RSpec.describe Labimotion::GenericHelpers, type: :helper do
  let(:tmp_file) { fixture_file_upload(Rails.root.join('spec/fixtures/upload.png')) }
  let(:id) { nil }

  describe '.create_uploads' do
    subject { create_uploads(type, id, files, param_info, user_id) }

    let(:type) { nil }
    let(:files) { nil }
    let(:param_info) { nil }
    let(:user_id) { nil }
    let(:research_plan) { create(:research_plan, :with_image_field) }

    context 'when any param is nil' do
      it 'return empty' do
        expect(subject).to be_nil # rubocop:disable RSpec/NamedSubject
      end
    end
  end

  describe '.create_attachments' do
    let(:ids_of_uploaded_files) { create_attachments(files, del_files, type, id, identifier, user_id) }
    let(:files) { nil }
    let(:del_files) { nil }
    let(:type) { nil }
    let(:identifier) { nil }
    let(:user_id) { nil }
    let(:user) { create(:user) }
    let(:research_plan) { create(:research_plan, :with_image_field) }

    context 'when files is nil' do
      it 'return empty array' do
        expect(ids_of_uploaded_files).to eq []
      end
    end

    context 'when a file is upload' do
      let(:tmp_file) { fixture_file_upload(Rails.root.join('spec/fixtures/upload.png')) }
      let(:files) {  [{ filename: 'test', container_id: '', tempfile: tmp_file, type: '' }] }
      let(:del_files) { nil }
      let(:type) { 'ResearchPlan' }
      let(:id) { research_plan.id }
      let(:user_id) { user.id }
      let(:identifier) { [research_plan.body[0]['value']['public_name']] }

      it 'return not empty array' do
        expect(ids_of_uploaded_files).not_to eq []
      end

      it 'return correct identifier' do
        attachment = Attachment.find(ids_of_uploaded_files.first)

        expect(attachment['identifier']).to eq identifier.first
      end
    end
  end
end

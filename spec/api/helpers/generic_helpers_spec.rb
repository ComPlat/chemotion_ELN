# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GenericHelpers, type: :helper do

  describe '.create_uploads' do
    let(:type) { nil }
    let(:id) { nil }
    let(:files) { nil }
    let(:param_info) { nil }
    let(:user_id) { nil }
    let(:research_plan) { create(:research_plan, :with_image_field) }

    subject { create_uploads(type, id, files, param_info, user_id) }

    context 'when any param is nil' do
      it 'return empty' do
        expect(subject).to be nil
      end
    end
  end

  describe '.create_attachments' do
    let(:files) { nil }
    let(:del_files) { nil }
    let(:type) { nil }
    let(:id) { nil }
    let(:identifier) { nil }
    let(:user_id) { nil }
    let(:user) { create(:user) }
    let(:research_plan) { create(:research_plan, :with_image_field) }

    subject { create_attachments(files, del_files, type, id, identifier, user_id) }

    context 'when files is nil' do
      it 'return empty array' do
        expect(subject).to eq []
      end
    end

    context 'when a file is upload' do
      let(:tmp_file) { Tempfile.new('upload_data.png') }
      let(:files) {  [{filename: 'test', container_id: '', tempfile: tmp_file, type: '' }] }
      let(:del_files) { nil }
      let(:type) { 'ResearchPlan' }
      let(:id) { research_plan.id }
      let(:user_id) { user.id }
      let(:identifier) { [research_plan.body[0]['value']['public_name']] }

      it 'return not empty array' do
        expect(subject).not_to eq []
      end

      it 'return correctly identifier' do
        attachment = Attachment.find(subject[0])

        expect(attachment['identifier']).to eq identifier[0]
      end
    end
  end
end

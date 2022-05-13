# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AttachmentAPI do
  let(:file_upload) do
    {
      file_1: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain'),
      file_2: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain')
    }
  end
  let(:img_upload) do
    {
      file_1: fixture_file_upload(Rails.root.join('spec/fixtures/upload.jpg'))
    }
  end

  let(:user) { create(:user, first_name: 'Person', last_name: 'Test') }
  let(:u2) { create(:user) }
  let(:group) { create(:group) }
  let(:c1) { create(:collection, user_id: user.id) }
  let!(:cont_s1_root) { create(:container) }
  let!(:s1) do
    create(:sample_without_analysis, name: 'sample 1', container: cont_s1_root)
  end
  let!(:cont_s1_analyses) { create(:container, container_type: 'analyses') }
  let!(:cont_s1_analysis) { create(:analysis_container) }
  let!(:new_attachment) do
    create(
      :attachment,
      storage: 'tmp', key: '8580a8d0-4b83-11e7-afc4-85a98b9d0194',
      filename: 'upload.jpg',
      file_path: File.join(Rails.root, 'spec/fixtures/upload.jpg'),
      created_by: user.id, created_for: user.id
    )
  end
  let(:new_local_attachment) { build(:attachment, storage: 'local') }

  context 'authorized user logged in' do
    let(:attachments) do
      Attachment.where(created_by: user, filename: 'upload.txt')
    end
    let(:img_attachments) do
      Attachment.where(created_by: user, filename: 'upload.jpg')
    end

    before do
      CollectionsSample.create!(sample: s1, collection: c1)

      cont_s1_root.children << cont_s1_analyses
      cont_s1_root.save!
      cont_s1_analyses.children << cont_s1_analysis
      cont_s1_analyses.save!

      img_attachments.last.update!(
        attachable_id: cont_s1_analysis.id,
        attachable_type: 'Container'
      )
    end

    after(:all) do
      `rm -rf #{File.join(Rails.root, 'tmp', 'test')}`
      puts "delete tmp folder #{File.join(Rails.root, 'tmp', 'test')} "
    end

    describe 'Download attachment thru GET attachments/:attachment_id' do
      let(:headers) do
        {
          "Authorization" => JsonWebToken.encode(client_id: '123', current_user_id: user.id, exp: 24.hours.from_now)
        }
      end

      before do
        get '/api/v1/attachments_jwt/' + img_attachments.last['id'].to_s, headers: headers
      end

      it 'stores file localy' do
        expect(response.body).not_to be_empty
      end
    end

    describe 'upload files thru POST attachments/upload_dataset_attachments' do
      let(:params) do
        {
          'file' => fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain'),
          'attachable_id' => cont_s1_analysis.id,
          'attachable_type' => 'Container'
        }
      end
      let(:headers) do
        {
          "Authorization" => JsonWebToken.encode(client_id: '123', current_user_id: user.id, exp: 24.hours.from_now)
        }
      end

      before do
        post '/api/v1/attachments_jwt/upload_attachments', params: params, headers: headers
      end

      it 'creates attachments for each file' do
        expect(attachments.count).to eq 1
      end

      it 'stores file localy' do
        expect(File.exist?(attachments.last.store.path)).to be true
      end

      it 'creates attachments for each file' do
        expect(response.body).to eq("true")
      end
    end
  end
end

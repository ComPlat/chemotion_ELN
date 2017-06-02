require 'rails_helper'

describe Chemotion::CollectionAPI do
  let(:file_upload) {
    {
      file_1: fixture_file_upload('spec/fixtures/upload.txt', 'text/plain'),
      file_2: fixture_file_upload('spec/fixtures/upload.txt', 'text/plain')
    }
  }
  let(:img_upload) {
    {
      file_1: fixture_file_upload('spec/fixtures/upload.jpg')
    }
  }

  let(:user)  { create(:user, first_name: 'Musashi', last_name: 'M') }
  let(:u2)    { create(:user) }
  let(:group) { create(:group)}
  let!(:owner) { create(:user) }
  let(:new_attachment) { build(:attachment)}
  let(:new_local_attachment) { build(:attachment, storage: 'local')}

  context 'authorized user logged in' do
    let(:attachments) {
      Attachment.where(created_by: user, filename: 'upload.txt')
    }
    let(:img_attachment) {
      Attachment.where(created_by: user, filename: 'upload.jpg')
    }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'upload files thru POST attachments/upload_dataset_attachments' do
      before do
         post '/api/v1/attachments/upload_dataset_attachments', file_upload
      end

      it 'creates attachments for each file' do
        expect(attachments.count).to be 2
      end

      it 'stores file localy' do
        expect(File.exist?(attachments.last.store.path)).to be true
      end
    end

    describe 'upload img thru POST attachments/upload_dataset_attachments' do
      before do
         post '/api/v1/attachments/upload_dataset_attachments', img_upload
      end

      it 'creates attachments for each file' do
        expect(img_attachment.count).to be 1
      end

      it 'stores file localy' do
        expect(File.exist?(img_attachment.last.store.path)).to be true
      end

      it 'creates thumbnail localy' do
        expect(File.exist?(img_attachment.last.store.thumb_path)).to be true
      end
    end

    after(:all) do
      `rm -rf #{File.join(Rails.root,'tmp','test')}`
      puts "delete tmp folder #{File.join(Rails.root,'tmp','test')} "
    end
  end
end

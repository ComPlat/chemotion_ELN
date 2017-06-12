# frozen_string_literal: true
require 'rails_helper'

RSpec.describe Attachment, type: :model do
  describe 'creation' do
    let(:file_path) { "#{Rails.root}/spec/fixtures/upload.txt" }
    let(:file_data) { File.read(file_path) }
    let(:file_name) { File.basename(file_path) }
    let!(:attachment) { FactoryGirl.create(:attachment) }
    let!(:attachment_with_file) {
      FactoryGirl.create(:attachment, filename: file_name, file_data: file_data)
    }
    let(:new_attachment) {
      FactoryGirl.build(:attachment, filename: file_name, file_data: file_data)
    }
    let(:new_attachment_with_img) {
      FactoryGirl.build(
        :attachment, filename: 'upload.jpg', key: SecureRandom.uuid,
        file_path: "#{Rails.root}/spec/fixtures/upload.jpg"
        #file_data: File.read("#{Rails.root}/spec/fixtures/upload.jpg")
      )
    }

    context 'after_create' do
      before do
        new_attachment.save!
      end
      it 'is possible to create a valid attachment' do
        expect(attachment.valid?).to be(true)
      end

      it 'has a valid uuid identifier' do
        expect(attachment.identifier).to match(
         /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        )
      end

      it 'checksummed the file_data' do
       expect(attachment_with_file.checksum).to eq(
         Digest::SHA256.file(file_path).hexdigest
       )
     end



    end

    # describe 'add_checksum' do
    #   before { new_attachment.send(:add_checksum)}
    #   it 'checksums the file_data' do
    #     expect(new_attachment.checksum).to eq(
    #       Digest::SHA256.file(file_path).hexdigest
    #     )
    #   end
    # end

    describe 'generate_key' do
      before { new_attachment.send(:generate_key)}
      it 'generates a uuid  key' do
        expect(new_attachment.key).to match(
          /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        )
      end
    end

    describe 'store_tmp_file_and_thumbnail' do
      it 'stores file in tmp_folder' do
        expect(new_attachment_with_img.send(:store_tmp_file_and_thumbnail)).to be true
        expect(new_attachment_with_img.thumb).to be true
      end
    end

    context 'local store' do
      let(:f_path) { new_attachment_with_img.store.path }
      let(:t_path) { new_attachment_with_img.store.thumb_path }
      before do
        new_attachment_with_img.save
        new_attachment_with_img.update(storage: 'local')
      end
      it 'set the key according to the identifier' do
        expect(new_attachment_with_img.key).to match(new_attachment_with_img.identifier)
      end

      context 'when destroyed' do
        before do
          new_attachment_with_img.destroy!
        end
        it 'deletes the file and thumbnail' do
          expect(f_path).to eq(new_attachment_with_img.store.path)
          expect(File.exist?(t_path)).to be false
          expect(File.exist?(f_path)).to be false
        end
      end
    end



    # it 'stores file in tmp folder with storage tmp' do
    # #  expect
    #
    # end
  end

end

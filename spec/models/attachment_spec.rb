# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Attachment, type: :model do
  describe 'creation' do
    let(:file_path) { "#{Rails.root}/spec/fixtures/upload.txt" }
    let(:file_data) { File.read(file_path) }
    let(:file_name) { File.basename(file_path) }
    let!(:attachment) { FactoryBot.create(:attachment) }
    let!(:attachment_with_file) do
      FactoryBot.create(:attachment, filename: file_name, attachment: File.open(file_path, binmode: true))
    end
    let(:new_attachment) do
      FactoryBot.build(:attachment, filename: file_name, attachment: File.open(file_path, binmode: true))
    end
    let(:new_attachment_with_img) do
      FactoryBot.build(
        :attachment, filename: 'upload.jpg', key: SecureRandom.uuid,
                     attachment: File.open("#{Rails.root}/spec/fixtures/upload.jpg", binmode: true)
      )
    end

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
          Digest::MD5.file(file_path).hexdigest
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
      before { new_attachment.send(:generate_key) }

      it 'generates a uuid  key' do
        expect(new_attachment.key).to match(
          /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
        )
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
        it 'deletes the file and thumbnail' do
          new_attachment_with_img.attachment_derivatives!
          f_path = new_attachment_with_img.attachment_url
          t_path = new_attachment_with_img.attachment_url(:thumbnail)
          new_attachment_with_img.destroy!
          expect(File.exist?(new_attachment_with_img.attachment_url)).to be false
          expect(File.exist?(new_attachment_with_img.attachment_url(:thumbnail))).to be false
        end
      end
    end
  end
end

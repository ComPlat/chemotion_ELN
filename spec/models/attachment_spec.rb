# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Attachment, type: :model do
  let(:attachment) { create(:attachment) }

  describe '#copy' do
    pending 'not in use??? TODO: find a way to test this method'
  end

  describe '#extname' do
    it 'returns filename extension' do
      expect(attachment.extname).to eq('.txt')
    end
  end

  describe '#read_file' do
    it 'returns content of file' do
      expect(attachment.read_file).to eq("Hello world\n")
    end
  end

  describe '#read_thumbnail' do
    context 'when no thumbnail exists' do
      it 'returns nil' do
        expect(attachment.read_thumbnail).to eq(nil)
      end
    end

    context 'when thumbnail exists' do
      let(:attachment) { create(:attachment, :with_image) }

      it 'returns content of thumbnail file' do
        expect(attachment.read_thumbnail).not_to eq(nil)
      end
    end
  end

  describe '#abs_path' do
    it 'returns the absolute path of file' do
      expected_path = Rails.root.join('tmp', 'test', 'uploads', 'tmp', attachment.key).to_s
      expect(attachment.abs_path).to eq(expected_path)
    end
  end

  describe '#abs_prev_path' do
    it 'returns the same absolute path like #abs_path' do
      expect(attachment.abs_prev_path).to eq(attachment.abs_path)
    end
  end

  describe '#store' do
    it 'returns an instance of storage class' do
      expect(attachment.store).to be_instance_of(Tmp)
    end
  end

  describe '#old_store' do
    it 'returns an instance of storage class' do
      expect(attachment.old_store).to be_instance_of(Tmp)
    end
  end

  describe '#add_checksum' do
    it 'returns a MD5 checksum' do
      expect(attachment.add_checksum).to be_instance_of(Digest::MD5)
    end
  end

  describe '#reset_checksum' do
    context 'when checksum was not changed' do
      it 'returns nil' do
        expect(attachment.reset_checksum).to eq(nil)
      end
    end

    context 'when checksum was changed' do
      it 'returns updated attachment' do
        pending 'TODO: find a way to test this'
        expect(attachment.reset_checksum).to be_instance_of(described_class)
      end
    end
  end

  describe '#regenerate_thumbnail' do
    pending 'will be improved TODO: find a way to test this'
  end

  describe '#for_research_plan?' do
    subject { attachment.for_research_plan? }

    context 'when not attached to research_plan' do
      let(:attachment) { create(:attachment, :attached_to_container) }

      it 'returns false' do
        expect(subject).to eq(false)
      end
    end

    context 'when attached to research_plan' do
      let(:attachment) { create(:attachment, :attached_to_research_plan) }

      it 'returns true' do
        expect(subject).to eq(true)
      end
    end
  end

  describe '#for_container?' do
    subject { attachment.for_container? }

    context 'when not attached to container' do
      let(:attachment) { create(:attachment, :attached_to_research_plan) }

      it 'returns false' do
        expect(subject).to eq(false)
      end
    end

    context 'when attached to container' do
      let(:attachment) { create(:attachment, :attached_to_container) }

      it 'returns true' do
        expect(subject).to eq(true)
      end
    end
  end

  describe '#for_report?' do
    subject { attachment.for_report? }

    context 'when not attached to report' do
      let(:attachment) { create(:attachment, :attached_to_container) }

      it 'returns false' do
        expect(subject).to eq(false)
      end
    end

    context 'when attached to report' do
      let(:attachment) { create(:attachment, :attached_to_report) }

      it 'returns true' do
        pending 'TODO: Find a way to test report'
        expect(subject).to eq(true)
      end
    end
  end

  describe '#for_template?' do
    subject { attachment.for_template? }

    context 'when not attached to template' do
      let(:attachment) { create(:attachment, :attached_to_container) }

      it 'returns false' do
        expect(subject).to eq(false)
      end
    end

    context 'when attached to template' do
      let(:attachment) { create(:attachment, :attached_to_template) }

      it 'returns true' do
        pending 'TODO: Find a way to test template'

        expect(subject).to eq(true)
      end
    end
  end

  describe '#research_plan_id' do
    pending 'will be improved'
  end

  describe '#container_id' do
    pending 'will be improved'
  end

  describe '#report_id' do
    pending 'will be improved'
  end

  describe '#research_plan' do
    pending 'will be improved'
  end

  describe '#container' do
    pending 'will be improved'
  end

  describe '#report' do
    pending 'will be improved'
  end

  describe '#update_research_plan!' do
    pending 'will be improved'
  end

  describe '#update_report!' do
    pending 'will be improved'
  end

  describe '#rewrite_file_data!' do
    pending 'will be improved'
  end

  describe '#update_filesize' do
    pending 'will be improved'
  end

  describe '#add_content_type' do
    pending 'will be improved'
  end

  # describe 'creation' do
  #   let(:file_path) { "#{Rails.root}/spec/fixtures/upload.txt" }
  #   let(:file_data) { File.read(file_path) }
  #   let(:file_name) { File.basename(file_path) }
  #   let!(:attachment) { FactoryBot.create(:attachment) }
  #   let!(:attachment_with_file) do
  #     FactoryBot.create(:attachment, filename: file_name, file_data: file_data)
  #   end
  #   let(:new_attachment) do
  #     FactoryBot.build(:attachment, filename: file_name, file_data: file_data)
  #   end
  #   let(:new_attachment_with_img) do
  #     FactoryBot.build(
  #       :attachment, filename: 'upload.jpg', key: SecureRandom.uuid,
  #                    file_path: "#{Rails.root}/spec/fixtures/upload.jpg"
  #       # file_data: File.read("#{Rails.root}/spec/fixtures/upload.jpg")
  #     )
  #   end

  #   context 'after_create' do
  #     before do
  #       new_attachment.save!
  #     end

  #     it 'is possible to create a valid attachment' do
  #       expect(attachment.valid?).to be(true)
  #     end

  #     it 'has a valid uuid identifier' do
  #       expect(attachment.identifier).to match(
  #         /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
  #       )
  #     end

  #     it 'checksummed the file_data' do
  #       expect(attachment_with_file.checksum).to eq(
  #         Digest::MD5.file(file_path).hexdigest
  #       )
  #     end
  #   end

  #   # describe 'add_checksum' do
  #   #   before { new_attachment.send(:add_checksum)}
  #   #   it 'checksums the file_data' do
  #   #     expect(new_attachment.checksum).to eq(
  #   #       Digest::SHA256.file(file_path).hexdigest
  #   #     )
  #   #   end
  #   # end

  #   describe 'generate_key' do
  #     before { new_attachment.send(:generate_key) }

  #     it 'generates a uuid  key' do
  #       expect(new_attachment.key).to match(
  #         /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
  #       )
  #     end
  #   end

  #   describe 'store_tmp_file_and_thumbnail' do
  #     it 'stores file in tmp_folder' do
  #       expect(new_attachment_with_img.send(:store_tmp_file_and_thumbnail)).to be true
  #       expect(new_attachment_with_img.thumb).to be true
  #     end
  #   end

  #   context 'local store' do
  #     let(:f_path) { new_attachment_with_img.store.path }
  #     let(:t_path) { new_attachment_with_img.store.thumb_path }

  #     before do
  #       new_attachment_with_img.save
  #       new_attachment_with_img.update(storage: 'local')
  #     end

  #     it 'set the key according to the identifier' do
  #       expect(new_attachment_with_img.key).to match(new_attachment_with_img.identifier)
  #     end

  #     context 'when destroyed' do
  #       before do
  #         new_attachment_with_img.destroy!
  #       end

  #       it 'deletes the file and thumbnail' do
  #         expect(f_path).to eq(new_attachment_with_img.store.path)
  #         expect(File.exist?(t_path)).to be false
  #         expect(File.exist?(f_path)).to be false
  #       end
  #     end
  #   end

  #   # it 'stores file in tmp folder with storage tmp' do
  #   # #  expect
  #   #
  #   # end
  # end
end

# frozen_string_literal: true

require 'rails_helper'
require 'tasks/support/recovery_db'
require 'tasks/support/recovery_db/partial_migration'

RSpec.describe RecoveryDB::PartialMigration::RestoreUsers do
  # Bypass the constructor's DB-mount setup so we can test helpers in isolation.
  let(:instance) do
    mount_dbl = instance_double(RecoveryDB::Mount, restore_backup: nil, load_models: nil)
    allow(RecoveryDB::Mount).to receive(:new).and_return(mount_dbl)
    described_class.new(user_ids: [1], file: '/dev/null')
  end

  # --------------------------------------------------------------------------
  # new_shrine_id — pure function
  # --------------------------------------------------------------------------
  describe '#new_shrine_id' do
    let(:attachment) { instance_double(Attachment, id: 15_000, identifier: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff') }

    it 'puts the new attachment in the correct bucket' do
      # bucket = (15_000 / 10_000).floor + 1 = 2
      result = instance.send(:new_shrine_id, attachment, '1/11111111-2222-3333-4444-555555555555')
      expect(result).to start_with('2/')
    end

    it 'uses the new attachment identifier in the filename' do
      result = instance.send(:new_shrine_id, attachment, '1/11111111-2222-3333-4444-555555555555')
      expect(result).to include('aaaabbbb-cccc-dddd-eeee-ffffffffffff')
    end

    it 'preserves the derivative suffix (.thumb.jpg)' do
      result = instance.send(:new_shrine_id, attachment, '1/11111111-2222-3333-4444-555555555555.thumb.jpg')
      expect(result).to end_with('.thumb.jpg')
    end

    it 'preserves the derivative suffix (.annotation.svg)' do
      result = instance.send(:new_shrine_id, attachment, '1/11111111-2222-3333-4444-555555555555.annotation.svg')
      expect(result).to end_with('.annotation.svg')
    end

    it 'has no suffix for the main file' do
      result = instance.send(:new_shrine_id, attachment, '1/11111111-2222-3333-4444-555555555555')
      expect(File.extname(result)).to eq('')
    end
  end

  # --------------------------------------------------------------------------
  # copy_in_storage — uses real Shrine FileSystem storage
  # --------------------------------------------------------------------------
  describe '#copy_in_storage' do
    let(:storage) { Shrine.storages[:store] }

    it 'copies a file to the new id' do
      old_id = "test-copy-src-#{SecureRandom.hex(4)}"
      new_id = "test-copy-dst-#{SecureRandom.hex(4)}"
      storage.upload(StringIO.new('hello world'), old_id)

      instance.send(:copy_in_storage, storage, old_id, new_id)

      expect(storage.exists?(new_id)).to be true
      expect(storage.open(new_id).read).to eq('hello world')
    ensure
      begin
        storage.delete(old_id)
      rescue StandardError
        nil
      end
      begin
        storage.delete(new_id)
      rescue StandardError
        nil
      end
    end
  end

  # --------------------------------------------------------------------------
  # copy_attachment_file — integration: real Attachment record + Shrine storage
  # --------------------------------------------------------------------------
  describe '#copy_attachment_file' do
    let(:user) { create(:user) }
    let(:storage) { Shrine.storages[:store] }
    let(:file_content) { 'hello migration world' }
    let(:old_file_id) { "test-copy-main-#{SecureRandom.hex(6)}" }
    let(:old_attachment_data) do
      {
        'id' => old_file_id,
        'storage' => 'store',
        'metadata' => { 'filename' => 'upload.txt', 'size' => file_content.bytesize, 'mime_type' => 'text/plain' },
        'derivatives' => {},
      }
    end
    # RecoveryDB::Models::Attachment is not defined while the mount is stubbed,
    # so we verify against the live Attachment class which shares the same schema.
    let(:old_attachment) { instance_double(Attachment, attachment_data: old_attachment_data) }
    let(:new_attachment) do
      a = Attachment.new(filename: 'upload.txt', created_by: user.id)
      a.save!(validate: false)
      a
    end

    before { storage.upload(StringIO.new(file_content), old_file_id) }

    after do
      begin
        storage.delete(old_file_id)
      rescue StandardError
        nil
      end
      new_id = new_attachment.attachment_data&.dig('id')
      storage.delete(new_id) if new_id && storage.exists?(new_id)
    end

    it 'writes a new file to storage (not the same path as the source)' do
      instance.send(:copy_attachment_file, old_attachment, new_attachment)

      expect(new_attachment.attachment_data['id']).not_to eq(old_file_id)
    end

    it 'stores the file at a path that includes the new attachment identifier' do
      instance.send(:copy_attachment_file, old_attachment, new_attachment)

      expect(new_attachment.attachment_data['id']).to include(new_attachment.identifier.to_s)
    end

    it 'the new file actually exists in storage' do
      instance.send(:copy_attachment_file, old_attachment, new_attachment)

      expect(storage.exists?(new_attachment.attachment_data['id'])).to be true
    end

    it 'the new file has the same content as the source' do
      instance.send(:copy_attachment_file, old_attachment, new_attachment)

      expect(storage.open(new_attachment.attachment_data['id']).read).to eq(file_content)
    end
  end

  # --------------------------------------------------------------------------
  # copy_derivatives_in_storage — skips absolute-path ids, copies valid ones
  # --------------------------------------------------------------------------
  describe '#copy_derivatives_in_storage' do
    let(:storage) { Shrine.storages[:store] }
    let(:attachment) { instance_double(Attachment, id: 1, identifier: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff') }

    it 'copies a valid derivative to a new path' do
      old_deriv_id = "test-deriv-src-#{SecureRandom.hex(4)}.thumb.jpg"
      storage.upload(StringIO.new('thumb bytes'), old_deriv_id)

      result = instance.send(
        :copy_derivatives_in_storage,
        { 'thumbnail' => { 'id' => old_deriv_id, 'storage' => 'store' } },
        attachment,
        storage,
      )

      expect(result.keys).to contain_exactly('thumbnail')
      new_deriv_id = result['thumbnail']['id']
      expect(new_deriv_id).not_to eq(old_deriv_id)
      expect(storage.exists?(new_deriv_id)).to be true
    ensure
      begin
        storage.delete(old_deriv_id)
      rescue StandardError
        nil
      end
      begin
        storage.delete(result&.dig('thumbnail', 'id'))
      rescue StandardError
        nil
      end
    end

    it 'skips derivatives whose id is an absolute path' do
      old_derivatives = { 'conversion' => { 'id' => '/absolute/path/to/file.png' } }

      result = instance.send(:copy_derivatives_in_storage, old_derivatives, attachment, storage)

      expect(result).not_to have_key('conversion')
    end

    it 'updates annotated_file_location to the new path' do
      old_deriv_id = "test-annot-src-#{SecureRandom.hex(4)}.annotation.svg"
      storage.upload(StringIO.new('<svg/>'), old_deriv_id)

      result = instance.send(
        :copy_derivatives_in_storage,
        { 'annotation' => { 'id' => old_deriv_id, 'annotated_file_location' => old_deriv_id } },
        attachment,
        storage,
      )

      new_id = result['annotation']['id']
      expect(result['annotation']['annotated_file_location']).to eq(new_id)
    ensure
      begin
        storage.delete(old_deriv_id)
      rescue StandardError
        nil
      end
      begin
        storage.delete(result&.dig('annotation', 'id'))
      rescue StandardError
        nil
      end
    end
  end
end

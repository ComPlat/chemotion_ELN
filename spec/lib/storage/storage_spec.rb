# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Storage do
  let(:file) { File.read("#{Rails.root}/spec/fixtures/upload.txt") }
  let(:attachment) { build(:attachment, file_data: file) }
  let(:new_store) { described_class.new_store(attachment) }
  let(:local_attachment) { build(:attachment, storage: 'local', file_data: file) }
  let(:new_storage) { described_class.new_store(local_attachment) }
  let(:bad_attachment) { build(:attachment, storage: 'bad_storage') }
  let(:bad_attachment_2) { build(:attachment, storage: 'bad_storage_2') }
  let(:bad_storage) { described_class.new_store(bad_attachment) }
  let(:bad_storage_2) { described_class.new_store(bad_attachment) }

  before do
    class BadStorage
    end
  end

  it 'initializes' do
    expect(new_storage.class.superclass).to eq(described_class)
  end

  it 'raises error if not a storage class' do
    expect { bad_storage }.to raise_error(TypeError,
                                          'bad_storage class is not a Storage class')
    expect { bad_storage_2 }.to raise_error
  end

  context 'with tmp storage' do
    before do
      attachment.storage = 'tmp'
    end

    context 'with a non valid attachment.key' do
      before { attachment.key = SecureRandom.uuid }

      it 'cannot read the file' do
        expect(new_store.read_file).to be false
      end
    end
  end

  context 'with local storage' do
    before do
      attachment.storage = 'local'
      attachment.key = SecureRandom.uuid
    end

    it 'does not read  the file from an empty Attachment ' do
      expect(new_store.read_file).to be false
    end
  end
end

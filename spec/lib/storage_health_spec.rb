# frozen_string_literal: true

require 'rails_helper'

# StorageHealth is defined in config/initializers/shrine.rb and loaded at boot.
RSpec.describe StorageHealth do
  describe '.problems' do
    let(:real_store) { Shrine.storages[:store] }

    it 'is empty when the tiers are healthy' do
      expect(described_class.problems).to eq([])
    end

    it 'flags a tier that is not configured (e.g. the storage was renamed)' do
      allow(Shrine).to receive(:storages).and_return(store: real_store, cold: nil)

      expect(described_class.problems).to include("tier 'cold': not configured")
    end

    it 'flags a local tier whose folder is missing (e.g. a renamed folder or dropped mount)' do
      broken = instance_double(Shrine::Storage::FileSystem, directory: '/no/such/dir')
      allow(Shrine).to receive(:storages).and_return(store: real_store, cold: broken)

      expect(described_class.problems).to include("tier 'cold': directory missing")
    end

    # A renamed folder gets recreated empty at boot, so it looks healthy.
    context 'when the folder exists but the files inside are gone' do
      let(:emptied) do
        instance_double(Shrine::Storage::FileSystem, directory: real_store.directory, exists?: false)
      end

      before do
        allow(described_class).to receive(:sample_file_id).and_return(nil)
        allow(described_class).to receive(:sample_file_id).with(:cold).and_return('1/abc')
        allow(Shrine).to receive(:storages).and_return(store: real_store, cold: emptied)
      end

      it 'flags it when verifying files' do
        expect(described_class.problems(verify_files: true))
          .to include("tier 'cold': files missing (folder moved or emptied?)")
      end

      it 'does not verify files by default (boot must not query the database)' do
        expect(described_class.problems).to eq([])
      end
    end

    it 'is happy when the folder exists and a sampled file is present' do
      intact = instance_double(Shrine::Storage::FileSystem, directory: real_store.directory, exists?: true)
      allow(described_class).to receive(:sample_file_id).and_return(nil)
      allow(described_class).to receive(:sample_file_id).with(:cold).and_return('1/abc')
      allow(Shrine).to receive(:storages).and_return(store: real_store, cold: intact)

      expect(described_class.problems(verify_files: true)).to eq([])
    end
  end
end

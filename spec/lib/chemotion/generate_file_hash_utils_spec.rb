# frozen_string_literal: true

require 'rails_helper'
require 'tempfile'
require 'digest'

RSpec.describe Chemotion::GenerateFileHashUtils do
  let(:test_content) { 'This is test file content for hashing' }
  let(:test_content_two) { 'This is different test file content' }
  let(:expected_hash) { Digest::MD5.hexdigest(test_content) }
  let(:expected_hash_two) { Digest::MD5.hexdigest(test_content_two) }
  let(:expected_initials) { expected_hash[0..15] }
  let(:expected_initials_two) { expected_hash_two[0..15] }

  # Helper method to create temporary test files
  def create_test_file(content)
    file = Tempfile.new(['test', '.pdf'])
    file.binmode # Enable binary mode for proper handling of binary content
    file.write(content)
    file.close
    file.path
  end

  describe '.generate_full_hash' do
    context 'with valid files' do
      let(:test_file_path) { create_test_file(test_content) }

      after { FileUtils.rm_f(test_file_path) }

      it 'generates correct MD5 hash for file content' do
        result = described_class.generate_full_hash(test_file_path)
        expect(result).to eq(expected_hash)
        expect(result).to be_a(String)
        expect(result.length).to eq(32)
      end

      it 'generates different hashes for different content' do
        file1 = create_test_file(test_content)
        file2 = create_test_file(test_content_two)

        hash1 = described_class.generate_full_hash(file1)
        hash2 = described_class.generate_full_hash(file2)

        expect(hash1).to eq(expected_hash)
        expect(hash2).to eq(expected_hash_two)
        expect(hash1).not_to eq(hash2)

        File.delete(file1)
        File.delete(file2)
      end

      it 'generates same hash for identical content in different files' do
        file1 = create_test_file(test_content)
        file2 = create_test_file(test_content)

        hash1 = described_class.generate_full_hash(file1)
        hash2 = described_class.generate_full_hash(file2)

        expect(hash1).to eq(hash2)
        expect(hash1).to eq(expected_hash)

        File.delete(file1)
        File.delete(file2)
      end

      it 'handles empty files' do
        empty_file = create_test_file('')
        result = described_class.generate_full_hash(empty_file)

        expect(result).to eq(Digest::MD5.hexdigest(''))
        expect(result).to be_a(String)
        expect(result.length).to eq(32)

        File.delete(empty_file)
      end

      it 'handles large files' do
        large_content = 'A' * 10_000
        large_file = create_test_file(large_content)
        result = described_class.generate_full_hash(large_file)

        expect(result).to eq(Digest::MD5.hexdigest(large_content))
        expect(result).to be_a(String)
        expect(result.length).to eq(32)

        File.delete(large_file)
      end
    end

    context 'with invalid files' do
      it 'returns nil for non-existent files' do
        result = described_class.generate_full_hash('/path/to/non/existent/file.pdf')
        expect(result).to be_nil
      end

      it 'returns nil for nil input' do
        result = described_class.generate_full_hash(nil)
        expect(result).to be_nil
      end

      it 'returns nil for empty string input' do
        result = described_class.generate_full_hash('')
        expect(result).to be_nil
      end

      it 'logs error for unreadable files' do
        test_file = create_test_file(test_content)

        # Mock file checks to pass but then raise an error during hash generation
        allow(File).to receive(:exist?).with(test_file).and_return(true)
        allow(File).to receive(:readable?).with(test_file).and_return(true)
        allow(Digest::MD5).to receive(:file).with(test_file).and_raise(StandardError.new('Test error'))
        allow(Rails.logger).to receive(:error)

        result = described_class.generate_full_hash(test_file)

        expect(result).to be_nil
        expect(Rails.logger).to have_received(:error).with(/Error generating full hash/)

        File.delete(test_file)
      end
    end
  end

  describe '.generate_file_hash_initials' do
    context 'with valid files' do
      let(:test_file_path) { create_test_file(test_content) }

      after { FileUtils.rm_f(test_file_path) }

      it 'generates correct hash initials for file content' do
        result = described_class.generate_file_hash_initials(test_file_path)
        expect(result).to eq(expected_initials)
        expect(result).to be_a(String)
        expect(result.length).to eq(16)
      end

      it 'generates different initials for different content' do
        file1 = create_test_file(test_content)
        file2 = create_test_file(test_content_two)

        initials1 = described_class.generate_file_hash_initials(file1)
        initials2 = described_class.generate_file_hash_initials(file2)

        expect(initials1).to eq(expected_initials)
        expect(initials2).to eq(expected_initials_two)
        expect(initials1).not_to eq(initials2)

        File.delete(file1)
        File.delete(file2)
      end
    end

    context 'with fallback filename' do
      it 'uses fallback when file does not exist' do
        fallback_name = 'test_fallback_filename'
        fallback_hash = Digest::MD5.hexdigest(fallback_name)
        fallback_initials = fallback_hash[0..15]

        result = described_class.generate_file_hash_initials('/non/existent/file.pdf', fallback_name)
        expect(result).to eq(fallback_initials)
        expect(result.length).to eq(16)
      end

      it 'prefers file content over fallback when file exists' do
        test_file = create_test_file(test_content)
        fallback_name = 'different_fallback'

        result = described_class.generate_file_hash_initials(test_file, fallback_name)
        expect(result).to eq(expected_initials)
        expect(result).not_to eq(Digest::MD5.hexdigest(fallback_name)[0..15])

        File.delete(test_file)
      end

      it 'returns nil when both file and fallback fail' do
        result = described_class.generate_file_hash_initials('/non/existent/file.pdf', nil)
        expect(result).to be_nil
      end

      it 'handles empty fallback name' do
        empty_fallback_hash = Digest::MD5.hexdigest('')
        empty_fallback_initials = empty_fallback_hash[0..15]

        result = described_class.generate_file_hash_initials('/non/existent/file.pdf', '')
        expect(result).to eq(empty_fallback_initials)
      end
    end

    context 'with error handling' do
      it 'logs warning and returns nil on errors' do
        test_file = create_test_file(test_content)

        # Mock generate_full_hash to return nil, then make the fallback digest fail
        allow(described_class).to receive(:generate_full_hash).and_return(nil)
        allow(Digest::MD5).to receive(:hexdigest).and_raise(StandardError.new('Test error'))
        allow(Rails.logger).to receive(:warn)

        result = described_class.generate_file_hash_initials(test_file, 'fallback_name')

        expect(result).to be_nil
        expect(Rails.logger).to have_received(:warn).with(/Could not generate initials/)

        File.delete(test_file)
      end
    end
  end

  describe 'integration tests' do
    it 'generates consistent hashes across all methods' do
      test_file = create_test_file(test_content)

      full_hash = described_class.generate_full_hash(test_file)
      initials_from_file = described_class.generate_file_hash_initials(test_file)

      aggregate_failures do
        expect(full_hash).to eq(expected_hash)
        expect(initials_from_file).to eq(expected_initials)
      end

      File.delete(test_file)
    end

    it 'works with real PDF-like content' do
      pdf_like_content = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj"
      pdf_file = create_test_file(pdf_like_content)

      full_hash = described_class.generate_full_hash(pdf_file)
      initials = described_class.generate_file_hash_initials(pdf_file)

      aggregate_failures do
        expect(full_hash).to be_a(String)
        expect(full_hash.length).to eq(32)
        expect(initials).to be_a(String)
        expect(initials.length).to eq(16)
        expect(initials).to eq(full_hash[0..15])
      end

      File.delete(pdf_file)
    end
  end

  describe 'performance and edge cases' do
    it 'handles binary content correctly' do
      binary_content = (0..255).map(&:chr).join
      binary_file = create_test_file(binary_content)

      result = described_class.generate_full_hash(binary_file)
      expect(result).to be_a(String)
      expect(result.length).to eq(32)
      expect(result).to match(/\A[a-f0-9]{32}\z/)

      File.delete(binary_file)
    end

    it 'handles Unicode content correctly' do
      unicode_content = 'Unicode test: héllo wörld 🚀 ñiño'
      unicode_file = create_test_file(unicode_content)

      result = described_class.generate_full_hash(unicode_file)
      expect(result).to be_a(String)
      expect(result.length).to eq(32)

      File.delete(unicode_file)
    end

    it 'generates lowercase hexadecimal hashes' do
      test_file = create_test_file(test_content)

      full_hash = described_class.generate_full_hash(test_file)
      initials = described_class.generate_file_hash_initials(test_file)

      expect(full_hash).to match(/\A[a-f0-9]{32}\z/)
      expect(initials).to match(/\A[a-f0-9]{16}\z/)

      File.delete(test_file)
    end
  end

  describe '.vendor_folder_exists?' do
    let(:vendor) { 'existvendor' }
    let(:base_dir) { Chemotion::GenerateFileHashUtils::SAFETY_SHEETS_DIR }

    it 'returns false when folder absent' do
      expect(described_class.vendor_folder_exists?(vendor)).to be false
    end

    it 'returns true when folder exists' do
      FileUtils.mkdir_p(File.join(base_dir, vendor))
      expect(described_class.vendor_folder_exists?(vendor)).to be true
      FileUtils.rm_rf(File.join(base_dir, vendor))
    end
  end

  describe '.create_vendor_product_folder' do
    let(:vendor) { 'newvendor' }
    let(:base_dir) { Chemotion::GenerateFileHashUtils::SAFETY_SHEETS_DIR }

    it 'creates the vendor folder' do
      path = File.join(base_dir, vendor)
      FileUtils.rm_rf(path)
      described_class.create_vendor_product_folder(vendor)
      expect(Dir.exist?(path)).to be true
      FileUtils.rm_rf(path)
    end
  end

  describe '.find_identical_sheet' do
    let(:base_dir) { Chemotion::GenerateFileHashUtils::SAFETY_SHEETS_DIR }
    let(:vendor_dir) { File.join(base_dir, 'dupvendor') }
    let(:other_dir) { File.join(base_dir, 'othervendor') }
    let(:source) { File.join(Dir.mktmpdir, 'incoming.pdf') }

    before { FileUtils.mkdir_p([vendor_dir, other_dir]) }

    after do
      FileUtils.rm_rf([vendor_dir, other_dir])
      FileUtils.rm_f(source)
    end

    # A saved sheet is named for its own content, which is what makes the lookup a glob.
    def saved_as(dir, product, content)
      name = "#{product}_#{Digest::MD5.hexdigest(content)[0..15]}.pdf"
      File.write(File.join(dir, name), content)
      name
    end

    it 'finds a byte-identical sheet under any product number' do
      File.write(source, '%PDF same bytes')
      name = saved_as(vendor_dir, 'PN999', '%PDF same bytes')

      expect(described_class.find_identical_sheet(source)).to eq("/safety_sheets/dupvendor/#{name}")
    end

    it 'looks across every vendor folder, not just one' do
      File.write(source, '%PDF elsewhere')
      name = saved_as(other_dir, 'AC1', '%PDF elsewhere')

      expect(described_class.find_identical_sheet(source)).to eq("/safety_sheets/othervendor/#{name}")
    end

    it 'finds a sheet saved under the older web naming' do
      File.write(source, '%PDF legacy')
      initials = Digest::MD5.hexdigest('%PDF legacy')[0..15]
      File.write(File.join(vendor_dir, "PN1_web_#{initials}.pdf"), '%PDF legacy')

      expect(described_class.find_identical_sheet(source)).to eq("/safety_sheets/dupvendor/PN1_web_#{initials}.pdf")
    end

    it 'returns nil when the bytes differ, however similar the name' do
      File.write(source, '%PDF one')
      saved_as(vendor_dir, 'PN999', '%PDF two')

      expect(described_class.find_identical_sheet(source)).to be_nil
    end

    it 'returns nil for a source that is not there' do
      expect(described_class.find_identical_sheet('/no/such/file.pdf')).to be_nil
    end
  end

  describe '.generate_file_hash_initials fallback error path' do
    it 'returns nil and logs warning when fallback hashing fails' do
      test_file = create_test_file(test_content)
      allow(described_class).to receive(:generate_full_hash).and_return(nil)
      allow(Digest::MD5).to receive(:hexdigest).and_raise(StandardError.new('boom'))
      allow(Rails.logger).to receive(:warn)

      result = described_class.generate_file_hash_initials(test_file, 'fallback')
      expect(result).to be_nil
      expect(Rails.logger).to have_received(:warn).with(/Could not generate initials/)

      File.delete(test_file)
    end
  end
end

# frozen_string_literal: true

require 'rails_helper'
require_relative '../../../lib/chemotion/data_extractor'

# rubocop:disable Layout/LineLength
RSpec.describe Chemotion::DataExtractor do
  describe '.extract_vendor_from_link_key' do
    context 'when standard link keys' do
      it 'extracts vendor from simple link keys' do
        expect(described_class.extract_vendor_from_link_key('merck_link')).to eq('merck')
        expect(described_class.extract_vendor_from_link_key('sigma_link')).to eq('sigma')
        expect(described_class.extract_vendor_from_link_key('fisher_link')).to eq('fisher')
      end

      it 'extracts vendor from multi-word link keys' do
        expect(described_class.extract_vendor_from_link_key('sigma_aldrich_link')).to eq('sigma_aldrich')
        expect(described_class.extract_vendor_from_link_key('thermo_fisher_link')).to eq('thermo_fisher')
      end
    end

    context 'when versioned link keys' do
      it 'extracts vendor from versioned link keys' do
        expect(described_class.extract_vendor_from_link_key('merck_v2_link')).to eq('merck')
        expect(described_class.extract_vendor_from_link_key('sigma_v10_link')).to eq('sigma')
        expect(described_class.extract_vendor_from_link_key('fisher_v123_link')).to eq('fisher')
      end

      it 'extracts vendor from multi-word versioned link keys' do
        expect(described_class.extract_vendor_from_link_key('sigma_aldrich_v3_link')).to eq('sigma_aldrich')
        expect(described_class.extract_vendor_from_link_key('thermo_fisher_v5_link')).to eq('thermo_fisher')
      end
    end

    context 'when edge cases' do
      it 'handles link keys without _link suffix' do
        expect(described_class.extract_vendor_from_link_key('merck')).to eq('merck')
        expect(described_class.extract_vendor_from_link_key('sigma_v2')).to eq('sigma')
      end

      it 'handles empty and nil inputs' do
        expect(described_class.extract_vendor_from_link_key('')).to eq('')
        expect(described_class.extract_vendor_from_link_key(nil)).to be_nil
      end
    end
  end

  describe '.extract_vendor_from_filename' do
    context 'when valid filenames' do
      it 'extracts vendor from standard PDF filenames' do
        expect(described_class.extract_vendor_from_filename('merck_product123.pdf')).to eq('merck')
        expect(described_class.extract_vendor_from_filename('sigma_abc456.pdf')).to eq('sigma')
        expect(described_class.extract_vendor_from_filename('fisher_test789.pdf')).to eq('fisher')
      end

      it 'extracts vendor from filenames with hash initials' do
        expect(described_class.extract_vendor_from_filename('merck_prod123_a1b2c3d4e5f6.pdf')).to eq('merck')
        expect(described_class.extract_vendor_from_filename('sigma_test456_1234567890ab.pdf')).to eq('sigma')
      end

      it 'extracts vendor from multi-word vendor names' do
        expect(described_class.extract_vendor_from_filename('sigma-aldrich_product123.pdf')).to eq('sigma-aldrich')
        expect(described_class.extract_vendor_from_filename('thermo-fisher_test456.pdf')).to eq('thermo-fisher')
      end

      it 'handles case variations correctly' do
        expect(described_class.extract_vendor_from_filename('MERCK_product123.pdf')).to eq('merck')
        expect(described_class.extract_vendor_from_filename('Sigma_test456.pdf')).to eq('sigma')
        expect(described_class.extract_vendor_from_filename('FisHer_abc789.pdf')).to eq('fisher')
      end

      it 'extracts vendor from filenames without .pdf extension' do
        expect(described_class.extract_vendor_from_filename('merck_product123')).to eq('merck')
        expect(described_class.extract_vendor_from_filename('sigma_test456')).to eq('sigma')
      end
    end

    context 'when invalid filenames' do
      it 'returns nil for vendor names starting with digits' do
        expect(described_class.extract_vendor_from_filename('123vendor_product.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('9merck_test.pdf')).to be_nil
      end

      it 'returns nil for vendor names without letters' do
        expect(described_class.extract_vendor_from_filename('123_product456.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('456_test789.pdf')).to be_nil
      end

      it 'returns nil for filenames without underscores' do
        expect(described_class.extract_vendor_from_filename('merckproduct123.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('singlename.pdf')).to be_nil
      end

      it 'returns nil for vendor names that are too short' do
        expect(described_class.extract_vendor_from_filename('a_product123.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('x_test456.pdf')).to be_nil
      end

      it 'returns nil for vendor names that are too long' do
        long_vendor = 'a' * 21
        expect(described_class.extract_vendor_from_filename("#{long_vendor}_product.pdf")).to be_nil
      end

      it 'returns nil for vendor names with invalid characters' do
        expect(described_class.extract_vendor_from_filename('mer@ck_product.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('sig.ma_test.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('fish er_product.pdf')).to be_nil
      end

      it 'returns nil for reserved words' do
        expect(described_class.extract_vendor_from_filename('admin_product.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('root_test.pdf')).to be_nil
        expect(described_class.extract_vendor_from_filename('script_file.pdf')).to be_nil
      end

      it 'returns nil for empty or nil inputs' do
        expect(described_class.extract_vendor_from_filename('')).to be_nil
        expect(described_class.extract_vendor_from_filename(nil)).to be_nil
      end
    end
  end

  describe '.extract_product_number_from_filename' do
    context 'when valid product numbers' do
      it 'extracts product numbers from standard filenames' do
        expect(described_class.extract_product_number_from_filename('merck_prod123.pdf', 'merck')).to eq('prod123')
        expect(described_class.extract_product_number_from_filename('sigma_abc456.pdf', 'sigma')).to eq('abc456')
        expect(described_class.extract_product_number_from_filename('fisher_test789.pdf', 'fisher')).to eq('test789')
      end

      it 'extracts product numbers from filenames with hash initials' do
        expect(described_class.extract_product_number_from_filename('merck_prod123_a1b2c3d4.pdf',
                                                                    'merck')).to eq('prod123')
        expect(described_class.extract_product_number_from_filename('sigma_test456_1234abcd.pdf',
                                                                    'sigma')).to eq('test456')
      end

      it 'extracts product numbers starting with digits' do
        expect(described_class.extract_product_number_from_filename('merck_123prod.pdf', 'merck')).to eq('123prod')
        expect(described_class.extract_product_number_from_filename('sigma_456test.pdf', 'sigma')).to eq('456test')
      end

      it 'extracts product numbers with hyphens' do
        expect(described_class.extract_product_number_from_filename('merck_prod-123.pdf', 'merck')).to eq('prod-123')
        expect(described_class.extract_product_number_from_filename('sigma_test-456-abc.pdf',
                                                                    'sigma')).to eq('test-456-abc')
      end

      it 'handles case variations correctly' do
        expect(described_class.extract_product_number_from_filename('MERCK_PROD123.pdf', 'merck')).to eq('prod123')
        expect(described_class.extract_product_number_from_filename('Sigma_Test456.pdf', 'sigma')).to eq('test456')
      end

      it 'extracts from filenames without .pdf extension' do
        expect(described_class.extract_product_number_from_filename('merck_prod123', 'merck')).to eq('prod123')
        expect(described_class.extract_product_number_from_filename('sigma_test456', 'sigma')).to eq('test456')
      end

      it 'extracts product numbers with only digits' do
        expect(described_class.extract_product_number_from_filename('merck_123456.pdf', 'merck')).to eq('123456')
        expect(described_class.extract_product_number_from_filename('sigma_789012.pdf', 'sigma')).to eq('789012')
      end

      it 'extracts product numbers with digits and hyphens' do
        expect(described_class.extract_product_number_from_filename('merck_123-456.pdf', 'merck')).to eq('123-456')
        expect(described_class.extract_product_number_from_filename('sigma_789-012-345.pdf',
                                                                    'sigma')).to eq('789-012-345')
      end
    end

    context 'when invalid product numbers' do
      it 'returns nil for product numbers that are too short' do
        expect(described_class.extract_product_number_from_filename('merck_a.pdf', 'merck')).to be_nil
        expect(described_class.extract_product_number_from_filename('sigma_1.pdf', 'sigma')).to be_nil
      end

      it 'returns nil for product numbers that are too long' do
        long_product = 'a' * 26
        expect(described_class.extract_product_number_from_filename("merck_#{long_product}.pdf", 'merck')).to be_nil
      end

      it 'returns nil for product numbers with invalid characters' do
        expect(described_class.extract_product_number_from_filename('merck_prod@123.pdf', 'merck')).to be_nil
        expect(described_class.extract_product_number_from_filename('sigma_test.123.pdf', 'sigma')).to be_nil
        expect(described_class.extract_product_number_from_filename('fisher_prod 123.pdf', 'fisher')).to be_nil
      end

      it 'returns nil for reserved words' do
        expect(described_class.extract_product_number_from_filename('merck_admin.pdf', 'merck')).to be_nil
        expect(described_class.extract_product_number_from_filename('sigma_null.pdf', 'sigma')).to be_nil
        expect(described_class.extract_product_number_from_filename('fisher_script.pdf', 'fisher')).to be_nil
      end

      it 'returns nil when vendor prefix does not match' do
        expect(described_class.extract_product_number_from_filename('merck_prod123.pdf', 'sigma')).to be_nil
        expect(described_class.extract_product_number_from_filename('fisher_test456.pdf', 'merck')).to be_nil
      end

      it 'returns nil when filename does not start with vendor prefix' do
        expect(described_class.extract_product_number_from_filename('notmerck_prod123.pdf', 'merck')).to be_nil
        expect(described_class.extract_product_number_from_filename('prod123.pdf', 'merck')).to be_nil
      end

      it 'when returns nil for empty or nil inputs' do
        expect(described_class.extract_product_number_from_filename('', 'merck')).to be_nil
        expect(described_class.extract_product_number_from_filename('merck_prod123.pdf', nil)).to be_nil
      end
    end
  end

  describe '.extract_hash_initials_from_filename' do
    context 'when valid filenames with hash initials' do
      it 'extracts hash initials from standard format' do
        expect(described_class.extract_hash_initials_from_filename('merck_prod123_a1b2c3d4e5f60708.pdf')).to eq('a1b2c3d4e5f60708')
        expect(described_class.extract_hash_initials_from_filename('sigma_test456_1234567890abcdef.pdf')).to eq('1234567890abcdef')
        expect(described_class.extract_hash_initials_from_filename('fisher_abc789_fedcba0987654321.pdf')).to eq('fedcba0987654321')
      end

      it 'extracts hash initials from complex filenames' do
        expect(described_class.extract_hash_initials_from_filename('sigma-aldrich_test-prod-123_abcdef1234567890.pdf')).to eq('abcdef1234567890')
        expect(described_class.extract_hash_initials_from_filename('vendor_product_version_1234567890abcdef.pdf')).to eq('1234567890abcdef')
      end

      it 'extracts from filenames without .pdf extension' do
        expect(described_class.extract_hash_initials_from_filename('merck_prod123_a1b2c3d4e5f60708')).to eq('a1b2c3d4e5f60708')
        expect(described_class.extract_hash_initials_from_filename('sigma_test456_1234567890abcdef')).to eq('1234567890abcdef')
      end
    end

    context 'when invalid filenames' do
      it 'returns nil for filenames without hash initials' do
        expect(described_class.extract_hash_initials_from_filename('merck_prod123.pdf')).to be_nil
        expect(described_class.extract_hash_initials_from_filename('sigma_test456.pdf')).to be_nil
      end

      it 'returns nil for filenames with insufficient parts' do
        expect(described_class.extract_hash_initials_from_filename('merck.pdf')).to be_nil
        expect(described_class.extract_hash_initials_from_filename('merck_prod.pdf')).to be_nil
      end

      it 'when returns nil for invalid hash formats' do
        expect(described_class.extract_hash_initials_from_filename('merck_prod123_invalidG1H2I3J4.pdf')).to be_nil
        expect(described_class.extract_hash_initials_from_filename('merck_prod123_UPPERCASE123456.pdf')).to be_nil
      end

      it 'returns nil for empty or nil inputs' do
        expect(described_class.extract_hash_initials_from_filename('')).to be_nil
        expect(described_class.extract_hash_initials_from_filename(nil)).to be_nil
      end
    end
  end

  describe 'integration with InputValidationUtils' do
    context 'when vendor name validation' do
      it 'uses InputValidationUtils for vendor validation' do
        # Mock the validation to ensure it's being called
        allow(Chemotion::InputValidationUtils).to receive(:valid_vendor_name?).and_return(false)

        result = described_class.extract_vendor_from_filename('merck_product123.pdf')

        expect(Chemotion::InputValidationUtils).to have_received(:valid_vendor_name?).with('merck')
        expect(result).to be_nil
      end
    end

    context 'when product number validation' do
      it 'uses InputValidationUtils for product validation' do
        # Mock the validation to ensure it's being called
        allow(Chemotion::InputValidationUtils).to receive(:valid_product_number?).and_return(false)

        result = described_class.extract_product_number_from_filename('merck_prod123.pdf', 'merck')

        expect(Chemotion::InputValidationUtils).to have_received(:valid_product_number?).with('prod123')
        expect(result).to be_nil
      end
    end
  end

  describe 'edge cases and error handling' do
    it 'handles Unicode characters gracefully' do
      expect(described_class.extract_vendor_from_filename('mérck_product123.pdf')).to be_nil
      expect(described_class.extract_product_number_from_filename('merck_prôduct123.pdf', 'merck')).to be_nil
    end

    it 'handles very long filenames' do
      long_filename = "#{'a' * 1000}_product123.pdf"
      expect(described_class.extract_vendor_from_filename(long_filename)).to be_nil
    end

    it 'handles special filesystem characters' do
      expect(described_class.extract_vendor_from_filename('mer/ck_product123.pdf')).to be_nil
      expect(described_class.extract_vendor_from_filename('mer\\ck_product123.pdf')).to be_nil
      expect(described_class.extract_vendor_from_filename('mer:ck_product123.pdf')).to be_nil
    end

    it 'handles various file extensions' do
      expect(described_class.extract_vendor_from_filename('merck_product123.PDF')).to eq('merck')
      expect(described_class.extract_vendor_from_filename('merck_product123.txt')).to eq('merck')
      expect(described_class.extract_vendor_from_filename('merck_product123.doc')).to eq('merck')
    end

    it 'handles multiple underscores correctly' do
      expect(described_class.extract_vendor_from_filename('merck_product_123_test.pdf')).to eq('merck')
      expect(described_class.extract_product_number_from_filename('merck_product_123_a1b2c3d4e5f6g7h8.pdf',
                                                                  'merck')).to eq('product')
    end
  end
end
# rubocop:enable Layout/LineLength

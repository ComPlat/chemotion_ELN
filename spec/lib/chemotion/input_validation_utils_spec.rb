# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::InputValidationUtils do
  describe '.valid_vendor_name?' do
    context 'with valid vendor names' do
      it 'accepts simple lowercase vendor names' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('merck')).to be true
          expect(described_class.valid_vendor_name?('sigma')).to be true
          expect(described_class.valid_vendor_name?('fisher')).to be true
        end
      end

      it 'accepts vendor names with hyphens' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('sigma-aldrich')).to be true
          expect(described_class.valid_vendor_name?('thermo-fisher')).to be true
          expect(described_class.valid_vendor_name?('abc-def')).to be true
        end
      end

      it 'accepts vendor names with numbers' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('company1')).to be true
          expect(described_class.valid_vendor_name?('vendor2test')).to be true
          expect(described_class.valid_vendor_name?('abc123def')).to be true
        end
      end

      it 'accepts vendor names at maximum length (20 chars)' do
        expect(described_class.valid_vendor_name?('a' * 20)).to be true
        expect(described_class.valid_vendor_name?('company-name-twlve12')).to be true
      end
    end

    context 'with invalid vendor names' do
      it 'rejects vendor names starting with digits' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('123vendor')).to be false
          expect(described_class.valid_vendor_name?('1merck')).to be false
          expect(described_class.valid_vendor_name?('9company')).to be false
        end
      end

      it 'rejects vendor names without letters' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('123')).to be false
          expect(described_class.valid_vendor_name?('456-789')).to be false
          expect(described_class.valid_vendor_name?('---')).to be false
        end
      end

      it 'rejects vendor names that are too short' do
        expect(described_class.valid_vendor_name?('a')).to be false
      end

      it 'rejects vendor names that are too long' do
        expect(described_class.valid_vendor_name?('a' * 21)).to be false
        expect(described_class.valid_vendor_name?('very-long-vendor-name-too-long')).to be false
      end

      it 'rejects vendor names with invalid characters' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('vendor!')).to be false
          expect(described_class.valid_vendor_name?('test@vendor')).to be false
          expect(described_class.valid_vendor_name?('vendor_name')).to be false
          expect(described_class.valid_vendor_name?('vendor.name')).to be false
          expect(described_class.valid_vendor_name?('vendor name')).to be false
        end
      end

      it 'rejects vendor names with invalid hyphen placement' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('-vendor')).to be false
          expect(described_class.valid_vendor_name?('vendor-')).to be false
          expect(described_class.valid_vendor_name?('ven--dor')).to be false
        end
      end

      it 'rejects reserved/dangerous words' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?('admin')).to be false
          expect(described_class.valid_vendor_name?('root')).to be false
          expect(described_class.valid_vendor_name?('test')).to be false
          expect(described_class.valid_vendor_name?('null')).to be false
          expect(described_class.valid_vendor_name?('undefined')).to be false
          expect(described_class.valid_vendor_name?('script')).to be false
          expect(described_class.valid_vendor_name?('javascript')).to be false
          expect(described_class.valid_vendor_name?('sql')).to be false
          expect(described_class.valid_vendor_name?('drop')).to be false
          expect(described_class.valid_vendor_name?('delete')).to be false
          expect(described_class.valid_vendor_name?('insert')).to be false
          expect(described_class.valid_vendor_name?('update')).to be false
          expect(described_class.valid_vendor_name?('select')).to be false
        end
      end

      it 'rejects non-string inputs' do
        aggregate_failures do
          expect(described_class.valid_vendor_name?(nil)).to be false
          expect(described_class.valid_vendor_name?(123)).to be false
          expect(described_class.valid_vendor_name?([])).to be false
          expect(described_class.valid_vendor_name?({})).to be false
        end
      end

      it 'handles whitespace correctly' do
        expect(described_class.valid_vendor_name?('  ')).to be false
        expect(described_class.valid_vendor_name?('')).to be false
      end
    end
  end

  describe '.valid_product_number?' do
    context 'with valid product numbers' do
      it 'accepts product numbers starting with letters' do
        expect(described_class.valid_product_number?('prod123')).to be true
        expect(described_class.valid_product_number?('abc456')).to be true
        expect(described_class.valid_product_number?('test-product')).to be true
      end

      it 'accepts product numbers starting with digits' do
        expect(described_class.valid_product_number?('123prod')).to be true
        expect(described_class.valid_product_number?('456abc')).to be true
        expect(described_class.valid_product_number?('789-test')).to be true
      end

      it 'accepts product numbers with hyphens' do
        expect(described_class.valid_product_number?('abc-123')).to be true
        expect(described_class.valid_product_number?('test-product-456')).to be true
        expect(described_class.valid_product_number?('prod-123-xyz')).to be true
      end

      it 'accepts product numbers at maximum length (25 chars)' do
        expect(described_class.valid_product_number?('a' * 25)).to be true
        expect(described_class.valid_product_number?('product-number-1234567890')).to be true
      end

      it 'accepts product numbers with only digits' do
        expect(described_class.valid_product_number?('123456')).to be true
        expect(described_class.valid_product_number?('789012')).to be true
        expect(described_class.valid_product_number?('12')).to be true
      end

      it 'accepts product numbers with digits and hyphens' do
        expect(described_class.valid_product_number?('123-456')).to be true
        expect(described_class.valid_product_number?('789-012-345')).to be true
      end
    end

    context 'with invalid product numbers' do
      it 'rejects product numbers with only hyphens' do
        expect(described_class.valid_product_number?('---')).to be false
        expect(described_class.valid_product_number?('--')).to be false
      end

      it 'rejects product numbers that are too short' do
        expect(described_class.valid_product_number?('a')).to be false
        expect(described_class.valid_product_number?('1')).to be false
      end

      it 'rejects product numbers that are too long' do
        expect(described_class.valid_product_number?('a' * 26)).to be false
        expect(described_class.valid_product_number?('very-long-product-number-over-limit-123')).to be false
      end

      it 'rejects product numbers with invalid characters' do
        aggregate_failures do
          expect(described_class.valid_product_number?('prod123!')).to be false
          expect(described_class.valid_product_number?('test@product')).to be false
          expect(described_class.valid_product_number?('prod_123')).to be false
          expect(described_class.valid_product_number?('product.123')).to be false
          expect(described_class.valid_product_number?('prod 123')).to be false
        end
      end

      it 'rejects product numbers with invalid hyphen placement' do
        expect(described_class.valid_product_number?('-prod123')).to be false
        expect(described_class.valid_product_number?('prod123-')).to be false
        expect(described_class.valid_product_number?('prod--123')).to be false
      end

      it 'rejects reserved/dangerous words' do
        aggregate_failures do
          expect(described_class.valid_product_number?('admin')).to be false
          expect(described_class.valid_product_number?('null')).to be false
          expect(described_class.valid_product_number?('undefined')).to be false
          expect(described_class.valid_product_number?('insert')).to be false
          expect(described_class.valid_product_number?('update')).to be false
          expect(described_class.valid_product_number?('select')).to be false
        end
      end

      it 'rejects non-string inputs' do
        aggregate_failures do
          expect(described_class.valid_product_number?(nil)).to be false
          expect(described_class.valid_product_number?(123)).to be false
          expect(described_class.valid_product_number?([])).to be false
          expect(described_class.valid_product_number?({})).to be false
        end
      end
    end
  end

  describe '.valid_identifier?' do
    context 'with default parameters' do
      it 'validates basic identifiers' do
        expect(described_class.valid_identifier?('valid')).to be true
        expect(described_class.valid_identifier?('abc123')).to be true
        expect(described_class.valid_identifier?('valid-123')).to be true
      end

      it 'rejects identifiers starting with digits by default' do
        expect(described_class.valid_identifier?('123valid')).to be false
      end
    end

    context 'with allow_leading_digit: true' do
      it 'accepts identifiers starting with digits' do
        expect(described_class.valid_identifier?('123valid', allow_leading_digit: true)).to be true
        expect(described_class.valid_identifier?('456abc', allow_leading_digit: true)).to be true
      end
    end

    context 'with custom max_length' do
      it 'respects custom maximum length' do
        aggregate_failures do
          expect(described_class.valid_identifier?('word', max_length: 5)).to be true
          expect(described_class.valid_identifier?('word', max_length: 3)).to be false
          expect(described_class.valid_identifier?('example123', max_length: 15)).to be true
          expect(described_class.valid_identifier?('example123', max_length: 5)).to be false
        end
      end
    end
  end

  describe '.valid_length?' do
    it 'validates string length correctly' do
      aggregate_failures do
        expect(described_class.valid_length?('ab', 10)).to be true
        expect(described_class.valid_length?('abcde', 10)).to be true
        expect(described_class.valid_length?('a' * 10, 10)).to be true
        expect(described_class.valid_length?('a', 10)).to be false
        expect(described_class.valid_length?('a' * 11, 10)).to be false
      end
    end
  end

  describe '.valid_characters?' do
    it 'accepts only allowed characters' do
      aggregate_failures do
        expect(described_class.valid_characters?('abc')).to be true
        expect(described_class.valid_characters?('123')).to be true
        expect(described_class.valid_characters?('abc123')).to be true
        expect(described_class.valid_characters?('test-123')).to be true
        expect(described_class.valid_characters?('a-b-c-1-2-3')).to be true
      end
    end

    it 'rejects invalid characters' do
      aggregate_failures do
        expect(described_class.valid_characters?('ABC')).to be false
        expect(described_class.valid_characters?('test_123')).to be false
        expect(described_class.valid_characters?('test.123')).to be false
        expect(described_class.valid_characters?('test 123')).to be false
        expect(described_class.valid_characters?('test@123')).to be false
        expect(described_class.valid_characters?('test!')).to be false
      end
    end
  end

  describe '.valid_format?' do
    context 'with allow_leading_digit: false' do
      it 'requires strings to start with letters' do
        expect(described_class.valid_format?('abc123', false)).to be true
        expect(described_class.valid_format?('test-123', false)).to be true
        expect(described_class.valid_format?('123abc', false)).to be false
      end
    end

    context 'with allow_leading_digit: true' do
      it 'allows strings to start with digits' do
        expect(described_class.valid_format?('123abc', true)).to be true
        expect(described_class.valid_format?('abc123', true)).to be true
        expect(described_class.valid_format?('test-123', true)).to be true
      end
    end

    it 'rejects strings with invalid hyphen placement' do
      aggregate_failures do
        expect(described_class.valid_format?('-test', false)).to be false
        expect(described_class.valid_format?('test-', false)).to be false
        expect(described_class.valid_format?('te--st', false)).to be false
        expect(described_class.valid_format?('-test', true)).to be false
        expect(described_class.valid_format?('test-', true)).to be false
        expect(described_class.valid_format?('te--st', true)).to be false
      end
    end
  end

  describe '.contains_letter?' do
    it 'detects presence of letters' do
      aggregate_failures do
        expect(described_class.contains_letter?('abc')).to be true
        expect(described_class.contains_letter?('123abc')).to be true
        expect(described_class.contains_letter?('abc123')).to be true
        expect(described_class.contains_letter?('123a456')).to be true
        expect(described_class.contains_letter?('test-123')).to be true
      end
    end

    it 'detects absence of letters' do
      aggregate_failures do
        expect(described_class.contains_letter?('123')).to be false
        expect(described_class.contains_letter?('456-789')).to be false
        expect(described_class.contains_letter?('---')).to be false
        expect(described_class.contains_letter?('123456789')).to be false
      end
    end
  end

  describe '.safe_word?' do
    it 'allows safe words' do
      aggregate_failures do
        expect(described_class.safe_word?('merck')).to be true
        expect(described_class.safe_word?('sigma')).to be true
        expect(described_class.safe_word?('company')).to be true
        expect(described_class.safe_word?('product')).to be true
        expect(described_class.safe_word?('chemical')).to be true
      end
    end

    context 'when blocks dangerous/reserved words' do
      %w[
        admin root test null undefined script javascript sql drop delete insert update select
      ].each do |word|
        it "blocks dangerous word: #{word}" do
          expect(described_class.safe_word?(word)).to be false
        end
      end
    end
  end

  describe 'edge cases and security' do
    it 'handles Unicode characters correctly' do
      expect(described_class.valid_vendor_name?('café')).to be false
      expect(described_class.valid_vendor_name?('naïve')).to be false
      expect(described_class.valid_product_number?('tëst123')).to be false
    end

    it 'handles whitespace trimming' do
      expect(described_class.valid_vendor_name?('  merck  ')).to be true
      expect(described_class.valid_vendor_name?('  MERCK  ')).to be true
      expect(described_class.valid_product_number?('  prod123  ')).to be true
    end

    it 'handles case insensitivity' do
      aggregate_failures do
        expect(described_class.valid_vendor_name?('MERCK')).to be true
        expect(described_class.valid_vendor_name?('Sigma')).to be true
        expect(described_class.valid_product_number?('PROD123')).to be true
        expect(described_class.valid_product_number?('Prod123')).to be true
      end
    end

    it 'prevents SQL injection attempts' do
      expect(described_class.valid_vendor_name?("'; DROP TABLE--")).to be false
      expect(described_class.valid_product_number?("1' OR '1'='1")).to be false
    end

    it 'prevents script injection attempts' do
      expect(described_class.valid_vendor_name?('<script>')).to be false
      expect(described_class.valid_product_number?('javascript:')).to be false
    end
  end

  describe '.valid_url?' do
    it 'accepts valid HTTPS and HTTP URLs' do
      aggregate_failures do
        expect(described_class.valid_url?('https://example.com')).to be true
        expect(described_class.valid_url?('http://example.com')).to be true
        expect(described_class.valid_url?('https://example.com/path')).to be true
      end
    end

    it 'rejects invalid inputs' do
      aggregate_failures do
        expect(described_class.valid_url?(nil)).to be false
        expect(described_class.valid_url?('')).to be false
        expect(described_class.valid_url?('not a url')).to be false
        expect(described_class.valid_url?('ftp://example.com')).to be false
      end
    end

    it 'rejects URLs that are too long' do
      long_url = 'https://example.com/' + 'a' * (described_class::URL_MAX_LENGTH)
      expect(described_class.valid_url?(long_url)).to be false
    end
  end

  describe '.safe_parse_uri' do
    it 'parses valid URIs and returns nil for invalid ones' do
      aggregate_failures do
        expect(described_class.safe_parse_uri('https://example.com')).to be_a(URI::HTTPS)
        expect(described_class.safe_parse_uri('invalid url')).to be_nil
        expect(described_class.safe_parse_uri('https://[invalid')).to be_nil
      end
    end
  end

  describe '.scheme_allowed?' do
    it 'allows HTTP and HTTPS, rejects others' do
      aggregate_failures do
        expect(described_class.scheme_allowed?('https')).to be true
        expect(described_class.scheme_allowed?('http')).to be true
        expect(described_class.scheme_allowed?('ftp')).to be false
        expect(described_class.scheme_allowed?(nil)).to be false
      end
    end
  end

  describe '.host_present?' do
    it 'detects presence of host in URI' do
      aggregate_failures do
        uri_with_host = URI.parse('https://example.com')
        expect(described_class.host_present?(uri_with_host)).to be true

        uri_with_nil_host = URI.parse('https://example.com')
        uri_with_nil_host.instance_variable_set(:@host, nil)
        expect(described_class.host_present?(uri_with_nil_host)).to be false
      end
    end
  end

  describe '.valid_product_link_url?' do
    it 'delegates to valid_url? method' do
      expect(described_class.valid_product_link_url?('https://example.com')).to be true
      expect(described_class.valid_product_link_url?('invalid')).to be false
    end
  end

  describe '.valid_safety_sheet_link_url?' do
    it 'delegates to valid_url? method' do
      expect(described_class.valid_safety_sheet_link_url?('https://example.com')).to be true
      expect(described_class.valid_safety_sheet_link_url?('invalid')).to be false
    end
  end
end

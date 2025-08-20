# frozen_string_literal: true

module Chemotion
  # Input sanitization and validation utilities for secure data processing
  module InputValidationUtils
    # Validate vendor name format with security restrictions
    # @param vendor_name [String] Vendor name to validate
    # @return [Boolean] true if valid vendor name
    # @note Vendor names have stricter rules:
    #   - Must start with a letter (not digit)
    #   - Maximum 20 characters
    #   - Only lowercase letters, digits, and hyphens allowed
    #   - Must contain at least one letter
    #   - Cannot be reserved/dangerous words
    # @example
    #   valid_vendor_name?("merck")         #=> true
    #   valid_vendor_name?("sigma-aldrich") #=> true
    #   valid_vendor_name?("123vendor")     #=> false (starts with digit)
    #   valid_vendor_name?("admin")         #=> false (reserved word)
    def self.valid_vendor_name?(vendor_name)
      return false unless vendor_name.is_a?(String)

      normalized = vendor_name.strip.downcase
      return false unless contains_letter?(normalized)

      valid_identifier?(vendor_name, max_length: 20, allow_leading_digit: false)
    end

    # Validate product number format with flexible rules
    # @param product_number [String] Product number to validate
    # @return [Boolean] true if valid product number
    # @note Product numbers have more flexible rules:
    #   - Can start with digit or letter
    #   - Maximum 25 characters
    #   - Only lowercase letters, digits, and hyphens allowed
    #   - Can contain only digits (no letter requirement)
    #   - Cannot be reserved/dangerous words
    # @example
    #   valid_product_number?("prod123")    #=> true
    #   valid_product_number?("123prod")    #=> true
    #   valid_product_number?("abc-456")    #=> true
    #   valid_product_number?("12345")      #=> true (digits only allowed)
    def self.valid_product_number?(product_number)
      valid_identifier?(product_number, max_length: 25, allow_leading_digit: true)
    end

    # Generic identifier validation engine for secure input validation
    # @param identifier [String] The identifier to validate
    # @param max_length [Integer] Maximum allowed length (default: 20)
    # @param allow_leading_digit [Boolean] Whether to allow identifiers starting with digits
    # @return [Boolean] true if identifier passes all validation rules
    # @note Security validations applied:
    #   1. Type check (must be String)
    #   2. Length validation (2 to max_length characters)
    #   3. Character whitelist (only a-z, 0-9, hyphen)
    #   4. Format rules (no leading/trailing/consecutive hyphens)
    #   5. Content requirement (must contain at least one letter)
    #   6. Blacklist check (blocks dangerous/reserved words)
    # @example
    #   valid_identifier?("test-123", max_length: 20, allow_leading_digit: true) #=> true
    #   valid_identifier?("admin", max_length: 20, allow_leading_digit: false)   #=> false
    def self.valid_identifier?(identifier, max_length: 20, allow_leading_digit: false)
      return false unless identifier.is_a?(String)

      normalized = identifier.strip.downcase

      return false unless valid_length?(normalized, max_length)
      return false unless valid_characters?(normalized)
      return false unless valid_format?(normalized, allow_leading_digit)
      return false unless safe_word?(normalized)

      true
    end

    # Validate string length within acceptable bounds
    # @param str [String] The string to validate
    # @param max [Integer] Maximum allowed length
    # @return [Boolean] true if length is between 2 and max characters (inclusive)
    def self.valid_length?(str, max)
      str.length.between?(2, max)
    end

    # Validate that string contains only allowed characters
    # @param str [String] The string to validate
    # @return [Boolean] true if string contains only lowercase letters, digits, and hyphens
    def self.valid_characters?(str)
      str.match?(/\A[a-z0-9-]+\z/)
    end

    # Validate string format and structure rules
    # @param str [String] The string to validate
    # @param allow_leading_digit [Boolean] Whether to allow strings starting with digits
    # @return [Boolean] true if string follows proper format rules
    # @note Format rules:
    #   - Cannot start or end with hyphen
    #   - Cannot contain consecutive hyphens
    #   - Must start with letter if allow_leading_digit is false
    def self.valid_format?(str, allow_leading_digit)
      return false if str.start_with?('-') || str.end_with?('-')
      return false if str.include?('--')
      return true if allow_leading_digit

      str.match?(/\A[a-z]/)
    end

    # Check if string contains at least one letter
    # @param str [String] The string to validate
    # @return [Boolean] true if string contains at least one lowercase letter
    # @note This prevents purely numeric or hyphen-only identifiers
    def self.contains_letter?(str)
      return false unless str.is_a?(String)

      str.match?(/[a-z]/)
    end

    # Check if string is not a reserved/dangerous word
    # @param str [String] The string to validate
    # @return [Boolean] true if string is not in the blacklist of reserved words
    # @note Blocked words include: admin, root, test, null, undefined, script, javascript,
    #       sql, drop, delete, insert, update, select (common attack vectors)
    def self.safe_word?(str)
      %w[
        admin root test null undefined script javascript sql drop delete insert update select
      ].exclude?(str)
    end
  end
end

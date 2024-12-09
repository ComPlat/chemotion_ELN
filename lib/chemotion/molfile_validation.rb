# frozen_string_literal: true

module Chemotion
  class MolfileValidation
    def self.validate_and_clear_molfile(pc_mol)
      return if invalid_molfile?(pc_mol)

      Chemotion::OpenBabelService.molfile_clear_hydrogens(pc_mol)
    end

    def self.invalid_molfile?(molfile)
      parsed = parse_to_hash(molfile)
      parsed['Status'] == '400'
    end

    def self.parse_to_hash(input)
      # Split the string into key-value pairs based on known patterns
      input.each_line.with_object({}) do |line, hash|
        next unless line =~ /^(.+?):\s(.*)$/

        key = Regexp.last_match(1).strip
        value = Regexp.last_match(2).strip
        hash[key] = value
      end
    end
  end
end

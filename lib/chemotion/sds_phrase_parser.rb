# frozen_string_literal: true

module Chemotion
  # Collects H and P codes from a block of SDS lines. Codes are language invariant;
  # the wording is looked up locally by ChemicalsService.construct_h_statements.
  class SdsPhraseParser
    # Three digits exactly, so a formula such as H2O cannot pose as a code.
    def self.codes(lines, prefix)
      atom = /(?:EU)?#{prefix}\d{3}[A-Za-z]*/
      text = Array(lines).join("\n")
      text.scan(/\b#{atom}(?:\s*\+\s*#{atom})*/).map { |code| code.gsub(/\s+/, '') }.uniq
    end
  end
end

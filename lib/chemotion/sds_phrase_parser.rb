# frozen_string_literal: true

module Chemotion
  # Collects H and P codes from a block of SDS lines. Codes are language invariant;
  # the wording is looked up locally by ChemicalsService.construct_h_statements.
  class SdsPhraseParser
    # The category letters the catalogue uses (H360FD, H350i, EUH209A), longest first, so
    # "H225Highly flammable" glued by the text layer still yields H225.
    SUFFIX = '(?:FD|Fd|Df|fd|[ADFdfi])?(?![a-z])'

    # Three digits exactly, so a formula such as H2O cannot pose as a code.
    # @param lines [Array<String>, String]
    # @param prefix [String] 'H' or 'P'
    # @return [Array<String>] codes in order of appearance, "+" combinations kept whole
    def self.codes(lines, prefix)
      atom = /(?:EU)?#{prefix}\d{3}#{SUFFIX}/
      text = Array(lines).join("\n")
      text.scan(/(?<![A-Za-z])#{atom}(?:\s*\+\s*#{atom})*/).map { |code| code.gsub(/\s+/, '') }.uniq
    end
  end
end

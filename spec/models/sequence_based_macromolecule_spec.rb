# frozen_string_literal: true

require 'rails_helper'

describe SequenceBasedMacromolecule do
  describe '.with_ec_number' do
    it "returns only SBMM records that have the matching ec number" do
      sbmm1 = create(:uniprot_sbmm, ec_numbers: ["1.2.3", "1.2.4"])
      sbmm2 = create(:uniprot_sbmm, ec_numbers: ["1.2.1", "1.2.4"])

      result = described_class.with_ec_number("1.2.3")

      expect(result.count).to eq 1
      expect(result.first.id).to be sbmm1.id
    end
  end
end

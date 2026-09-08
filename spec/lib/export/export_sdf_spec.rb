# frozen_string_literal: true

require 'rails_helper'

describe Export::ExportSdf do
  subject(:exporter) { described_class.new }

  let(:ctab) do
    <<~CTAB
      null
        Ketcher  6232611422D 1   1.00000     0.00000     0

        1  0  0  0  0  0  0  0  0  0999 V2000
          2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
      M  END
    CTAB
  end

  describe '#validate_molfile' do
    it 'keeps the full molfile when the PolymersList block has a payload' do
      molfile = "#{ctab}> <PolymersList>\n0/95/1.00-1.00\n$$$$\n"

      expect(exporter.send(:validate_molfile, molfile)).to eq(molfile.rstrip)
    end

    it 'keeps the full molfile when a TextNode block is present' do
      molfile = "#{ctab}> <TextNode>\n0#0ce7f3#t_95_0#label\n> </TextNode>\n$$$$\n"

      expect(exporter.send(:validate_molfile, molfile)).to eq(molfile.rstrip)
    end

    # Ketcher emits an empty "> <PolymersList>" for ordinary structures. Preserving it here would
    # write the tag into the exported SDF and carry it to whatever instance imports the file.
    it 'trims an empty PolymersList block down to the CTAB' do
      molfile = "#{ctab}> <PolymersList>\n$$$$\n"

      expect(exporter.send(:validate_molfile, molfile)).to eq(ctab.rstrip)
    end

    it 'still keeps the molfile when an empty PolymersList is followed by a TextNode block' do
      molfile = "#{ctab}> <PolymersList>\n> <TextNode>\n0#0ce7f3#t_95_0#label\n> </TextNode>\n$$$$\n"

      expect(exporter.send(:validate_molfile, molfile)).to eq(molfile.rstrip)
    end

    it 'trims a plain molfile to the CTAB' do
      expect(exporter.send(:validate_molfile, ctab)).to eq(ctab.rstrip)
    end

    it 'returns the molfile unchanged when it carries no end-of-CTAB marker' do
      expect(exporter.send(:validate_molfile, "no ctab here\n")).to eq("no ctab here\n")
    end

    it 'returns an empty string for nil' do
      expect(exporter.send(:validate_molfile, nil)).to eq('')
    end
  end
end

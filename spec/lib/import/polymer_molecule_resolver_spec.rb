# frozen_string_literal: true

require 'rails_helper'
require 'digest'

RSpec.describe Import::PolymerMoleculeResolver do
  let(:ctab) do
    <<~MOLFILE
      POLYTEST

        crafted
        3  2  0  0  0  0  0  0  0  0999 V2000
          0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
          2.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
        1  2  1  0  0  0  0
        2  3  1  0  0  0  0
      M  END
    MOLFILE
  end
  # +"...": MolfilePolymerSupport mutates its argument in place (force_encoding), and these
  # fixtures would otherwise come back frozen under this file's frozen_string_literal pragma.
  let(:polymer_molfile) { +"#{ctab}> <PolymersList>\nsome polymer data\n" }
  let(:blank_after_cleaning_molfile) { +"> <PolymersList>\nsome polymer data\n" }
  let(:babel_info) do
    { inchikey: 'CSCPPACGZOOCGX-UHFFFAOYSA-N', formula: 'C3NO', is_partial: false, molfile_version: 'V2000' }
  end
  let(:molecule) { create(:molecule, inchikey: babel_info[:inchikey], is_partial: false) }

  describe '.call' do
    context 'when the molfile is blank after PolymersList/TextNode cleaning' do
      it 'returns a Result with a nil molecule' do
        result = described_class.call(blank_after_cleaning_molfile)

        expect(result.molecule).to be_nil
        expect(result.babel_info).to be_nil
      end

      it 'does not call OpenBabel for a molfile that cleans to blank' do
        allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile)

        described_class.call(blank_after_cleaning_molfile)

        expect(Chemotion::OpenBabelService).not_to have_received(:molecule_info_from_molfile)
      end
    end

    context 'when OpenBabel resolves an inchikey for the cleaned molfile' do
      before do
        allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
        allow(Molecule).to receive(:find_or_create_by_molfile).and_return(molecule)
      end

      it 'delegates to Molecule.find_or_create_by_molfile with the full (uncleaned) molfile' do
        result = described_class.call(polymer_molfile, lcss_batch: [1, 2])

        expect(Molecule).to have_received(:find_or_create_by_molfile)
          .with(polymer_molfile, lcss_batch: [1, 2], **babel_info)
        expect(result.molecule).to eq(molecule)
      end

      it 'reattaches SVG using the full molfile when Molecule.svg_reprocess returns one' do
        allow(Molecule).to receive_messages(svg_reprocess: '<?xml version="1.0"?><svg/>')
        allow(molecule).to receive_messages(attach_svg: nil, save: true)

        described_class.call(polymer_molfile)

        expect(Molecule).to have_received(:svg_reprocess).with(nil, polymer_molfile, service: :indigo)
        expect(molecule).to have_received(:attach_svg).with('<?xml version="1.0"?><svg/>')
      end

      it 'does not attempt to attach an SVG when Molecule.svg_reprocess returns blank' do
        allow(Molecule).to receive_messages(svg_reprocess: nil)
        allow(molecule).to receive(:attach_svg)

        described_class.call(polymer_molfile)

        expect(molecule).not_to have_received(:attach_svg)
      end
    end

    context 'when OpenBabel cannot resolve an inchikey for the cleaned molfile' do
      let(:blank_inchikey_babel_info) { { inchikey: nil, formula: 'C3NO' } }

      before do
        allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(blank_inchikey_babel_info)
        allow(Molecule).to receive(:svg_reprocess).and_return(nil)
      end

      it 'falls back to a synthetic POLYMER_ inchikey and creates a partial molecule' do
        result = described_class.call(polymer_molfile)

        expect(result.molecule).to be_present
        expect(result.molecule.inchikey).to eq("POLYMER_#{Digest::SHA256.hexdigest(polymer_molfile)}")
        expect(result.molecule.is_partial).to be(true)
      end
    end

    context 'when unescape_octal is configured' do
      # \342\210\200 is the octal-escaped UTF-8 byte sequence (E2 88 80) for U+2200 (FOR ALL, "∀"),
      # matching the real-world Excel round-trip case this method exists to undo.
      let(:octal_molfile) { +"#{ctab}> <PolymersList>\nx\n> <TextNode>\n\\342\\210\\200\n> </TextNode>\n" }

      before do
        allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
        allow(Molecule).to receive_messages(find_or_create_by_molfile: molecule, svg_reprocess: nil)
      end

      it 'unescapes TextNode octal sequences by default (unescape_octal: true)' do
        result = described_class.call(octal_molfile)

        expect(result.raw_molfile).not_to include('\342\210\200')
        expect(result.raw_molfile).to include('∀')
      end

      it 'leaves octal sequences untouched when unescape_octal: false' do
        result = described_class.call(octal_molfile, unescape_octal: false)

        expect(result.raw_molfile).to include('\342\210\200')
      end
    end
  end
end

# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SdsPdfTextExtractor do
  let(:file_path) { '/tmp/test_sds.pdf' }

  # Minimal but structurally valid SDS text with English section headers
  def english_sds_text(extra_sections: '')
    <<~TEXT
      SECTION 1 Identification
      Product Name: Phenol
      CAS: 108-95-2

      SECTION 2 Hazard Identification
      Signal Word: Danger
      H301: Toxic if swallowed
      H314: Causes severe skin burns

      SECTION 3 Composition
      Component: Phenol

      SECTION 4 First Aid Measures
      Inhalation: Move to fresh air.

      SECTION 5 Firefighting Measures
      Extinguishing media: Water spray.

      SECTION 6 Accidental Release Measures
      Personal precautions: Wear PPE.

      SECTION 7 Handling and Storage
      Handling: Avoid contact.

      SECTION 8 Exposure Controls/Personal Protection
      P260: Do not breathe vapours.
      P280: Wear protective gloves.

      SECTION 9 Physical and Chemical Properties
      Boiling Point: 181.7 C
      Flash Point: 79 C
      Density: 1.07 g/cm3
      #{extra_sections}
    TEXT
  end

  # Minimal SDS text with German section headers (ABSCHNITT)
  def german_sds_text
    <<~TEXT
      ABSCHNITT 1 Bezeichnung des Stoffs
      Produktname: Phenol
      CAS: 108-95-2

      ABSCHNITT 2 Mögliche Gefahren
      Signalwort: Gefahr
      H301

      ABSCHNITT 3 Zusammensetzung
      Bestandteil: Phenol

      ABSCHNITT 4 Erste-Hilfe-Maßnahmen
      Einatmen: Frischluft.

      ABSCHNITT 5 Brandbekämpfung
      Löschmittel: Wasser.

      ABSCHNITT 6 Freisetzung
      Schutzausrüstung tragen.

      ABSCHNITT 7 Handhabung
      Kontakt vermeiden.

      ABSCHNITT 8 Begrenzung und Überwachung der Exposition
      P260: Nicht einatmen.
      P280: Schutzhandschuhe tragen.

      ABSCHNITT 9 Physikalische und chemische Eigenschaften
      Siedepunkt: 181,7 Grad C
      Flammpunkt: 79 Grad C
      Dichte: 1,07 g/cm3
    TEXT
  end

  describe '.extract' do
    subject(:extract) { described_class.extract(file_path) }

    context 'when the file does not exist' do
      it 'raises ExtractionError' do
        allow(File).to receive(:exist?).with(file_path).and_return(false)
        expect { extract }.to raise_error(SdsPdfTextExtractor::ExtractionError, /not found/)
      end
    end

    context 'when ghostscript returns empty output' do
      before do
        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(Open3).to receive(:capture3).and_return(['', '', double(success?: true)])
      end

      it 'raises ExtractionError' do
        expect { extract }.to raise_error(SdsPdfTextExtractor::ExtractionError, /No text/)
      end
    end

    context 'when ghostscript fails' do
      before do
        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(Open3).to receive(:capture3).and_return(['', 'rangecheck error', double(success?: false, exitstatus: 1)])
      end

      it 'raises ExtractionError with gs error message' do
        expect { extract }.to raise_error(SdsPdfTextExtractor::ExtractionError, /Ghostscript failed/)
      end
    end

    context 'when gs binary is not found' do
      before do
        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(Open3).to receive(:capture3).and_raise(Errno::ENOENT)
      end

      it 'raises ExtractionError mentioning gs not in PATH' do
        expect { extract }.to raise_error(SdsPdfTextExtractor::ExtractionError, /not installed/)
      end
    end

    context 'when gs succeeds' do
      let(:pdf_text) { english_sds_text }

      before do
        allow(File).to receive(:exist?).with(file_path).and_return(true)
        allow(Open3).to receive(:capture3).and_return([pdf_text, '', double(success?: true)])
      end

      it 'calls gs with the correct arguments' do
        expect(Open3).to receive(:capture3).with(
          'gs', '-dBATCH', '-dNOPAUSE', '-dSAFER',
          '-sDEVICE=txtwrite', '-sOutputFile=%stdout', '-q', '--', file_path
        ).and_return([pdf_text, '', double(success?: true)])
        extract
      end

      context 'with English GHS section headers' do
        let(:pdf_text) { english_sds_text }

        it 'extracts relevant sections (1, 2, 3, 8, 9)' do
          result = extract
          expect(result).to include('SECTION 1')
          expect(result).to include('SECTION 2')
          expect(result).to include('SECTION 3')
          expect(result).to include('SECTION 8')
          expect(result).to include('SECTION 9')
        end

        it 'includes Section 3 composition data (needed for mixture CAS numbers)' do
          expect(extract).to include('Component: Phenol')
        end

        it 'omits non-relevant sections' do
          result = extract
          expect(result).not_to include('SECTION 4')
          expect(result).not_to include('SECTION 5')
          expect(result).not_to include('SECTION 6')
          expect(result).not_to include('SECTION 7')
        end

        it 'includes the chemical identification data from section 1' do
          expect(extract).to include('Phenol')
        end

        it 'includes hazard data from section 2' do
          expect(extract).to include('H301')
        end

        it 'includes P-statements from section 8' do
          expect(extract).to include('P260')
        end

        it 'includes physical properties from section 9' do
          expect(extract).to include('Boiling Point')
        end
      end

      context 'with German GHS section headers (ABSCHNITT)' do
        let(:pdf_text) { german_sds_text }

        it 'extracts sections 1, 2, 3, 8, 9 from German SDS' do
          result = extract
          expect(result).to include('ABSCHNITT 1')
          expect(result).to include('ABSCHNITT 2')
          expect(result).to include('ABSCHNITT 3')
          expect(result).to include('ABSCHNITT 8')
          expect(result).to include('ABSCHNITT 9')
        end

        it 'omits non-relevant sections from German SDS' do
          result = extract
          expect(result).not_to include('ABSCHNITT 4')
          expect(result).not_to include('ABSCHNITT 5')
        end

        it 'includes German physical property values' do
          expect(extract).to include('Siedepunkt')
        end
      end

      context 'when MAX_SECTION_CHARS would be exceeded' do
        let(:long_section_9) { "X#{' data' * 10_000}" }
        let(:pdf_text) { english_sds_text(extra_sections: long_section_9) }

        it 'caps extracted text at MAX_SECTION_CHARS' do
          expect(extract.length).to be <= SdsPdfTextExtractor::MAX_SECTION_CHARS
        end
      end

      context 'when section headers are not detected (non-standard PDF)' do
        let(:pdf_text) { 'Some generic PDF without standard SDS section headers. ' * 200 }

        it 'falls back to the first MAX_FALLBACK_CHARS characters' do
          result = extract
          expect(result.length).to be <= SdsPdfTextExtractor::MAX_FALLBACK_CHARS
        end

        it 'logs that section detection failed' do
          expect(Rails.logger).to receive(:info).with(/section detection failed/)
          extract
        end
      end

      context 'when only 1 relevant section is detected (partial document)' do
        let(:pdf_text) do
          "SECTION 2 Hazard Identification\nSignal Word: Danger\nH301: Toxic\n" \
            "Some other content without standard section numbers.\n" * 50
        end

        it 'uses fallback (not smart extraction)' do
          result = extract
          # With only 1 relevant section found (<2), falls back to MAX_FALLBACK_CHARS
          expect(result.length).to be <= SdsPdfTextExtractor::MAX_FALLBACK_CHARS
        end
      end

      context 'when smart extraction succeeds' do
        let(:pdf_text) { english_sds_text }

        it 'logs the extraction result with raw and normalised char counts' do
          expect(Rails.logger).to receive(:info).with(/raw:.*normalised:/)
          extract
        end
      end

      context 'when PDF text has excessive horizontal whitespace (multi-column layout)' do
        let(:multi_column_line) { "Signal Word:#{' ' * 200}Danger" }
        let(:pdf_text) do
          english_sds_text.sub('Signal Word: Danger', multi_column_line)
        end

        it 'collapses runs of spaces to at most 2 spaces' do
          result = extract
          expect(result).not_to match(/ {3,}/)
        end

        it 'still includes the meaningful content after normalisation' do
          expect(extract).to include('Signal Word:')
          expect(extract).to include('Danger')
        end

        it 'produces a shorter result than the raw text' do
          # Allow ghostscript to return the spaced-out text
          raw_chars = pdf_text.length
          result_chars = extract.length
          expect(result_chars).to be < raw_chars
        end
      end
    end
  end
end


# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ChemicalsService do
  describe Chemotion::ChemicalsService do
    context 'when write_file is called' do
      let(:link) { 'https://www.sigmaaldrich.com/DE/en/sds/sigald/383112' }
      let(:file_path) { '252549_Merck.pdf' }

      it 'writes the file when the content type is application/pdf' do
        content_type = 'application/pdf'
        response_body = 'sample response body'
        allow(HTTParty).to receive(:get).with(link, anything).and_return(
          instance_double(HTTParty::Response, headers: { 'Content-Type' => content_type }, body: response_body),
        )
        expect(described_class.write_file(file_path, link)).to be_truthy
      end

      it 'returns an error message when the safety sheet is not a PDF' do
        allow(HTTParty).to receive(:get).and_return(
          instance_double(HTTParty::Response, headers: { 'Content-Type' => 'text/html' }),
        )
        expect(described_class.write_file(file_path, link)).to eq('there is no file to save')
      end
    end

    context 'when create_sds_file is called' do
      it 'creates safety data when not already saved' do
        file_path = '252549_Merck.pdf'
        link = 'https://www.sigmaaldrich.com/US/en/sds/sial/252549'

        allow(described_class).to receive(:write_file).with(file_path, link, nil).and_return(true)
        result = described_class.create_sds_file(file_path, link)
        expect(result).to be_truthy
      end
    end

    context 'when health_section is called' do
      it 'returns the health section of the Alfa website for a given product number' do
        product_number = 'A14672'
        health_section_content =
          '<body>
            <div>
              <div>
                <div id="health">
                  <div>
                    <div>
                      <p>
                        <strong>Hazard Statements:</strong>
                        EUH066-H304
                      </p>
                      <p>
                        Repeated exposure may cause skin dryness or cracking.
                      </p>
                      <p>
                        <strong>Precautionary Statements:</strong>
                        P280-P301+P310-P331
                      </p>
                      <p>
                        Wear protective gloves/protective clothing/eye protection/face protection
                      </p>
                      <img src="/static//images/pictogram/Health_hazard.gif" alt="">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>'
        allow(HTTParty).to receive(:get).and_return(instance_double(HTTParty::Response, body: health_section_content))
        health_section = described_class.health_section(product_number)
        expect(health_section).not_to be_nil
      end
    end

    context 'when construct_h_statements for Thermofischer is called' do
      it 'constructs hazard statements from the health section' do
        h_array = %w[H200 H311]
        h_statements = described_class.construct_h_statements(h_array)
        expect(h_statements).to be_a(Hash)
        expect(h_statements.keys).to contain_exactly('H200', 'H311')
        expect(h_statements.values).to contain_exactly(' Unstable explosive', ' Toxic in contact with skin')
      end
    end

    context 'when construct_p_statements for Thermofischer is called' do
      it 'constructs precautionary statements from the health section' do
        p_array = %w[P232 P235]
        p_statements = described_class.construct_p_statements(p_array)
        expect(p_statements).to be_a(Hash)
        expect(p_statements.keys).to contain_exactly('P232', 'P235')
        expect(p_statements.values).to contain_exactly(' Keep cool..', ' Protect from moisture.')
      end
    end

    context 'when construct_pictograms for Thermofischer is called' do
      it 'constructs pictograms from the health section' do
        pictograms_array = %w[GHS01 GHS04]
        expected = %w[GHS01 GHS04]
        pictograms = described_class.construct_pictograms(pictograms_array)
        expect(pictograms).to be_a(Array)
        expect(pictograms).to eq(expected)
      end
    end

    context 'when chem_properties_alfa is called' do
      it 'constructs chemical properties hash for alfa vendor' do
        properties = [
          'formula',
          'NaI',
          'formula Weight',
          '149.89',
          'form',
          'powder',
          'melting point',
          '651°',
        ]
        chemical_properties = described_class.chem_properties_alfa(properties)
        expect(chemical_properties).to be_a(Hash)
        expect(chemical_properties.keys).to contain_exactly('formula', 'formula_weight', 'form', 'melting_point')
        expect(chemical_properties.values).to contain_exactly('NaI', '149.89', 'powder', '651°')
      end
    end

    context 'when chem_properties_merck is called' do
      it 'constructs chemical properties hash for merck vendor' do
        chem_properties_names = %w[grade quality_level form mp ph]
        chem_properties_values = [
          '200',
          '>1 (vs air)',
          '≤0.002% N compounds≤0.01% insolubles',
          '661 °C',
          '≤0.002% N compounds≤0.01% insolubles',
          '6.0-9.0 (25 °C, 5%)',
        ]
        chemical_properties = described_class.chem_properties_merck(chem_properties_names, chem_properties_values)
        expect(chemical_properties).to be_a(Hash)
        expect(chemical_properties.keys).to contain_exactly(
          'grade',
          'quality_level',
          'form',
          'melting_point',
          'ph',
        )
        expect(chemical_properties.values).to contain_exactly(
          '200',
          '661 °C',
          '>1 (vs air)',
          '≤0.002% N compounds≤0.01% insolubles',
          '≤0.002% N compounds≤0.01% insolubles',
        )
      end
    end

    context 'when handle_exceptions is called' do
      let(:error_message) { 'statement invalid' }

      it 'calls the block when no exception is raised' do
        result = 'test result'
        expect(described_class.handle_exceptions { result }).to eq(result)
      end

      it 'logs the error message for any StandardError and returns error hash' do
        error_message = 'Something went wrong'
        allow(Rails.logger).to receive(:error)

        result = described_class.handle_exceptions { raise StandardError, error_message }

        expect(Rails.logger).to have_received(:error).with("Error: #{error_message}")
        expect(result).to eq({ error: error_message })
      end

      it 'returns a specific error message for JSON::ParserError' do
        allow(Rails.logger).to receive(:error)

        result = described_class.handle_exceptions { raise JSON::ParserError }

        expect(result).to eq({ error: 'Invalid JSON data' })
      end

      it 'returns error for ActiveRecord exceptions' do
        db_error = 'Database constraint violation'
        allow(Rails.logger).to receive(:error)

        # Simply mock the error message for ActiveRecord::StatementInvalid
        statement_invalid = ActiveRecord::StatementInvalid.new(db_error)

        result = described_class.handle_exceptions { raise statement_invalid }

        expect(result).to eq({ error: db_error })
      end
    end

    context 'when clean_property_name is called' do
      it 'handles property names with abbreviations in parentheses' do
        expect(described_class.clean_property_name('mp (schmelzpunkt)')).to eq('melting_point')
        expect(described_class.clean_property_name('bp (siedepunkt)')).to eq('boiling_point')
      end

      it 'handles abbreviations without parentheses' do
        expect(described_class.clean_property_name('mp')).to eq('melting_point')
        expect(described_class.clean_property_name('bp')).to eq('boiling_point')
        expect(described_class.clean_property_name('MP')).to eq('melting_point')
      end

      it 'handles German property names with no parentheses' do
        expect(described_class.clean_property_name('qualitätsniveau')).to eq('quality level')
        expect(described_class.clean_property_name('dampfdichte')).to eq('vapor density')
        expect(described_class.clean_property_name('löslichkeit')).to eq('solubility')
      end

      it 'handles property names with German terms in parentheses' do
        expect(described_class.clean_property_name('density (dichte)')).to eq('density')
        expect(described_class.clean_property_name('color (farbe)')).to eq('color')
      end

      it 'returns lowercase original name when no mapping exists' do
        expect(described_class.clean_property_name('unknown_property')).to eq('unknown_property')
      end

      it 'handles empty or nil input' do
        expect(described_class.clean_property_name('')).to be_nil
        expect(described_class.clean_property_name(nil)).to be_nil
      end

      it 'extracts German terms from parentheses correctly' do
        expect(described_class.clean_property_name('density (dichte)')).to eq('density')
        expect(described_class.clean_property_name('color (Farbe)')).to eq('color')
      end
    end
  end
end

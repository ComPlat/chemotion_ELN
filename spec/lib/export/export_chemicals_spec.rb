# frozen_string_literal: true

require 'rails_helper'

# rubocop: disable Style/OpenStructUse

describe Export::ExportChemicals do
  describe '.format_chemical_amount_or_volume' do
    it 'formats chemical amount correctly' do
      input_value = '{"value": 50, "unit": "mg"}'
      formatted_amount = described_class.format_chemical_amount_or_volume(input_value)
      expect(formatted_amount).to eq('50 mg')
    end

    it 'formats chemical storage temperature correctly' do
      input_value = '{"value": 30, "unit": "°C"}'
      formatted_amount = described_class.format_chemical_fields_with_unit(input_value)
      expect(formatted_amount).to eq('30°C')
    end
  end

  describe '.format_columns_name' do
    it 'format columns name' do
      result = OpenStruct.new(columns: ['safety sheet link merck', 'product link thermofischer'])
      indexes = [0, 1]
      described_class.format_columns_name(result, *indexes)
      expect(result.columns).to eq(['safety sheet link', 'product link'])
    end
  end

  describe '.delete_columns' do
    it 'delete specific columns and rows' do
      result = OpenStruct.new(columns: ['safety sheet link', 'safety sheet link thermofischer',
                                        'product link', 'product link thermofischer'],
                              rows: [['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376', '',
                                      'https://www.sigmaaldrich.com/US/en/product/sigma/a5376', nil]])
      indexes = [1, 3]
      described_class.delete_columns(result, *indexes)
      expect(result.columns).to eq(['safety sheet link', 'product link'])
      expect(result.rows[0]).to eq(['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376',
                                    'https://www.sigmaaldrich.com/US/en/product/sigma/a5376'])
    end
  end

  describe '.process_merged_columns' do
    it 'process merged columns' do
      columns_index = {
        'safety_sheet_link' => [0, 1],
        'product_link' => [2, 3],
      }
      result = OpenStruct.new(columns: ['safety sheet link merck', 'safety sheet link thermofischer',
                                        'product link merck', 'product link thermofischer'],
                              rows: [['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376', '',
                                      'https://www.sigmaaldrich.com/US/en/product/sigma/a5376', nil]])
      described_class.process_merged_columns(result, columns_index)
      expect(result.columns).to eq(['safety sheet link', 'product link'])
      expect(result.rows[0]).to eq(['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376',
                                    'https://www.sigmaaldrich.com/US/en/product/sigma/a5376'])
    end
  end

  describe '.process_to_delete_indexes' do
    it 'process to delete indexes' do
      result = OpenStruct.new(columns: ['safety sheet link merck', 'safety sheet link thermofischer',
                                        'product link merck', 'product link thermofischer'],
                              rows: [['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376', '',
                                      'https://www.sigmaaldrich.com/US/en/product/sigma/a5376', nil]])
      indexes_to_delete = [1, 3]
      described_class.process_to_delete_indexes(result, indexes_to_delete)
      expect(result.columns).to eq(['safety sheet link', 'product link'])
      expect(result.rows[0]).to eq(['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376',
                                    'https://www.sigmaaldrich.com/US/en/product/sigma/a5376'])
    end
  end

  describe '.merge_safety_sheets_columns_rows' do
    it 'merge safety sheets columns rows' do
      columns_index = {
        'safety_sheet_link' => [0, 1],
        'product_link' => [2, 3],
      }
      result = OpenStruct.new(columns: ['safety sheet link merck', 'safety sheet link thermofischer',
                                        'product link merck', 'product link thermofischer'],
                              rows: [['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376', '',
                                      'https://www.sigmaaldrich.com/US/en/product/sigma/a5376', nil]])
      indexes_to_delete = [1, 3]
      described_class.merge_safety_sheets_columns_rows(result, indexes_to_delete, columns_index)
      expect(result.columns).to eq(['safety sheet link', 'product link'])
      expect(result.rows[0]).to eq(['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376',
                                    'https://www.sigmaaldrich.com/US/en/product/sigma/a5376'])
    end
  end

  describe '.format_p_and_h_statements' do
    it 'formats p and h statements' do
      value = '{"key1": "value1", "key2": "value2"}'
      expect(described_class.format_p_and_h_statements(value)).to eq('key1-key2')
    end
  end

  describe '.format_link' do
    it 'formats link value' do
      row = ['', 'next_value']
      next_index = 1
      indexes_to_delete = []
      value = 'current_value'
      expect(described_class.format_link(value, row, next_index, indexes_to_delete))
        .to eq('current_value-next_value')
      expect(indexes_to_delete).to eq([next_index])
    end
  end

  describe '.format_row' do
    it 'formats the row' do
      columns_index = {
        'p_statements' => 1,
        'h_statements' => 2,
        'amount' => 3,
        'safety_sheet_link' => [4, 5],
        'product_link' => [6, 7],
      }
      indexes_to_delete = []

      row = [
        'value1',
        '{"key1": "value1", "key2": "value2"}',
        '{"key3": "value3", "key4": "value4"}',
        '{"unit":"g", "value": "300"}',
        'safety_link_value',
        'safety_link_value2',
        'product_link_value',
        'product_next_value',
      ]

      formatted_row = described_class.format_row(row, columns_index, indexes_to_delete)

      expect(indexes_to_delete).to eq([5, 7])
      expect(formatted_row).to eq(['value1', 'key1-key2', 'key3-key4', '300 g',
                                   'safety_link_value-safety_link_value2', 'safety_link_value2',
                                   'product_link_value-product_next_value', 'product_next_value'])
    end

    describe '.construct_column_name' do
      it 'constructs column name (h statements)' do
        columns_index = { 'safety_sheet_link' => [], 'product_link' => [] }
        result = described_class.construct_column_name('h_statements', 2, columns_index)
        resulting_columns_index = ['h statements', { 'h_statements' => 2, 'safety_sheet_link' => [],
                                                     'product_link' => [] }]
        expect(result).to eq(resulting_columns_index)
      end

      it 'constructs column name (amount)' do
        columns_index = { 'safety_sheet_link' => [], 'product_link' => [] }
        result = described_class.construct_column_name('amount', 2, columns_index)
        resulting_columns_index = ['amount', { 'amount' => 2, 'safety_sheet_link' => [],
                                               'product_link' => [] }]
        expect(result).to eq(resulting_columns_index)
      end

      it 'constructs column name (p statements)' do
        columns_index = { 'safety_sheet_link' => [], 'product_link' => [] }
        result = described_class.construct_column_name('p_statements', 2, columns_index)
        resulting_columns_index = ['p statements', { 'p_statements' => 2, 'safety_sheet_link' => [],
                                                     'product_link' => [] }]
        expect(result).to eq(resulting_columns_index)
      end
    end

    describe '.format_chemical_results' do
      it 'format chemical results' do
        result = OpenStruct.new(columns: %w[safety_sheet_link_merck safety_sheet_link_thermofischer
                                            product_link_merck product_link_thermofischer],
                                rows: [['https://www.sigmaaldrich.com/DE/en/sds/sigma/a5376', '',
                                        'https://www.sigmaaldrich.com/US/en/product/sigma/a5376', nil]])

        result = described_class.format_chemical_results(result)

        expect(result.columns).to eq(['safety sheet link merck', 'safety sheet link thermofischer',
                                      'product link merck', 'product link thermofischer'])
      end
    end

    describe '.build_chemical_column_query' do
      it 'builds chemical column query' do
        selection = 'SELECT something FROM some_table'
        sel = {
          chemicals: %w[status safety_sheet_link_merck p_statements],
        }

        expected_chemical_selections = [
          'c."chemical_data"->0->\'status\' as "status"',
          'c."chemical_data"->0->\'merckProductInfo\'->\'sdsLink\' as "safety_sheet_link_merck"',
          'c."chemical_data"->0->\'safetyPhrases\'->\'p_statements\' as "p_statements"',
        ]

        expected_gathered_selections = [selection, expected_chemical_selections]

        expect(described_class.build_chemical_column_query(selection, sel)).to eq(expected_gathered_selections)
      end
    end
  end
end
# rubocop: enable Style/OpenStructUse

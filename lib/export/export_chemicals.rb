# frozen_string_literal: true

module Export
  class ExportChemicals
    CHEMICAL_FIELDS = %w[
      chemical_sample_id cas status vendor order_number amount volume price person required_date
      ordered_date storage_temperature expiration_date required_by pictograms h_statements p_statements
      safety_sheet_link_merck safety_sheet_link_thermofischer product_link_merck product_link_thermofischer
      host_building host_room host_cabinet host_group owner borrowed_by current_building
      current_room current_cabinet current_group disposal_info important_notes
    ].freeze
    MERCK_SDS_LINK = 'c."chemical_data"->0->\'merckProductInfo\'->\'sdsLink\''
    ALFA_SDS_LINK = 'c."chemical_data"->0->\'alfaProductInfo\'->\'sdsLink\''
    MERCK_PRODUCT_LINK = 'c."chemical_data"->0->\'merckProductInfo\'->\'productLink\''
    ALFA_PRODUCT_LINK = 'c."chemical_data"->0->\'alfaProductInfo\'->\'productLink\''
    SAFETY_SHEET_INFO = %w[safety_sheet_link product_link].freeze
    CHEMICAL_QUERIES = {
      status: ['c."chemical_data"->0->\'status\'', '"status"', nil],
      vendor: ['c."chemical_data"->0->\'vendor\'', '"vendor"', nil],
      person: ['c."chemical_data"->0->\'person\'', '"person"', nil],
      price: ['c."chemical_data"->0->\'price\'', '"price"', nil],
      amount: ['c."chemical_data"->0->\'amount\'', '"amount"', nil],
      volume: ['c."chemical_data"->0->\'volume\'', '"volume"', nil],
      order_number: ['c."chemical_data"->0->\'order_number\'', '"order_number"', nil],
      required_date: ['c."chemical_data"->0->\'required_date\'', '"required_date"', nil],
      expiration_date: ['c."chemical_data"->0->\'expiration_date\'', '"expiration_date"', nil],
      storage_temperature: ['c."chemical_data"->0->\'storage_temperature\'', '"storage_temperature"', nil],
      required_by: ['c."chemical_data"->0->\'required_by\'', '"required_by"', nil],
      safety_sheet_link_merck: [MERCK_SDS_LINK, '"safety_sheet_link_merck"', nil],
      safety_sheet_link_thermofischer: [ALFA_SDS_LINK, '"safety_sheet_link_thermofischer"', nil],
      product_link_merck: [MERCK_PRODUCT_LINK, '"product_link_merck"', nil],
      product_link_thermofischer: [ALFA_PRODUCT_LINK, '"product_link_thermofischer"', nil],
      ordered_date: ['c."chemical_data"->0->\'ordered_date\'', '"ordered_date"', nil],
      h_statements: ['c."chemical_data"->0->\'safetyPhrases\'->\'h_statements\'', '"h_statements"', nil],
      p_statements: ['c."chemical_data"->0->\'safetyPhrases\'->\'p_statements\'', '"p_statements"', nil],
      pictograms: ['c."chemical_data"->0->\'safetyPhrases\'->\'pictograms\'', '"pictograms"', nil],
      host_building: ['c."chemical_data"->0->\'host_building\'', '"host_building"', nil],
      host_room: ['c."chemical_data"->0->\'host_room\'', '"host_room"', nil],
      host_cabinet: ['c."chemical_data"->0->\'host_cabinet\'', '"host_cabinet"', nil],
      host_group: ['c."chemical_data"->0->\'host_group\'', '"host_group"', nil],
      owner: ['c."chemical_data"->0->\'host_owner\'', '"owner"', nil],
      current_building: ['c."chemical_data"->0->\'current_building\'', '"current_building"', nil],
      current_room: ['c."chemical_data"->0->\'current_room\'', '"current_room"', nil],
      current_cabinet: ['c."chemical_data"->0->\'current_cabinet\'', '"current_cabinet"', nil],
      current_group: ['c."chemical_data"->0->\'current_group\'', '"current_group"', nil],
      borrowed_by: ['c."chemical_data"->0->\'borrowed_by\'', '"borrowed_by"', nil],
      disposal_info: ['c."chemical_data"->0->\'disposal_info\'', '"disposal_info"', nil],
      important_notes: ['c."chemical_data"->0->\'important_notes\'', '"important_notes"', nil],
    }.freeze

    def self.build_chemical_column_query(selection, sel)
      chemical_selections = []
      sel[:chemicals].each do |col|
        query = CHEMICAL_QUERIES[col.to_sym]
        chemical_selections << ("#{query[2]} as #{query[1]}") if SAFETY_SHEET_INFO.include?(col)
        chemical_selections << ("#{query[0]} as #{query[1]}")
      end
      gathered_selections = []
      gathered_selections << selection
      gathered_selections << chemical_selections
    end

    def self.format_chemical_results(result)
      columns_index = { 'safety_sheet_link' => [], 'product_link' => [] }
      result.columns.map.with_index do |column_name, index|
        column_name, columns_index = construct_column_name(column_name, index, columns_index)
        result.columns[index] = column_name # Replace the value in the array
      end
      format_chemical_results_row(result, columns_index)
    end

    def self.construct_column_name(column_name, index, columns_index)
      format_chemical_column = ['p statements', 'h statements', 'amount', 'volume', 'storage temperature',
                                'safety sheet link thermofischer', 'safety sheet link merck', 'product link thermofischer',
                                'product link merck'].freeze
      if column_name.is_a?(String) && CHEMICAL_FIELDS.include?(column_name)
        column_name = column_name.tr('_', ' ')
        construct_column_name_hash(columns_index, column_name, index) if format_chemical_column.include?(column_name)
      else
        column_name
      end
      [column_name, columns_index]
    end

    def self.construct_column_name_hash(columns_index, column_name, index)
      case column_name
      when 'p statements'
        columns_index['p_statements'] = index
      when 'h statements'
        columns_index['h_statements'] = index
      when 'storage temperature'
        columns_index['storage_temperature'] = index
      when 'safety sheet link merck', 'safety sheet link thermofischer'
        columns_index['safety_sheet_link'].push(index)
      when 'product link merck', 'product link thermofischer'
        columns_index['product_link'].push(index)
      else
        columns_index[column_name] = index
      end
    end

    def self.format_chemical_results_row(result, columns_index)
      indexes_to_delete = []
      result.rows.map! do |row|
        format_row(row, columns_index, indexes_to_delete)
      end
      return result if indexes_to_delete.empty?

      merge_safety_sheets_columns_rows(result, indexes_to_delete, columns_index)
    end

    def self.format_row(row, columns_index, indexes_to_delete)
      row.map.with_index do |value, index|
        next value unless value.is_a?(String)

        case index
        when columns_index['p_statements'], columns_index['h_statements']
          value = format_p_and_h_statements(value)
        when columns_index['amount'], columns_index['volume'], columns_index['storage_temperature']
          value = format_chemical_fields(value)
        when columns_index['safety_sheet_link'][0]
          value = format_link(value, row, columns_index['safety_sheet_link'][1], indexes_to_delete)
        when columns_index['product_link'][0]
          value = format_link(value, row, columns_index['product_link'][1], indexes_to_delete)
        end
        value.gsub(/[\[\]"]/, '')
      end
    end

    def self.format_p_and_h_statements(value)
      keys = JSON.parse(value).keys
      keys.join('-')
    end

    def self.format_chemical_fields(value)
      value_unit = JSON.parse(value).values
      sorted = value_unit.sort_by { |element| [element.is_a?(Integer) || element.is_a?(Float) ? 0 : 1, element] }
      sorted.join(' ')
    end

    def self.format_link(value, row, next_index, indexes_to_delete)
      if next_index && row[next_index].present?
        value += "-#{row[next_index]}"
        indexes_to_delete.push(next_index)
      end
      value
    end

    def self.merge_safety_sheets_columns_rows(result, indexes_to_delete, columns_index)
      process_to_delete_indexes(result, indexes_to_delete)
      process_merged_columns(result, columns_index) if indexes_to_delete.empty?
      result
    end

    def self.process_to_delete_indexes(result, indexes_to_delete)
      indexes_to_delete.sort.reverse_each do |index|
        result.columns.delete_at(index)
        result.rows.each { |row| row.delete_at(index) }
        format_columns_name(result, index - 1)
      end
    end

    def self.process_merged_columns(result, columns_index)
      format_columns_name(result, columns_index['safety_sheet_link'][0], columns_index['product_link'][0])
      delete_columns(result, columns_index['safety_sheet_link'][1], columns_index['product_link'][1])
    end

    def self.format_columns_name(result, *indexes)
      indexes.sort.reverse_each do |index|
        result.columns[index] = result.columns[index].sub(/\s+\S+\z/, '')
      end
    end

    def self.delete_columns(result, *indexes)
      indexes.sort.reverse_each do |index|
        result.columns.delete_at(index)
        result.rows.each { |row| row.delete_at(index) }
      end
    end
  end
end

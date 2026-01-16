# frozen_string_literal: true

require 'roo'

module Import
  class ImportWellplateSpreadsheet
    attr_reader :xlsx, :sheet, :error_messages, :wellplate

    def initialize(wellplate_id:, attachment_id:)
      @wellplate = Wellplate.find(wellplate_id)
      @attachment = Attachment.find(attachment_id)
      @file_path = @attachment.abs_path

      @rows = []
      @error_messages = []
      @letters = [*'A'..'Z']
      @position_index = 0
      @sample_index = 1
      @column_of_first_readout = 5
    end

    def process!
      read_file
      check_headers
      check_prefixes
      check_wells
      ActiveRecord::Base.transaction do
        import_data
      end
    end

    private

    def fail!
      raise StandardError, error_messages.join("\n")
    end

    def read_file
      begin
        @xlsx = Roo::Spreadsheet.open(@file_path, extension: :xlsx)
      rescue Zip::Error
        error_messages << "Can not process this type of file, must be '.xlsx'."
        fail!
      end
      @sheet = xlsx.sheet(0)
      @header = sheet.row(1).map(&:to_s).map(&:strip)
      @rows = sheet.parse
    end

    def check_headers
      ['Position', 'Sample', 'External Compound Label/ID', 'Smiles', 'Molarity', '.+_Value', '.+_Unit']
        .each_with_index do |column_header, column_index|
          next if (@header[column_index] =~ /^#{column_header}/i).present?

          error_messages << "'#{column_header}' must be in cell #{@letters[column_index]}1."
        end

      fail! if error_messages.any?
    end

    def value_headers
      @value_headers ||= @header.grep(/^.+_Value/)
    end

    def value_prefixes
      @value_prefixes ||= value_headers.map { |e| e.delete_suffix('_Value') }
    end

    def unit_headers
      @unit_headers ||= @header.grep(/^.+_Unit/)
    end

    def unit_prefixes
      @unit_prefixes ||= unit_headers.map { |e| e.delete_suffix('_Unit') }
    end

    def check_prefixes
      prefixes_match = value_prefixes == unit_prefixes
      prefixes_unique = value_headers.uniq == value_headers && unit_headers.uniq == unit_headers
      error_messages << "'_Value 'and '_Unit' prefixes don't match up." unless prefixes_match
      error_messages << 'Prefixes must be unique.' unless prefixes_unique

      fail! if error_messages.any?
    end

    def check_wells
      expected_positions = WellPosition.from_dimension(@wellplate.width, @wellplate.height)
      wells = xlsx.column(1).drop(1)

      expected_positions.each_with_index do |expected_position, index|
        actual_position_for_index = WellPosition.from_string(wells[index])
        error = "Well #{expected_position} is missing or at wrong position."
        error_messages << error if actual_position_for_index != expected_position
      end

      fail! if error_messages.any?
    end

    def import_data
      @rows.map do |row|
        position = WellPosition.from_string(row[@position_index])
        well = Well.find_or_create_by!(wellplate_id: @wellplate.id, position_x: position.x, position_y: position.y)

        well.update!(readouts: build_readouts_from_row_data(row))
        well.sample.update!(molarity_value: row[4].to_f, density: 0) if row[4].present? && well.sample
      end

      @wellplate.update!(readout_titles: value_prefixes)
    end

    def build_readouts_from_row_data(row_data)
      row_data[@column_of_first_readout..]
        .each_slice(2)
        .map { |value, unit| { value: value, unit: unit } }
    end
  end
end

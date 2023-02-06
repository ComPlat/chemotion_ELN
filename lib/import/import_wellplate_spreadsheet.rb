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
      @readout_index = 4
    end

    def process!
      read_file
      check_headers
      check_prefixes
      check_wells
      import_data
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
      ['Position', 'Sample', 'External Compound Label/ID', 'Smiles', '.+_Value', '.+_Unit'].each_with_index do |check, index|
        error_messages << "'#{check}' must be in cell #{@letters[index]}1." if (@header[index] =~ /^#{check}/i).nil?
      end

      fail! if error_messages.any?
    end

    def check_prefixes
      value_headers = @header.select { |e| /^.+_Value/ =~e }
      value_prefixes = value_headers.map { |e| e.delete_suffix('_Value') }
      unit_headers = @header.select { |e| /^.+_Unit/ =~e }
      unit_prefixes = unit_headers.map { |e| e.delete_suffix('_Unit') }

      error_messages << "'_Value 'and '_Unit' prefixes don't match up." unless value_prefixes == unit_prefixes
      error_messages << 'Prefixes must be unique.' if value_headers.uniq != value_headers || unit_headers.uniq != unit_headers

      @header[@readout_index..(4 + value_headers.count * 2)].each_with_index do |vh, index|
        column = index + 4
        comparison_index = index / 2
        value_to_compare = column.even? ? value_headers[comparison_index] : unit_headers[comparison_index]
        error_messages << "#{vh} should be in column #{@letters[column]}" if vh != value_to_compare
      end

      fail! if error_messages.any?

      @prefixes = value_prefixes
    end

    def check_wells
      expected_positions = WellPosition.all
      wells = xlsx.column(1).drop(1)

      expected_positions.each_with_index do |expected_position, index|
        actual_position_for_index = WellPosition.from_string(wells[index])
        error = "Well #{expected_position} is missing or at wrong position."
        error_messages << error if actual_position_for_index != expected_position
      end

      fail! if error_messages.any?
    end

    def import_data
      ActiveRecord::Base.transaction do
        @rows.map.with_index do |row, index|
          position_x = index % 12 + 1
          position_y = index / 12 + 1

          tuples = row[@readout_index..@readout_index + @prefixes.count * 2 - 1].each_slice(2).to_a
          readouts = tuples.map { |tuple| Hash[[%w[value unit], tuple].transpose].symbolize_keys }

          well = Well.find_or_create_by!(
            wellplate_id: @wellplate.id,
            position_x: position_x,
            position_y: position_y
          )

          well.update!(
            readouts: readouts
          )
        end

        @wellplate.update!(readout_titles: @prefixes)
      end
    end
  end
end

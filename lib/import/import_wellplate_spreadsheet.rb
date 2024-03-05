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
      begin
        read_file
      rescue Zip::Error
        error_messages << "Can not process this type of file, must be '.xlsx'."
        raise StandardError, error_messages.join("\n")
      end

      begin
        check_headers
      rescue StandardError
        raise StandardError, error_messages.join("\n")
      end

      begin
        check_prefixes
      rescue StandardError
        raise StandardError, error_messages.join("\n")
      end

      begin
        check_wells
      rescue StandardError
        raise StandardError, error_messages.join("\n")
      end

      begin
        import_data
      rescue StandardError
        raise StandardError, error_messages.join("\n")
      end
    end

    private

    def read_file
      @xlsx = Roo::Spreadsheet.open(@file_path, extension: :xlsx)
      @sheet = xlsx.sheet(0)
      @header = sheet.row(1).map(&:to_s).map(&:strip)
      @rows = sheet.parse
    end

    def check_headers
      ['Position', 'Sample', 'External Compound Label/ID', 'Smiles', '.+_Value', '.+_Unit'].each_with_index do |check, index|
        error_messages << "'#{check}' must be in cell #{@letters[index]}1." if (@header[index] =~ /^#{check}/i).nil?
      end

      raise StandardError if error_messages.present?
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

      raise StandardError if error_messages.present?

      @prefixes = value_prefixes
    end

    def check_wells
      positions_check = ('A'..'H').map { |lttr| (1..12).map { |nmbr| ["#{lttr}#{nmbr}"] } }.flatten
      wells = xlsx.column(1).drop(1)

      positions_check.each_with_index do |position, index|
        error_messages << "Well #{position} is missing or at wrong position." if position != wells[index]
      end

      raise StandardError if error_messages.present?
    end

    def import_data
      ActiveRecord::Base.transaction do
        @rows.map.with_index do |row, index|
          position_x = index % 12 + 1
          position_y = index / 12 + 1
          expected_position = "#{@letters[position_y - 1]}#{position_x}"

          @error_messages << "Error. Position #{row[@position_index]} is faulty." if row[@position_index] != expected_position
          raise StandardError if error_messages.present?

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

# frozen_string_literal: true

require 'roo'

module Import
  class ImportWellplateSpreadsheet
    attr_reader :xlsx, :sheet, :header, :mandatory_check, :rows, :error_messages,
                :file_path, :current_user_id, :prefixes, :prefix_diff

    def initialize(attachment_id)
      @attachment = Attachment.find(attachment_id)
      @file_path = @attachment.store.path
      @wellplate = Wellplate.find(@attachment.attachable_id)

      @rows = []
      @error_messages = []
      @letters = ('A'..'Z').to_a
      @position_index = 0
      @sample_index = 1
      @readout_index = 4
    end

    def process!
      begin
        read_file
      rescue Zip::Error
        error_messages << "Can not process this type of file, must be '.xlsx'."
        return error_object
      end

      begin
        check_headers
      rescue StandardError
        return error_object
      end

      begin
        check_prefixes
      rescue StandardError
        return error_object
      end

      begin
        check_wells
      rescue StandardError
        return error_object
      end

      begin
        import_data
        return @unprocessable.empty? ? success : warning
      rescue StandardError
        return warning
      end
    end

    private

    def read_file
      @xlsx = Roo::Spreadsheet.open(@file_path, extension: :xlsx)
      @sheet = xlsx.sheet(0)
      @header = sheet.row(1).reject { |e| e.to_s.empty? }.map(&:strip)
      @rows = sheet.parse
    end

    def check_headers
      ['Position', 'sample_ID', 'External Compound Label/ ID', 'Smiles', '.+_Value', '.+_Unit'].each_with_index do |check, index|
        error_messages << "#{check} should be in cell #{@letters[index]}." if (header[index] =~ /^#{check}/i).nil?
        byebug unless error_messages.empty?
      end

      raise StandardError unless error_messages.empty?
    end

    def check_prefixes
      value_headers = header.select { |e| /^.+_Value/ =~e }
      value_prefixes = value_headers.map { |e| e.delete_suffix('_Value') }
      unit_headers = header.select { |e| /^.+_Unit/ =~e }
      unit_prefixes = unit_headers.map { |e| e.delete_suffix('_Unit') }

      error_messages << "'_Value 'and '_Unit' prefixes don't match up." unless value_prefixes == unit_prefixes
      error_messages << 'Prefixes must be unique.' if value_headers.uniq != value_headers || unit_headers.uniq != unit_headers

      header[@readout_index..(4 + value_headers.count * 2)].each_with_index do |vh, index|
        column = index + 4
        value2compare = column.even? ? value_headers[index / 2] : unit_headers[index / 2]
        error_messages << "#{vh} should be in column #{@letters[column]}" if vh != value2compare
        byebug unless error_messages.empty?
      end

      raise StandardError unless error_messages.empty?

      @prefixes = value_prefixes
    end

    def check_wells
      positions_check = ('A'..'H').map { |lttr| (1..12).map { |nmbr| ["#{lttr}#{nmbr}"] } }.flatten
      wells = xlsx.column(1).drop(1)

      positions_check.each_with_index do |position, index|
        error_messagers << "Well #{position} is missing or at wrong position." if position != wells[index]
        byebug unless error_messages.empty?
      end

      raise StandardError unless error_messages.empty?
    end

    def import_data
      ActiveRecord::Base.transaction do
        @rows.map.with_index do |row, index|
          position_x = index % 12 + 1
          position_y = index / 12 + 1
          expected_position = "#{@letters[position_y - 1]}#{position_x}"

          @error_messages << "Error. Position #{row[@position_index]} is faulty." if row[@position_index] != expected_position
          raise StandardError unless error_messages.empty?

          sample_id = row[@sample_index]

          tuples = row[@readout_index..@readout_index + @prefixes.count * 2 - 1].each_slice(2).to_a
          readouts = tuples.map { |values| Hash[[%w[value unit], values].transpose].symbolize_keys }

          well = Well.find_or_create_by!(
            wellplate_id: @wellplate.id,
            position_x: position_x,
            position_y: position_y
          )

          well.update_attributes!(
            sample_id: sample_id,
            readouts: readouts
          )
        end

        @wellplate.update_attributes!(readout_titles: prefixes)
      end
    end

    def error_object
      { status: 'invalid',
        message: error_messages,
        data: [] }
    end

    def warning
      { status: 'warning',
        message: error_messages,
        data: error_messages }
    end

    def success
      { status: 'ok',
        message: '',
        data: processed }
    end
  end
end

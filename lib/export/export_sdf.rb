# frozen_string_literal: true

require 'export_table'

module Export
  class ExportSdf < ExportTable
    EXCLUDED_COLUMNS = [
      'image', 'description', 'r description', 'molfile'
    ].freeze

    def initialize(**args)
      @t = args[:time] || Time.now.to_i
      @xfile = {}
    end

    def generate_sheet_with_samples(table, samples = nil)
      @samples = samples
      return if samples.nil? # || samples.count.zero?
      generate_headers(table, EXCLUDED_COLUMNS)
      @xfile[table] = Tempfile.new(["#{table}s_#{@t}_", '.sdf'], encoding: 'utf-8')
      samples.each do |sample|
        filtered_sample = filter_with_permission_and_detail_level(sample)
        @xfile[table].write(filtered_sample) if filtered_sample
      end
      set_extension
    end

    def read
      return nil if @xfile.size.zero?
      file = stream_data
      file.rewind
      file.read
    end

    private

    def filter_with_permission_and_detail_level(sample)
      if sample['shared_sync'] == 'f' || sample['shared_sync'] == false
        data = validate_molfile(sample['molfile'])
        return nil unless data.presence
        data += "\n"

        @headers.each do |column|
          column_data = format_field(column, sample[column])
          data.concat(column_data)
        end
      else
        # return no data if molfile not allowed
        return nil if sample['dl_s'].zero?

        data = validate_molfile(sample['molfile'])
        return nil unless data.presence
        data += "\n"

        dl = sample['dl_wp'] || sample['dl_r'] || 0
        # NB: as of now , only dl 0 and 10 are implemented
        dl = 10 if dl.positive?
        headers = instance_variable_get("headers#{sample['dl_s']}#{dl}")
        headers.each do |column|
          next unless column
          column_data = format_field(column, sample[column])
          data.concat(column_data)
        end
      end
      data.concat("\n\$\$\$\$\n")
    end

    def format_field(column, raw_value)
      field = column.gsub(/\s+/, '_').upcase
      value = validate_value(raw_value)
      ">  <#{field}>\n#{value}\n\n"
    end

    def validate_molfile(molfile)
      molfile.to_s =~ /^\$\$\$\$/
      $` || molfile
    end

    def validate_value(value)
      return "_ #{value}" if value.to_s.start_with?('>', '$', '<')
      value.to_s
    end

    def set_extension
      @file_extension = @xfile.size == 1 ? 'sdf' : 'zip'
    end

    def stream_data
      return @xfile.first[1] if @xfile.size == 1
      Zip::OutputStream.write_buffer do |zip|
        @xfile.each_pair do |table, file|
          next unless file
          file.rewind
          zip.put_next_entry "#{table}s_#{@t}_.sdf"
          zip.write file.read
          file.close
          file.unlink
          @xfile[table] = nil
        end
      end
    end
  end
end

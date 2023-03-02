# frozen_string_literal: true

module Usecases
  module Attachments
    module Converter
      class FileConverter
        require 'mini_magick'

        def create_derivative(tmp_path, original_file, _db_id, result, _record)
          file = MiniMagick::Image.open(tmp_path)
          file.format('png')
          conversion_file_name = "#{File.basename(original_file)}.conversion.png"
          conversion_path = "#{Pathname.new(tmp_path).dirname}/#{conversion_file_name}"
          file.write(conversion_path)
          result[:conversion] = File.open(conversion_path, 'rb')
          result
        end

        def create_converted_file(original_file_path)
          create_derivative(original_file_path, original_file_path, nil, {}, nil)
        end
      end
    end
  end
end

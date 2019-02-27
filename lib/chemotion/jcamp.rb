# frozen_string_literal: true

require 'net/http'

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # Gen module
    module Gen
      def self.filename(filename_parts, addon = 'peak', target_ext = nil)
        ext = target_ext || filename_parts[-1]
        idx = %w[edit peak].include?(filename_parts[-2]) ? -2 : -1
        parts = filename_parts[0...idx] + [addon, ext]
        parts.join('.')
      end
    end
  end
end

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # Gen module
    module Util
      def self.generate_tmp_file(content, ext = nil, binmode = false)
        fname = ext == 'png' ? ['jcamp', '.png'] : ['jcamp']
        integration = Tempfile.new(fname)
        integration.binmode if binmode
        integration.write(content)
        integration.rewind
        integration
      end

      def self.extract_ext(entry)
        entry.name.split('.')[-1]
      end

      def self.extract_zip(rsp_io)
        tmp_jcamp = nil
        tmp_img = nil
        Zip::InputStream.open(rsp_io) do |io|
          while (entry = io.get_next_entry)
            ext = extract_ext(entry)
            data = entry.get_input_stream.read.force_encoding('UTF-8')
            if %w[png].include?(ext)
              tmp_img = generate_tmp_file(data, ext)
            elsif %w[dx DX jdx JDX jcamp JCAMP].include?(ext)
              tmp_jcamp = generate_tmp_file(data, ext)
            end
          end
        end
        [tmp_jcamp, tmp_img]
      end
    end
  end
end

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # Create module
    module Create
      include HTTParty

      def self.build_body(f, peaks_str = false, shift = false)
        body = {
          multipart: true,
          file: f
        }
        body[:peaks_str] = peaks_str if peaks_str
        if shift
          body[:shift_select_x] = shift[:select_x]
          body[:shift_ref_name] = shift[:ref_name]
          body[:shift_ref_value] = shift[:ref_value]
        end
        body
      end

      def self.stub_http(path, peaks_str = false, shift = false)
        response = nil
        url = Rails.configuration.spectra.url
        port = Rails.configuration.spectra.port
        File.open(path, 'r') do |f|
          body = build_body(f, peaks_str, shift)
          response = HTTParty.post(
            "http://#{url}:#{port}/zip_jcamp_n_img",
            body: body
          )
        end
        response
      end

      def self.to_coord_string(peaks)
        peaks.map { |p| "#{p[:x]},#{p[:y]}" }.join('#')
      end

      def self.spectrum(path, peaks = false, shift = false)
        peaks_str = peaks ? to_coord_string(peaks) : false
        rsp = stub_http(path, peaks_str, shift)
        rsp_io = StringIO.new(rsp.body.to_s)
        Util.extract_zip(rsp_io)
      end
    end
  end
end

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # CreateImg module
    module CreateImg
      include HTTParty

      def self.stub_peak_in_image(path)
        response = nil
        url = Rails.configuration.spectra.url
        port = Rails.configuration.spectra.port
        File.open(path, 'r') do |f|
          response = HTTParty.post(
            "http://#{url}:#{port}/zip_image",
            body: {
              multipart: true,
              file: f
            }
          )
        end
        response
      end

      def self.spectrum_img_gene(path)
        rsp = stub_peak_in_image(path)
        rsp_io = StringIO.new(rsp.body.to_s)
        Util.extract_zip(rsp_io)
      end
    end
  end
end

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # CreateImg module
    module Predict
      include HTTParty

      def self.stub_by_peaks(layout, peaks, molecule)
        url = Rails.configuration.spectra.url
        port = Rails.configuration.spectra.port
        response = HTTParty.post(
          "http://#{url}:#{port}/predict/by_peaks",
          body: {
            layout: layout,
            peaks: peaks,
            molecule: molecule
          }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        )
        response
      end

      def self.by_peaks(layout, peaks, molecule)
        rsp = stub_by_peaks(layout, peaks, molecule)
        rsp.parsed_response
      end
    end
  end
end

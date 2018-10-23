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
            elsif %w[jdx dx].include?(ext)
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

      def self.stub_peak_zip_jcamp_n_img(path)
        response = nil
        url = Rails.configuration.spectra.url
        port = Rails.configuration.spectra.port
        File.open(path, 'r') do |f|
          response = HTTParty.post(
            "http://#{url}:#{port}/peak_zip_jcamp_n_img",
            body: {
              multipart: true,
              file: f
            }
          )
        end
        response
      end

      def self.spectrum_peaks_gene(path)
        rsp = stub_peak_zip_jcamp_n_img(path)
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
    # Create module
    module EditUtil
      def self.generate_peaks_table(peaks)
        content = peaks.map.with_index { |p, idx|
          "(#{p[:x]}, #{p[:y]}, <#{idx + 1}>)"
        }
        content.join("\n")
      end

      def self.block_npoints(peaks)
        "##NPOINTS=#{peaks.length}\n"
      end

      def self.edit_jcamp(peaks, orig_att)
        separator = "$$ --- CHEMSPECTRA EDIT CONTENT ---\n"
        peak_assign = "##PEAK ASSIGNMENTS=(XYA)\n"
        peaks_table = generate_peaks_table(peaks)
        parts = orig_att
                .read_file
                .encode('UTF-8', undef: :replace, replace: '')
                .split(separator)
        content = [
          parts[0], separator, peak_assign,
          peaks_table, "\n", block_npoints(peaks),
          separator, parts[-1]
        ].join('')
        Util.generate_tmp_file(content)
      end
    end
  end
end

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # Create module
    module Edit
      include HTTParty

      def self.stub_peak_in_img(path)
        response = nil
        url = Rails.configuration.spectra.url
        port = Rails.configuration.spectra.port
        File.open(path, 'r') do |f|
          response = HTTParty.post(
            "http://#{url}:#{port}/peak_in_image",
            body: {
              multipart: true,
              file: f
            }
          )
        end
        response
      end

      def self.edit_img(tmp_jcamp)
        rsp = stub_peak_in_img(tmp_jcamp.path)
        rsp_io = StringIO.new(rsp.body.to_s)
        Util.extract_zip(rsp_io)[1]
      end

      def self.spectrum_peaks_edit(peaks, orig_att)
        tmp_jcamp = EditUtil.edit_jcamp(peaks, orig_att)
        tmp_img = edit_img(tmp_jcamp)
        [tmp_jcamp, tmp_img]
      end
    end
  end
end

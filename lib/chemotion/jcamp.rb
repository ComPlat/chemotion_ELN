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
            elsif %w[dx jdx jcamp mzml raw cdf zip].include?(ext.downcase)
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

      def self.build_body(
        file, molfile, is_regen = false, params = {}
      )
        clear = true if false
        {
          multipart: true,
          file: file,
          molfile: molfile,
          clear: clear,
          mass: params[:mass],
          scan: params[:scan],
          thres: params[:thres],
          ext: params[:ext],
          shift_select_x: params[:shift_select_x],
          shift_ref_name: params[:shift_ref_name],
          shift_ref_value: params[:shift_ref_value],
          peaks_str: params[:peaks_str],
          integration: params[:integration],
          multiplicity: params[:multiplicity],
          fname: params[:fname] || (params[:file] && params[:file].try(:[], :filename)),
        }
      end

      def self.stub_http(
        file_path, mol_path, is_regen = false, params = {}
      )
        response = nil
        url = Rails.configuration.spectra.url
        port = Rails.configuration.spectra.port
        File.open(file_path, 'r') do |file|
          File.open(mol_path, 'r') do |molfile|
            body = build_body(file, molfile, is_regen, params)
            response = HTTParty.post(
              "http://#{url}:#{port}/zip_jcamp_n_img",
              body: body,
              timeout: 120
            )
          end
        end
        response
      end

      def self.spectrum(
        file_path, mol_path, is_regen = false, params = {}
      )
        rsp = stub_http(file_path, mol_path, is_regen, params)
        rsp_io = StringIO.new(rsp.body.to_s)
        spc_type = JSON.parse(rsp.headers['x-extra-info-json'])['spc_type']
        Util.extract_zip(rsp_io) << spc_type
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
    # Predict module
    module Predict
      # NmrPeaksForm module
      module NmrPeaksForm
        include HTTParty

        def self.build_body(molfile, layout, peaks, shift, spectrum)
          {
            multipart: true,
            molfile: molfile,
            layout: layout,
            peaks: peaks,
            shift: shift,
            spectrum: spectrum
          }
        end

        def self.stub_request(molfile, layout, peaks, shift, spectrum)
          response = nil
          url = Rails.configuration.spectra.url
          port = Rails.configuration.spectra.port
          File.open(molfile.path, 'r') do |file|
            body = build_body(file, layout, peaks, shift, spectrum)
            response = HTTParty.post(
              "http://#{url}:#{port}/predict/by_peaks_form",
              body: body
            )
          end
          response
        end

        def self.exec(molfile, layout, peaks, shift, spectrum)
          rsp = stub_request(molfile, layout, peaks, shift, spectrum)
          rsp.code == 200 ? rsp.parsed_response : nil
        end
      end

      # Ir module
      module Ir
        include HTTParty

        def self.build_body(molfile, spectrum)
          {
            multipart: true,
            molfile: molfile,
            spectrum: spectrum
          }
        end

        def self.stub_request(molfile, spectrum)
          response = nil
          url = Rails.configuration.spectra.url
          port = Rails.configuration.spectra.port
          File.open(molfile.path, 'r') do |f_molfile|
            File.open(spectrum.path, 'r') do |f_spectrum|
              body = build_body(f_molfile, f_spectrum)
              response = HTTParty.post(
                "http://#{url}:#{port}/predict/infrared",
                body: body
              )
            end
          end
          response
        end

        def self.exec(molfile, spectrum)
          rsp = stub_request(molfile, spectrum)
          rsp.code == 200 ? rsp.parsed_response : nil
        end
      end

      # MS module
      module MS
        include HTTParty

        def self.build_body(molfile, spectrum)
          {
            multipart: true,
            molfile: molfile,
            spectrum: spectrum
          }
        end

        def self.stub_request(molfile, spectrum)
          response = nil
          url = Rails.configuration.spectra.url
          port = Rails.configuration.spectra.port
          File.open(molfile.path, 'r') do |f_molfile|
            File.open(spectrum.path, 'r') do |f_spectrum|
              body = build_body(f_molfile, f_spectrum)
              response = HTTParty.post(
                "http://#{url}:#{port}/predict/ms",
                body: body
              )
            end
          end
          response
        end

        def self.exec(molfile, spectrum)
          rsp = stub_request(molfile, spectrum)
          rsp.code == 200 ? rsp.parsed_response : nil
        end
      end
    end
  end
end

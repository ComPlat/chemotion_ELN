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
        if addon == ''
          parts = filename_parts[0...idx] + [ext]
        end
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
        # fname = ext == 'png' ? ['jcamp', '.png'] : ['jcamp']
        fname = ['jcamp']
        if ext == 'png'
          fname = ['jcamp', '.png']
        elsif ext == 'csv'
          fname = ['jcamp', '.csv']
        end
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
        arr_jcamp = []
        arr_img = []
        arr_csv = []
        arr_nmrium = []
        Zip::InputStream.open(rsp_io) do |io|
          while (entry = io.get_next_entry)
            ext = extract_ext(entry)
            data = entry.get_input_stream.read.force_encoding('UTF-8')
            if %w[png].include?(ext)
              tmp_img = generate_tmp_file(data, ext)
              arr_img.push(tmp_img)
            elsif %w[dx jdx jcamp mzml raw cdf zip].include?(ext.downcase)
              tmp_jcamp = generate_tmp_file(data, ext)
              arr_jcamp.push(tmp_jcamp)
            elsif %w[csv].include?(ext)
              tmp_csv = generate_tmp_file(data, ext)
              arr_csv.push(tmp_csv)
            elsif %w[nmrium].include?(ext)
              tmp_nmrium = generate_tmp_file(data, ext)
              arr_nmrium.push(tmp_nmrium)
            end
          end
        end
        tmp_jcamp = arr_jcamp.first
        tmp_img = arr_img.first
        # check if we have a combined image of multiple spectra
        if arr_img.count > arr_jcamp.count
          tmp_img = arr_img.last
        end
        [tmp_jcamp, tmp_img, arr_jcamp, arr_img, arr_csv, arr_nmrium]
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
          molfile: molfile.size > 10 ? molfile : false,
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
          wave_length: params[:wave_length],
          cyclic_volta: params[:cyclicvolta],
          jcamp_idx: params[:curve_idx],
          simulatenmr: params[:simulatenmr],
        }
      end

      def self.stub_http(
        file_path, mol_path, is_regen = false, params = {}
      )
        response = nil
        url = Rails.configuration.spectra.chemspectra.url
        api_endpoint = "#{url}/zip_jcamp_n_img"

        File.open(file_path, 'r') do |file|
          File.open(mol_path, 'r') do |molfile|
            body = build_body(file, molfile, is_regen, params)
            response = HTTParty.post(
              api_endpoint,
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
        begin
          json_rsp = JSON.parse(rsp.to_s)
        rescue
          #cannot parse response from json, return as normal
          rsp_io = StringIO.new(rsp.body.to_s)
          spc_type = JSON.parse(rsp.headers['x-extra-info-json'])['spc_type']
          invalid_molfile = JSON.parse(rsp.headers['x-extra-info-json'])['invalid_molfile']
          extracted_array = Util.extract_zip(rsp_io)
          extracted_array << spc_type
          extracted_array << invalid_molfile
        else
          if json_rsp['invalid_molfile'] == true
            [json_rsp, nil, nil]
          else
            rsp_io = StringIO.new(rsp.body.to_s)
            spc_type = JSON.parse(rsp.headers['x-extra-info-json'])['spc_type']
            invalid_molfile = JSON.parse(rsp.headers['x-extra-info-json'])['invalid_molfile']
            extracted_array = Util.extract_zip(rsp_io)
            extracted_array << spc_type
            extracted_array << invalid_molfile
          end
        end
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
        url = Rails.configuration.spectra.chemspectra.url
        api_endpoint = "#{url}/zip_image"
        
        File.open(path, 'r') do |f|
          response = HTTParty.post(
            api_endpoint,
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

    # Combine multiple jcamps in one image
    module CombineImg
      include HTTParty

      def self.stub_request(files, curve_idx, list_file_names)
        response = nil
        url = Rails.configuration.spectra.chemspectra.url
        api_endpoint = "#{url}/combine_images"

        files_to_read = files.map{ |fname| File.open(fname) }
        begin
          response = HTTParty.post(
            api_endpoint,
            body: {
              multipart: true,
              files: files_to_read,
              jcamp_idx: curve_idx,
              list_file_names: list_file_names
            }
          )
        ensure
          files_to_read.each(&:close)
        end
        response
      end

      def self.combine(files, curve_idx, list_file_names)
        rsp = stub_request(files, curve_idx, list_file_names)
        unless rsp.code != 200
          rsp_io = StringIO.new(rsp.body.to_s)
          Util.extract_zip(rsp_io)
        else
          nil
        end
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
          url = Rails.configuration.spectra.chemspectra.url
          api_endpoint = "#{url}/predict/by_peaks_form"
          
          File.open(molfile.path, 'r') do |file|
            body = build_body(file, layout, peaks, shift, spectrum)
            response = HTTParty.post(
              api_endpoint,
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
          url = Rails.configuration.spectra.chemspectra.url
          api_endpoint = "#{url}/predict/infrared"

          File.open(molfile.path, 'r') do |f_molfile|
            File.open(spectrum.path, 'r') do |f_spectrum|
              body = build_body(f_molfile, f_spectrum)
              response = HTTParty.post(
                api_endpoint,
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
          url = Rails.configuration.spectra.chemspectra.url
          api_endpoint = "#{url}/predict/ms"

          File.open(molfile.path, 'r') do |f_molfile|
            File.open(spectrum.path, 'r') do |f_spectrum|
              body = build_body(f_molfile, f_spectrum)
              response = HTTParty.post(
                api_endpoint,
                body: body,
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

# Chemotion module
module Chemotion
  # process Jcamp files
  module Jcamp
    # Generate Jcamp files module
    module RegenerateJcamp
      include HTTParty

      def self.build_body(
        file, molfile
      )
        {
          multipart: true,
          file: file,
          molfile: molfile.size > 10 ? molfile : false,
          simulatenmr: true,
        }
      end

      def self.stub_http(
        file_path, mol_path
      )
        response = nil
        url = Rails.configuration.spectra.chemspectra.url
        api_endpoint = "#{url}/zip_jcamp_n_img"

        File.open(file_path, 'r') do |file|
          File.open(mol_path, 'r') do |molfile|
            body = build_body(file, molfile)
            response = HTTParty.post(
              api_endpoint,
              body: body,
              timeout: 120,
            )
          end
        end
        response
      end

      def self.spectrum(
        file_path, mol_path
      )
        rsp = stub_http(file_path, mol_path)
        rsp.code == 200 ? rsp.parsed_response : nil
      end
    end
  end
end

# Chemotion module
module Chemotion
  # process NMRium files
  module Jcamp
    # CreateFromNMRium module
    module CreateFromNMRium
      include HTTParty

      def self.convert_nmrium_data(path)
        response = nil
        url = Rails.configuration.spectra.chemspectra.url
        api_endpoint = "#{url}/nmrium"

        File.open(path, 'r') do |f|
          response = HTTParty.post(
            api_endpoint,
            body: {
              multipart: true,
              file: f,
            },
          )
        end
        response
      end

      def self.jcamp_from_nmrium(path)
        rsp = convert_nmrium_data(path)
        unless rsp.nil? || rsp.code != 200
          tmp_jcamp = Util.generate_tmp_file(rsp.body.to_s)
          tmp_jcamp
        else
          nil
        end
      end
    end
  end
end

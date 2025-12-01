# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength

# Belong to Chemotion module
module Chemotion
  # API for ChemSpectra manipulation
  class ChemSpectraAPI < Grape::API
    format :json

    helpers do # rubocop:disable BlockLength
      def encode64(path)
        target = File.exist?(path) && IO.binread(path) || false
        Base64.encode64(target)
      end

      def to_zip_file(filename, src, dst, img, predict)
        Zip::OutputStream.write_buffer do |zip|
          zip.put_next_entry "orig_#{src[:filename]}"
          zip.write src[:tempfile].read
          zip.put_next_entry "#{filename}.jdx"
          zip.write dst.read
          zip.put_next_entry "#{filename}.png"
          zip.write img.read
          unless predict.try(:[], 'output')
                        .try(:[], 'result').try(:empty?)
            zip.put_next_entry "#{filename}.json"
            zip.write predict.to_json
          end
        end
      end

      def get_molfile(params)
        if params[:molfile].is_a? String
          params[:molfile] = { tempfile: Tempfile.new }
        end
        params[:molfile][:tempfile]
      end

      def conversion(params)
        file = params[:file][:tempfile]
        molfile = get_molfile(params)
        tmp_jcamp, tmp_img = Chemotion::Jcamp::Create.spectrum(
          file.path, molfile.path, false, params
        ) # abs_path, is_regen, peaks, shift
        jcamp = encode64(tmp_jcamp.path)
        img = encode64(tmp_img.path)
        { status: true, jcamp: jcamp, img: img }
      rescue
        { status: false }
      end

      def convert_to_zip(params)
        file = params[:dst][:tempfile]
        molfile = get_molfile(params)
        jcamp, img = Chemotion::Jcamp::Create.spectrum(
          file.path, molfile.path, false, params
        )
        predict = JSON.parse(params['predict'])
        to_zip_file(params[:filename], params[:src], jcamp, img, predict)
      rescue
        error!('Save files error!', 500)
      end

      def convert_for_refresh(params)
        file = params[:dst][:tempfile]
        molfile = get_molfile(params)
        tmp_jcamp, tmp_img = Chemotion::Jcamp::Create.spectrum(
          file.path, molfile.path, false, params
        )
        jcamp = encode64(tmp_jcamp.path)
        img = encode64(tmp_img.path)
        { status: true, jcamp: jcamp, img: img }
      rescue
        { status: false }
      end

      def raw_file(att)
        begin
          Base64.encode64(att.read_file)
        rescue StandardError
          nil
        end
      end

      def compare_data_type_mapping(response) # rubocop:disable Metrics/AbcSize
        default_data_types = JSON.parse(response.body)
        file_path = Rails.configuration.path_spectra_data_type

        current_data_types = {}
        current_data_types = JSON.parse(File.read(file_path)) if File.exist?(file_path)

        keys_to_check = default_data_types['datatypes'].keys
        result = {
          'default_data_types' => {},
          'current_data_types' => {},
        }
        keys_to_check.each do |key|
          current_values = current_data_types['datatypes'][key] || [] if current_data_types != {}
          default_values = default_data_types['datatypes'][key] || []

          if current_values.nil?
            current_data_types = default_data_types
            result['current_data_types'][key] = default_values
          else
            merged_values = (current_values | default_values).uniq
            current_data_types['datatypes'][key] = merged_values
            result['current_data_types'][key] = merged_values
          end

          result['default_data_types'][key] = default_values
        end
        save_data_types(file_path, current_data_types)
        result
      end

      def save_data_types(file_path, current_data_types)
        File.write(file_path, JSON.pretty_generate(current_data_types))
      end
    end

    resource :chemspectra do # rubocop:disable BlockLength
      resource :file do
        desc 'Convert file'
        params do
          requires :file, type: Hash
          requires :mass, type: String
          optional :molfile
        end
        post 'convert' do
          conversion(params)
        end

        desc 'Save files'
        params do
          requires :src, type: Hash
          requires :dst, type: Hash
          requires :filename, type: String
          requires :peaks_str, type: String
          requires :shift_select_x, type: String
          requires :shift_ref_name, type: String
          requires :shift_ref_value, type: String
          optional :integration, type: String
          optional :multiplicity, type: String
          optional :mass, type: String
          optional :scan, type: String
          optional :thres, type: String
          optional :predict, type: String
          optional :molfile
          optional :waveLength, type: String
          optional :cyclicvolta, type: String
          optional :curveIdx, type: Integer
        end
        post 'save' do
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = CGI.escape("#{params[:filename]}.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")

          zip_io = convert_to_zip(params)
          zip_io.rewind
          zip_io.read
        end

        desc 'Refresh files'
        params do
          requires :src, type: Hash
          requires :dst, type: Hash
          requires :molfile, type: Hash
          requires :filename, type: String
          requires :peaks_str, type: String
          requires :shift_select_x, type: String
          requires :shift_ref_name, type: String
          requires :shift_ref_value, type: String
          optional :integration, type: String
          optional :multiplicity, type: String
          optional :mass, type: String
          optional :scan, type: String
          optional :thres, type: String
          optional :predict, type: String
        end
        post 'refresh' do
          convert_for_refresh(params)
        end

        desc 'Combine spectra'
        params do
          requires :spectra_ids, type: [Integer]
          requires :front_spectra_idx, type: Integer # index of front spectra
          requires :container_id, type: Integer
          optional :extras, type: String
        end
        post 'combine_spectra' do
          pm = to_rails_snake_case(params)

          list_file = []
          list_file_names = []
          target_container_id = pm[:container_id]

          if pm[:extras].present?
            extras = JSON.parse(pm[:extras])
            if extras['deleted_attachment_ids'].present?
              Attachment.where(id: extras['deleted_attachment_ids']).destroy_all
            end
          end

          target_container = Container.find_by(id: target_container_id)
          if target_container
            dataset_name = "Comparison #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"
            dataset_container = Container.create(
              name: dataset_name,
              container_type: 'dataset',
              parent_id: target_container.id
            )
            target_container_id = dataset_container.id
          end
          
          new_attachment_ids = []
          
          tempfiles = []
          Attachment.where(id: pm[:spectra_ids]).each do |att|
            next unless att.attachment.present?

            list_file_names.push(att.filename)
            
            tempfile = att.attachment.download
            tempfiles << tempfile
            list_file.push(tempfile.path)

            base = File.basename(att.filename, '.*')
            base_no_compared = base.sub(/_compared_\d{8,14}\z/, '')
            new_filename = "#{base_no_compared}_#{Time.now.strftime('compared_%Y%m%d%H%M%S')}#{File.extname(att.filename)}"

            new_att = Attachment.new(
              filename: new_filename,
              created_by: current_user.id,
              created_for: current_user.id,
              attachable_type: 'Container',
              attachable_id: target_container_id
            )
            
            new_att.file_path = tempfile.path
            new_att.save!
            new_attachment_ids << new_att.id
          end

          _, image = Chemotion::Jcamp::CombineImg.combine(
            list_file, pm[:front_spectra_idx], list_file_names, pm[:extras]
          )

          content_type('application/json')
          unless image.nil?
            combined_image_filename = "combined_#{Time.now.strftime('compared_%Y%m%d%H%M')}.png"
            
            existing_att = Attachment.find_by(filename: combined_image_filename, attachable_id: target_container_id)
            existing_att.destroy! if existing_att.present?

            att = Attachment.new(
              filename: combined_image_filename,
              created_by: current_user.id,
              created_for: current_user.id,
              file_path: image.path,
              attachable_type: 'Container',
              attachable_id: target_container_id,
            )
            att.save!
            new_attachment_ids << att.id
          end
          
          tempfiles.each do |tf|
            tf.close
            tf.unlink
          end

          dataset = Container.find_by(id: target_container_id)
          dataset_json = dataset ? dataset.as_json(include: :attachments) : nil
          { status: true, new_attachment_ids: new_attachment_ids, dataset_id: target_container_id, dataset: dataset_json }
        rescue StandardError => e
          Rails.logger.error "Error in combine_spectra: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
          error!({ error: 'Server Error', message: e.message }, 500)
        end
      end

      resource :predict do
        desc 'Predict NMR by peaks'
        params do
          requires :molfile, type: Hash
          requires :layout, type: String
          requires :peaks, type: String
          requires :shift, type: String
        end
        post 'nmr_peaks_form' do
          molfile = params['molfile']['tempfile']
          rsp = Chemotion::Jcamp::Predict::NmrPeaksForm.exec(
            molfile, params[:layout], params[:peaks], params[:shift], false
          )

          content_type('application/json')
          rsp
        end

        desc 'Predict IR'
        params do
          requires :molfile, type: Hash
          requires :spectrum, type: Hash
        end
        post 'infrared' do
          molfile = params['molfile']['tempfile']
          spectrum = params['spectrum']['tempfile']
          rsp = Chemotion::Jcamp::Predict::Ir.exec(
            molfile, spectrum
          )

          content_type('application/json')
          rsp
        end
      end

      resource :molfile do
        desc 'convert molfile'
        params do
          requires :molfile, type: Hash
        end
        post 'convert' do
          molfile = params['molfile']['tempfile'].read
          m = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)

          content_type('application/json')
          { smi: m[:smiles], mass: m[:mass], svg: m[:svg], status: true }
        end
      end

      resource :spectra_layouts do
        desc 'Get all spectra layouts and data types'
        get do
          url = Rails.configuration.spectra.chemspectra.url
          if url
            api_endpoint = "#{url}/api/v1/chemspectra/spectra_layouts"
            response = HTTParty.get(api_endpoint)
            case response.code
            when 404
              error_message = 'API endpoint not found'
              error!(error_message, 404)
            when 200
              data_types = compare_data_type_mapping(response)
              data_types
            end
          end
        end
      end

      resource :nmrium_wrapper do
        desc 'Return url of nmrium wrapper'
        route_param :host_name do
          get do
            nmrium_url = Rails.configuration.spectra.nmriumwrapper.url
            { nmrium_url: nmrium_url }
          end
        end
      end
    end
  end
end

# rubocop:enable Metrics/ClassLength

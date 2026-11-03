# frozen_string_literal: true

# Belong to Chemotion module
module Chemotion
  # API for ChemSpectra manipulation
  class ChemSpectraAPI < Grape::API
    format :json

    helpers do
      def encode64(path)
        target = File.exist?(path) && IO.binread(path) || false
        Base64.encode64(target)
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

      # Replaces the combined-spectra image of a container. The container row is locked so
      # concurrent combines do not each add an image, and the new attachment is saved before the
      # old one is destroyed. The transaction covers the rows only: stored files are written and
      # removed by attachment callbacks.
      #
      # @param container_id [Integer] id of the dataset container holding the spectra
      # @param filename [String] the combined image's filename (+<container>.new_combined.png+)
      # @param image [Tempfile] the rendered image
      # @return [Attachment] the new combined image
      def replace_combined_image(container_id, filename, image)
        ActiveRecord::Base.transaction do
          Container.lock.find(container_id)
          old = Attachment.find_by(
            filename: filename, attachable_type: 'Container', attachable_id: container_id,
          )
          att = Attachment.create!(
            filename: filename,
            created_by: current_user.id,
            created_for: current_user.id,
            file_path: image.path,
            attachable_type: 'Container',
            attachable_id: container_id,
          )
          old&.destroy!
          att
        end
      end

      def compare_data_type_mapping(response) # rubocop:disable Metrics/AbcSize
        default_data_types = JSON.parse(response.body)
        file_path = Rails.configuration.path_spectra_data_type

        current_data_types = {}
        current_data_types = JSON.parse(File.read(file_path)) if File.exist?(file_path)
        stored_data_types = current_data_types.deep_dup

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
        save_data_types(file_path, current_data_types, stored_data_types)
        result
      end

      # Writes the merged data types, unless they equal what was read from the file.
      def save_data_types(file_path, current_data_types, stored_data_types)
        return if current_data_types == stored_data_types

        File.write(file_path, JSON.pretty_generate(current_data_types))
      end
    end

    resource :chemspectra do
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

        desc 'Combine spectra'
        params do
          requires :spectra_ids, type: [Integer]
          requires :front_spectra_idx, type: Integer # index of front spectra
          optional :extras, type: String
        end
        post 'combine_spectra' do
          pm = to_rails_snake_case(params)

          front_id = pm[:spectra_ids][pm[:front_spectra_idx]]
          ids = pm[:spectra_ids].uniq
          # keep the request order, and skip spectra deleted since the client listed them (a save
          # can replace related edit files); the combined image goes to the last spectrum's container
          spectra = Attachment.where(id: ids, attachable_type: 'Container').index_by(&:id).values_at(*ids).compact
          error!('404 Not Found', 404) if spectra.empty?

          target = spectra.last
          access = Usecases::Attachments::Access.new(current_user)
          error!('401 Unauthorized', 401) unless spectra.all? { |att| access.read?(att) } && access.write?(target)
          error!('Spectra must belong to an analysis', 422) if target.attachable_id.nil?

          front_idx = spectra.index { |att| att.id == front_id } || 0
          _, image = Chemotion::Jcamp::CombineImg.combine(
            spectra.map(&:abs_path), front_idx, spectra.map(&:filename), pm[:extras]
          )

          content_type('application/json')
          unless image.nil?
            replace_combined_image(
              target.attachable_id, "#{target.container.name}.new_combined.png", image
            )
          end

          { status: true }
        end
      end

      resource :spectra_layouts do
        before do
          error!('401 Unauthorized', 401) unless current_user.is_a?(Admin)
        end

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

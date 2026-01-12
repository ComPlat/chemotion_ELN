# frozen_string_literal: true

# rubocop: disable Style/MultilineIfModifier

module Chemotion
  class ProfileLayoutHash < Grape::Validations::Validators::Base
    def validate_param!(attr_name, params)
      raise Grape::Exceptions::Validation, params: [@scope.full_name(attr_name)],
                                           message: 'has too many entries' if params[attr_name].keys.size > 100
      params[attr_name].each do |key, val|
        raise(Grape::Exceptions::Validation, params: [@scope.full_name(attr_name)],
                                             message: 'has wrong structure') unless /\A[\w ()\-]+\Z/.match?(key.to_s)
        raise(Grape::Exceptions::Validation, params: [@scope.full_name(attr_name)],
                                             message: 'has wrong structure') unless /\d+/.match?(val.to_s)
      end
    end
  end

  # rubocop: disable Metrics/ClassLength
  class ProfileAPI < Grape::API
    resource :profiles do
      desc 'Return the profile of the current_user'
      get do
        profile = current_user.profile
        data = profile.data || {}
        layout = {}
        layout = Rails.configuration.profile_default&.layout if Rails.configuration.respond_to?(:profile_default)
        templates_list = []

        layout&.each_key do |ll|
          data[ll.to_s] = layout[ll] if layout[ll].present? && data[ll.to_s].nil?
        end

        layout&.fetch(:layout, {})&.each do |element, sorting|
          data['layout'][element.to_s] = sorting if data['layout'][element.to_s].nil?
        end

        if current_user.matrix_check_by_name('genericElement')
          available_elements = Labimotion::ElementKlass.where(is_active: true).pluck(:name)
          new_layout = data['layout'] || {}
          Labimotion::ElementKlass.where(is_active: true).find_each do |el|
            if data['layout'] && data['layout'][el.name.to_s].nil?
              new_layout[el.name.to_s] = new_layout&.values&.min&.negative? ? new_layout.values.min - 1 : -1
            end
          end
          new_layout = new_layout.select { |e| available_elements.include?(e) }
          sorted_layout = {}
          new_layout.select { |_k, v| v.positive? }
                    .sort_by { |_k, v| v }
                    .each_with_index { |k, i| sorted_layout[k[0]] = i + 1 }
          new_layout.select { |_k, v| v.negative? }
                    .sort_by { |_k, v| -v }
                    .each_with_index { |k, i| sorted_layout[k[0]] = (i + 1) * -1 }
          data[:layout] = sorted_layout
        end

        data.each_key do |dt|
          sorted_layout = {}
          next if dt[0..6] != 'layout_'

          next if data[dt].blank?

          old_layout = data[dt]
          old_layout&.select { |_k, v| v.positive? }
                    &.sort_by { |_k, v| v }
                    &.each_with_index { |k, i| sorted_layout[k[0]] = i + 1 }
          old_layout&.select { |_k, v| v.negative? }
                    &.sort_by { |_k, v| -v }
                    &.each_with_index { |k, i| sorted_layout[k[0]] = (i + 1) * -1 }
          data[dt] = sorted_layout
        end

        folder_path = "user_templates/#{current_user.id}"
        user_templates_path = Rails.root.join('uploads', Rails.env, folder_path)
        Dir.glob("#{user_templates_path}/*.txt") do |file|
          next unless file

          if File.file?(file)
            content = File.read(file)
            content = JSON(content)
            content['props']['path'] = file
            templates_list.push(content)
          end
        end

        {
          data: data,
          show_external_name: profile.show_external_name,
          show_sample_name: profile.show_sample_name,
          show_sample_short_label: profile.show_sample_short_label,
          curation: profile.curation,
          user_templates: templates_list,
        }
      end

      desc 'update user profile'
      params do
        optional :data, type: Hash, default: {} do
          optional :layout, type: Hash, profile_layout_hash: true
          optional :layout_detail_research_plan, type: Hash, profile_layout_hash: true
          optional :layout_detail_reaction, type: Hash, profile_layout_hash: true
          optional :layout_detail_sample, type: Hash, profile_layout_hash: true
          optional :layout_detail_wellplate, type: Hash, profile_layout_hash: true
          optional :layout_detail_screen, type: Hash, profile_layout_hash: true
          optional :layout_detail_device_description, type: Hash, profile_layout_hash: true
          optional :layout_detail_vessel, type: Hash, profile_layout_hash: true
          optional :export_selection, type: Hash do
            optional :sample, type: [Boolean]
            optional :reaction, type: [Boolean]
            optional :wellplate, type: [Boolean]
          end
          optional :computed_props, type: Hash do
            optional :graph_templates, type: [Hash]
            optional :cur_template_idx, type: Integer
          end
          optional :default_structure_editor, type: String
          optional :filters, type: Hash
          optional :inbox_auto, type: Boolean
          optional :inbox_manual, type: Boolean
        end
        optional :show_external_name, type: Boolean
        optional :show_sample_name, type: Boolean
        optional :show_sample_short_label, type: Boolean
        optional :curation, type: Integer, default: 2
      end
      put do
        declared_params = declared(params, include_missing: false)
        available_ements = API::ELEMENTS + Labimotion::ElementKlass.where(is_active: true).pluck(:name)
        # Find not declared generic layout details
        generic_layouts = params[:data].select do |key, _|
          key.to_s.match(/^layout_detail_.+/) && !declared_params[:data].key?(key)
        end
        generic_layouts = generic_layouts.select do |key, _|
          available_ements.include? key.delete_prefix('layout_detail_')
        end
        # Set not declared generic layout details as declared
        declared_params[:data] = declared_params[:data].merge(generic_layouts)

        data = current_user.profile.data || {}
        data['layout'] ||= {
          'sample' => 1,
          'reaction' => 2,
          'wellplate' => 3,
          'screen' => 4,
          'research_plan' => 5,
          'cell_line' => -1000,
          'device_description' => -1100,
          'sequence_based_macromolecule_sample' => -1200,
          'vessel' => -1300,
        }

        layout = data['layout'].select { |e| available_ements.include?(e) }
        data['layout'] = layout.sort_by { |_k, v| v }.to_h
        if data['default_structure_editor'].nil? || data['default_structure_editor'] =~ /ketcher/i
          data['default_structure_editor'] = 'ketcher'
        end
        new_profile = {
          data: data.deep_merge(declared_params[:data] || {}),
          show_external_name: declared_params[:show_external_name],
          show_sample_name: declared_params[:show_sample_name],
          show_sample_short_label: declared_params[:show_sample_short_label],
          curation: declared_params[:curation],
        }
        (current_user.profile.update!(**new_profile) &&
          new_profile) || error!('profile update failed', 500)
      end

      desc 'post user template'
      params do
        requires :content, type: String, desc: 'ketcher file content'
      end
      post do
        error_messages = []

        error!({ error_messages: ['Content cannot be blank'] }, 422) if params[:content].blank?

        folder_path = "user_templates/#{current_user.id}"
        complete_folder_path = Rails.root.join('uploads', Rails.env, folder_path)
        file_path = "#{complete_folder_path}/#{SecureRandom.alphanumeric(10)}.txt"
        begin
          FileUtils.mkdir_p(complete_folder_path) unless File.directory?(complete_folder_path)
          File.new(file_path, 'w') unless File.exist?(file_path)
          File.write(file_path, params[:content])

          template_attachment = Attachment.new(
            bucket: 1,
            filename: file_path,
            key: 'user_template',
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: 'text/html',
            file_path: file_path,
          )
          begin
            template_attachment.save
          rescue StandardError
            error_messages.push(template_attachment.errors.to_h[:attachment]) # rubocop:disable Rails/DeprecatedActiveModelErrorsMethods
          end
          { template_details: template_attachment, error_messages: error_messages }
        rescue Errno::EACCES
          error!('Save files error!', 500)
        end
      end

      desc 'delete user template'
      params do
        requires :path, type: String, desc: 'file path of user template'
      end
      delete do
        path = params[:path]
        error!({ error_messages: ['path cannot be blank'] }, 422) if path.empty?
        FileUtils.rm_f(path)
        { status: true }
      end

      desc 'get user profile editor ketcher 2 setting options'
      get 'editors/ketcher-options' do
        file_path = "ketcher-optns/#{current_user.id}.json"
        complete_folder_path = Rails.root.join('uploads', Rails.env, file_path)
        error_messages = []

        if File.exist?(complete_folder_path)
          begin
            settings = JSON.parse(File.read(complete_folder_path))
            { status: true, settings: settings }
          rescue StandardError => e
            error_messages.push('Issues with reading settings file', e.message)
            { status: false, error_messages: error_messages.flatten }
          end
        else
          { status: true, settings: {}, message: 'Settings file not found, using default settings' }
        end
      end

      desc 'update user profile editor ketcher 2 setting options'
      params do
        requires :data, type: Hash, desc: 'data structure for ketcher options'
      end
      put 'editors/ketcher-options' do
        error_messages = []
        folder_path = 'ketcher-optns'
        complete_folder_path = Rails.root.join('uploads', Rails.env, folder_path)
        file_path = "#{complete_folder_path}/#{current_user.id}.json"
        begin
          FileUtils.mkdir_p(complete_folder_path) unless File.directory?(complete_folder_path)
          File.new(file_path, 'w') unless File.exist?(file_path)
          File.write(file_path, JSON(params[:data]))

          template_attachment = Attachment.new(
            bucket: 1,
            filename: file_path,
            key: 'ketcher-optns',
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: 'application/json',
            file_path: file_path,
          )
          if template_attachment.save
            { status: true, message: 'Ketcher options updated successfully' }
          else
            error_messages.push('Attachment could not be saved')
            error!({ status: false, error_messages: error_messages.flatten }, 422)
          end
        rescue StandardError => e
          error_messages.push(e.message)
          error!({ status: false, error_messages: error_messages.flatten }, 500)
        end
      end
    end
  end
  # rubocop: enable Metrics/ClassLength
end
# rubocop: enable Style/MultilineIfModifier

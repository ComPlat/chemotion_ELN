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

        if profile && profile.user_templates 
            profile.user_templates.each do |x|
              if(x)
                file_path = Rails.root.join('uploads', Rails.env, x) 
                # TODO:H how file will be uploaded to cloud storage

                if File.exist?(file_path)
                  content = File.read(file_path)
                  content = JSON(content)
                  content['props']['path'] = x
                  templates_list.push(content);
                end
            end
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
          optional :export_selection, type: Hash do
            optional :sample, type: Array[Boolean]
            optional :reaction, type: Array[Boolean]
            optional :wellplate, type: Array[Boolean]
          end
          optional :computed_props, type: Hash do
            optional :graph_templates, type: Array[Hash]
            optional :cur_template_idx, type: Integer
          end
          optional :default_structure_editor, type: String
          optional :filters, type: Hash
        end
        optional :show_external_name, type: Boolean
        optional :show_sample_name, type: Boolean
        optional :show_sample_short_label, type: Boolean
        optional :user_templates, type: String
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
        data['layout'] = {
          'sample' => 1,
          'reaction' => 2,
          'wellplate' => 3,
          'screen' => 4,
          'research_plan' => 5,
          'cell_line' => -1000,
        } if data['layout'].nil?

        layout = data['layout'].select { |e| available_ements.include?(e) }
        data['layout'] = layout.sort_by { |_k, v| v }.to_h
        data['default_structure_editor'] = 'ketcher' if data['default_structure_editor'].nil?
        new_profile = {
          data: data.deep_merge(declared_params[:data] || {}),
          show_external_name: declared_params[:show_external_name],
          show_sample_name: declared_params[:show_sample_name],
          show_sample_short_label: declared_params[:show_sample_short_label],
          user_templates: current_user.profile.user_templates.push(declared_params[:user_templates]),
        }

        (current_user.profile.update!(**new_profile) &&
          new_profile) || error!('profile update failed', 500)
      end

    
      desc 'post user template'
      params do
        requires :content, type: String, desc: 'ketcher file content'
      end
      # TODO:H current_user validation??
      post do
      file_path = Rails.root.join('uploads', Rails.env, 'template.txt')
      begin
        if (!File.exist?(file_path))
          File.new(file_path, 'w')
        end

        # overwrite a file in tmp
        File.open(file_path, 'w') do |file|
          file.write(params[:content])
        end

        # upload the file to storage
        templateAttachment = Attachment.new(
            bucket: 1,
            filename: Time.now.to_s + 'template.txt',
            key: 'user_template',
            created_by: current_user.id,
            created_for: current_user.id,
            content_type: 'text/html',
            file_path: file_path,
          )
          begin
            templateAttachment.save!
          rescue StandardError
            error_messages.push(templateAttachment.errors.to_h[:attachment]) # rubocop:disable Rails/DeprecatedActiveModelErrorsMethods
          ensure
            File.delete(file_path) if File.exist?(file_path)
          end
          {template_details: templateAttachment}
      rescue Errno::EACCES
        error!('Save files error!', 500)
      end
    end

    desc 'delete user template'
    params do
      requires :path, type: String, desc: 'file path of user template'
    end
    delete do
      user_templates = current_user.profile.user_templates;
      user_templates.delete(params[:path]);

      # remove file from store
      file_path = Rails.root.join("uploads", Rails.env, params[:path]);
      File.delete(file_path) if File.exist?(file_path)

      # update profile
      new_profile = {
        user_templates: user_templates,
      }
      (current_user.profile.update!(**new_profile) &&
      new_profile) || error!('profile update failed', 500)

      {status: true}
    end

    
    desc 'draft: get user profile editor ketcher 2 setting options'
    get "editors/ketcher2-options" do
      Ketcher2Setting.find_by(user_id: current_user.id)
    end

    desc 'draft: update user profile editor ketcher 2 setting options'
    params do
      requires :data, type: String, desc: "data structure for ketcher options"
    end
    put "editors/ketcher2-options" do
      ketcher_values = Ketcher2Setting.where(user_id: current_user.id).delete_all;
      data = JSON.parse(params[:data])
      new_settings = Ketcher2Setting.create({ user_id: current_user.id }.merge(data))
      {data: new_settings}
    end

  end
  end
end
# rubocop: enable Style/MultilineIfModifier

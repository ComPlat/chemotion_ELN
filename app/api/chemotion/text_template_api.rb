# frozen_string_literal: true

module Chemotion
  class TextTemplateAPI < Grape::API
    resource :text_templates do
      params do
        requires :type, type: String, desc: 'element type'
      end
      get :by_type do
        type = "#{params[:type]}_text_template".classify
        template = if type.in?(TextTemplate::TYPES)
                     current_user.text_templates.find_by(type: type)
                   else
                     current_user.text_templates.find_by(type: 'ElementTextTemplate', name: params[:type])
                   end

        { "#{params[:type]}": template&.data || {} }
      end

      params do
        requires :type, type: String, desc: 'element type'
        requires :data, type: Hash, desc: 'Text template details'
      end
      put :update do
        template = if (type = "#{params[:type]}_text_template".classify).in?(TextTemplate::TYPES)
                     current_user.text_templates.find_by(type: type)
                   else
                     ElementTextTemplate.find_or_initialize_by(user_id: current_user.id, name: params[:type])
                   end
        template.data = params['data']
        template.save!

        present template, with: Entities::TextTemplateEntity
      end

      desc 'Get predefined templates with paging'
      get :predefinedNames do
        { text_templates: PredefinedTextTemplate.order(id: :desc).pluck(:name) }
      end

      desc 'Get predefined templates by name'
      get :by_name do
        template = PredefinedTextTemplate.where(name: params['name'])

        present template, with: Entities::TextTemplateEntity, root: :text_templates
      end

      delete :by_name do
        unless Admin.exists?(id: current_user.id) || current_user.global_text_template_editor
          error!('401 Unauthorized', 401)
        end

        template = PredefinedTextTemplate.where(name: params['name']).first
        error!('404 Not found', 404) if template.nil?

        template.destroy

        present template, with: Entities::TextTemplateEntity
      end

      desc 'Update predefined text template'
      params do
        requires :id, type: Integer, desc: "Text template ID"
        requires :name, type: String, desc: "Unique predefined template name"
        optional :data, type: Hash, desc: "Text template details"
      end
      put :predefined_text_template do
        unless Admin.exists?(id: current_user.id) || current_user.global_text_template_editor
          error!('401 Unauthorized', 401)
        end

        template = PredefinedTextTemplate.find_by(id: params["id"])
        error!('404 Not found', 404) if template.nil?

        error!(template.errors.full_messages.join(', '), 422) unless template.update(
          name: params["name"] || "",
          data: params["data"] || {}
        )
        present template, with: Entities::TextTemplateEntity
      end

      desc 'Create predefined text template'
      params do
        requires :name, type: String, desc: "Unique predefined template name"
        optional :data, type: Hash, desc: "Text template details"
      end
      post :predefined_text_template do
        unless Admin.exists?(id: current_user.id) || current_user.global_text_template_editor
          error!('401 Unauthorized', 401)
        end

        template = PredefinedTextTemplate.new(
          name: params["name"],
          user_id: current_user.id,
          data: params["data"] || {}
        )
        error!(template.errors.full_messages.join(', '), 422) unless template.save

        present template, with: Entities::TextTemplateEntity
      end

      # Personal text templates
      resource :personal do
        desc 'Get all personal templates for current user'
        get do
          templates = PersonalTextTemplate.where(user_id: current_user.id).order(id: :desc)
          present templates, with: Entities::TextTemplateEntity, root: :text_templates
        end

        desc 'Create a personal text template'
        params do
          requires :name, type: String, desc: 'Template name'
          optional :data, type: Hash, desc: 'Template data'
        end
        post do
          template = PersonalTextTemplate.new(
            user_id: current_user.id,
            name: params[:name],
            data: params[:data] || {},
          )
          error!(template.errors.full_messages.join(', '), 422) unless template.save
          present template, with: Entities::TextTemplateEntity
        end

        desc 'Update a personal text template'
        params do
          requires :id, type: Integer, desc: 'Template ID'
          requires :name, type: String, desc: 'Template name'
          optional :data, type: Hash, desc: 'Template data'
        end
        put ':id' do
          template = PersonalTextTemplate.find_by(id: params[:id], user_id: current_user.id)
          error!('404 Not found', 404) if template.nil?

          error!(template.errors.full_messages.join(', '), 422) unless template.update(
            name: params[:name],
            data: params[:data] || template.data,
          )
          present template, with: Entities::TextTemplateEntity
        end

        desc 'Delete a personal text template'
        delete ':id' do
          template = PersonalTextTemplate.find_by(id: params[:id], user_id: current_user.id)
          error!('404 Not found', 404) if template.nil?

          template.destroy
          present template, with: Entities::TextTemplateEntity
        end
      end
    end
  end
end

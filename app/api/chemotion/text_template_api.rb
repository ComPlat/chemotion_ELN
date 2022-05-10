# frozen_string_literal: true
module Chemotion
  class TextTemplateAPI < Grape::API
    resource :text_templates do
      DEF_ELS ||= %w[research_plan screen wellplate reaction sample reaction_description].freeze

      params do
        requires :type, type: String, desc: 'element type'
      end
      get :by_type do
        template = if params[:type].in?(DEF_ELS)
          current_user.send(params[:type] + '_text_template')
        else
          ElementTextTemplate.find_by(user_id: current_user.id, name: params[:type])
        end

        { "#{params[:type]}": template&.data || {} }
      end

      params do
        requires :type, type: String, desc: 'element type'
        requires :data, type: Hash, desc: 'Text template details'
      end
      put :update do
        template = if params[:type].in?(DEF_ELS)
          current_user.send(params[:type] + '_text_template')
        else
          ElementTextTemplate.find_or_initialize_by(user_id: current_user.id, name: params[:type])
        end
        template.data = params['data']
        template.save!

        present template, with: Entities::TextTemplateEntity
      end

      desc 'Get predefined templates with paging'
      get :predefinedNames do
        PredefinedTextTemplate.order(id: :desc).pluck(:name)
      end

      desc 'Get predefined templates by name'
      get :by_name do
        template = PredefinedTextTemplate.where(name: params['name'])

        present template, with: Entities::TextTemplateEntity
      end

      delete :by_name do
        error!('401 Unauthorized', 401) unless Admin.exists?(id: current_user.id)

        template = PredefinedTextTemplate.where(name: params["name"]).first
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
        error!('401 Unauthorized', 401) unless Admin.exists?(id: current_user.id)

        template = PredefinedTextTemplate.find_by(id: params["id"])
        error!('404 Not found', 404) if template.nil?

        template.update!(
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
        error!('401 Unauthorized', 401) unless Admin.exists?(current_user.id)

        template = PredefinedTextTemplate.create(
          name: params["name"],
          user_id: current_user.id,
          data: params["data"] || {}
        )

        present template, with: Entities::TextTemplateEntity
      end
    end
  end
end

# frozen_string_literal: true
module Chemotion
  class TextTemplateAPI < Grape::API
    resource :text_templates do
      DEF_ELS = %w[research_plan screen wellplate reaction sample reaction_description].freeze

      params do
        requires :type, type: String, desc: 'element type'
      end
      get :by_type do
        template = DEF_ELS.include?(params[:type]) ? current_user.send(params[:type] + '_text_template') : ElementTextTemplate.where(user_id: current_user.id, name: params[:type])&.first
        { "#{params[:type]}": template.nil? ? {} : template.data }
      end

      params do
        requires :type, type: String, desc: 'element type'
        requires :data, type: Hash, desc: 'Text template details'
      end
      put :update do
        if DEF_ELS.include?(params[:type])
          template = current_user.send(params[:type] + '_text_template')
          template.update!(data: params['data'])
        else
          template = ElementTextTemplate.where(user_id: current_user.id, name: params[:type])&.first
          if template.nil?
            template = ElementTextTemplate.new
            template.name = params[:type]
            template.user_id = current_user.id
          end
          template.data = params['data']
          template.save!
        end
      end

      desc 'Get predefined templates with paging'
      get :predefinedNames do
        PredefinedTextTemplate.order(id: :desc).pluck(:name)
      end

      desc 'Get predefined templates by name'
      get :by_name do
        PredefinedTextTemplate.where(name: params['name'])
      end

      delete :by_name do
        error!('401 Unauthorized', 401) unless Admin.exists?(id: current_user.id)

        template = PredefinedTextTemplate.where(name: params["name"]).first
        error!('404 Not found', 404) if template.nil?

        template.destroy
      end

      desc 'Update predefined text template'
      params do
        requires :id, type: Integer, desc: "Text template ID"
        requires :user_id, type: Integer, desc: "User ID"
        requires :name, type: String, desc: "Unique predefined template name"
        optional :data, type: Hash, desc: "Text template details"
      end
      put :predefined_text_template do
        error!('401 Unauthorized', 401) if Admin.find(current_user.id).nil?

        template = PredefinedTextTemplate.find(params["id"])
        error!('404 Not found', 404) if template.nil?

        template.update!(
          name: params["name"] || "",
          data: params["data"] || {}
        )
        template
      end

      desc 'Create predefined text template'
      params do
        requires :name, type: String, desc: "Unique predefined template name"
        optional :data, type: Hash, desc: "Text template details"
      end
      post :predefined_text_template do
        error!('401 Unauthorized', 401) if Admin.find(current_user.id).nil?

        PredefinedTextTemplate.create(
          name: params["name"],
          user_id: current_user.id,
          data: params["data"] || {}
        )
      end
    end
  end
end

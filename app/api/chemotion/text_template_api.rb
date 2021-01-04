# frozen_string_literal: true
module Chemotion
  class TextTemplateAPI < Grape::API
    resource :text_templates do
      get :sample do
        template = current_user.sample_text_template
        { sample: template.nil? ? {} : template.data }
      end

      put :sample do
        template = current_user.sample_text_template
        template.update!(data: params)
      end

      get :reaction do
        template = current_user.reaction_text_template
        { reaction: template.nil? ? {} : template.data }
      end

      put :reaction do
        template = current_user.reaction_text_template
        template.update!(data: params)
      end

      get :wellplate do
        template = current_user.wellplate_text_template
        { wellplate: template.nil? ? {} : template.data }
      end

      put :wellplate do
        template = current_user.wellplate_text_template
        template.update!(data: params)
      end

      get :screen do
        template = current_user.screen_text_template
        { screen: template.nil? ? {} : template.data }
      end

      put :screen do
        template = current_user.screen_text_template
        template.update!(data: params)
      end

      get :research_plan do
        template = current_user.research_plan_text_template
        { research_plan: template.nil? ? {} : template.data }
      end

      put :research_plan do
        template = current_user.research_plan_text_template
        template.update!(data: params)
      end

      desc 'Get predefined templates with paging'
      get :predefinedNames do 
        PredefinedTextTemplate.order(:id).pluck(:name)
      end

      desc 'Get predefined templates by name'
      get :by_name do 
        PredefinedTextTemplate.where(name: params["name"])
      end

      delete :by_name do
        error!('401 Unauthorized', 401) unless Admin.exists?(id: current_user.id)

        template = PredefinedTextTemplate.where(name: params["name"]).first
        error!('404 Not found', 404) if template.nil?

        template.destroy
      end

      desc 'Update predefined text template'
      put :predefined_text_template do
        error!('401 Unauthorized', 401) if Admin.find(current_user.id).nil?

        template = PredefinedTextTemplate.find(params["id"])
        error!('404 Not found', 404) if template.nil?

        template.update!(
          name: params["name"] || "",
          data: params["data"] || {}
        )
      end
    end
  end
end

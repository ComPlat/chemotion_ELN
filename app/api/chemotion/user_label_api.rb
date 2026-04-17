# frozen_string_literal: true

module Chemotion
  class UserLabelAPI < Grape::API
    helpers ParamsHelpers
    helpers UserLabelHelpers

    resource :user_labels do
      desc 'list user labels'
      get 'list_labels' do
        labels = UserLabel.my_labels(current_user)
        present labels || [], with: Entities::UserLabelEntity, root: 'labels'
      end

      namespace :save_label do
        desc 'create or update user labels'
        params do
          optional :id, type: Integer
          optional :title, type: String
          optional :description, type: String
          optional :color, type: String
          optional :access_level, type: Integer
        end
        put do
          attr = {
            id: params[:id],
            user_id: current_user.id,
            access_level: params[:access_level] || 0,
            title: params[:title],
            description: params[:description],
            color: params[:color],
          }
          label = nil
          if params[:id].present?
            label = UserLabel.find(params[:id])
            label.update!(attr)
          else
            label = UserLabel.create!(attr)
          end
          present label, with: Entities::UserLabelEntity
        end
      end

      desc 'Bulk-apply/remove user labels on elements selected via ui_state'
      params do
        requires :ui_state, type: Hash, desc: 'Selected elements from the UI' do
          use :main_ui_state_params
        end
        optional :add_label_ids, type: Array[Integer], default: []
        optional :remove_label_ids, type: Array[Integer], default: []
      end
      post :bulk do
        add_ids = Array(params[:add_label_ids])
        remove_ids = Array(params[:remove_label_ids])

        error!('Nothing to do', 400) if add_ids.empty? && remove_ids.empty?

        allowed_ids = UserLabel.my_labels(current_user).pluck(:id)
        add_ids &= allowed_ids
        remove_ids &= allowed_ids

        error!('No accessible labels', 403) if add_ids.empty? && remove_ids.empty?

        collection_id = params[:ui_state][:currentCollection][:id]

        API::ELEMENTS.each do |element|
          ui_state = params[:ui_state][element]
          next if ui_state.blank?

          scope = API::ELEMENT_CLASS[element].by_collection_id(collection_id).by_ui_state(ui_state)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, scope).update?

          scope.find_each do |el|
            bulk_apply_element_labels(el, add_ids, remove_ids, current_user.id)
          end
        end

        Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
          ui_state = params[:ui_state][klass.name]
          next if ui_state.blank?

          scope = klass.elements.by_collection_id(collection_id).by_ui_state(ui_state)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, scope).update?

          scope.find_each do |el|
            bulk_apply_element_labels(el, add_ids, remove_ids, current_user.id)
          end
        end

        status 204
      end
    end
  end
end

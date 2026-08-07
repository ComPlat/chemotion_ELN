# frozen_string_literal: true

module Chemotion
  class AdminInfoSupportAPI < Grape::API
    resource :admin do
      before do
        error!('401 Unauthorized', 401) unless current_user.is_a?(Admin)
      end

      resource :info_support_links do
        desc 'List all info & support links (admin)'
        get do
          present InfoSupportLink.all, with: Entities::InfoSupportLinkEntity
        end

        desc 'Create an info & support link'
        params do
          requires :label, type: String
          requires :url, type: String
          optional :position, type: Integer, default: 0
          optional :enabled, type: Boolean, default: true
        end
        post do
          link = InfoSupportLink.new(declared(params, include_missing: false))
          if link.save
            present link, with: Entities::InfoSupportLinkEntity
          else
            error!({ errors: link.errors.full_messages }, 422)
          end
        end

        route_param :id, type: Integer do
          desc 'Update an info & support link'
          params do
            optional :label, type: String
            optional :url, type: String
            optional :position, type: Integer
            optional :enabled, type: Boolean
          end
          put do
            link = InfoSupportLink.find(params[:id])
            updates = declared(params, include_missing: false).except(:id)
            if link.update(updates)
              present link, with: Entities::InfoSupportLinkEntity
            else
              error!({ errors: link.errors.full_messages }, 422)
            end
          end

          desc 'Delete an info & support link'
          delete do
            InfoSupportLink.find(params[:id]).destroy!
            status 204
          end
        end
      end
    end
  end
end

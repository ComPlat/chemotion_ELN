module Chemotion
  class ProfileAPI < Grape::API
    resource :profiles do
      desc "Return the profile of the current_user"
      get do
        profile = current_user.profile
        data = profile.data || {}
        { data: data, show_external_name: profile.show_external_name }
      end

      desc 'update user profile'
      params do
        optional :data, type: Hash do
          optional :layout, type: Hash do
            optional :sample, type: Integer
            optional :reaction, type: Integer
            optional :screen, type: Integer
            optional :research_plan, type: Integer
            optional :wellplate, type: Integer
          end
          optional :export_selection, type: Hash do
            optional :sample, type: Array[Boolean]
            optional :reaction, type: Array[Boolean]
            optional :wellplate, type: Array[Boolean]
          end
        end
        optional :show_external_name, type: Boolean
      end

      put do
        data = current_user.profile.data || {}
        new_data = data.merge(params[:data] || {})
        new_profile = { **new_data, show_external_name: params[:show_external_name] }
        current_user.profile.update!(**new_profile) && new_profile || error!('profile update failed',500)
      end
    end
  end
end

module Chemotion

  class ProfileLayoutHash < Grape::Validations::Base
    def validate_param!(attr_name, params)
      fail Grape::Exceptions::Validation, params: [@scope.full_name(attr_name)],
         message: "has too many entries" if  params[attr_name].keys.size > 30
      params[attr_name].each do |key, val|
        fail(Grape::Exceptions::Validation, params: [@scope.full_name(attr_name)],
          message: "has wrong structure") unless key.to_s =~ /\A[\w \-]+\Z/
        fail(Grape::Exceptions::Validation, params: [@scope.full_name(attr_name)],
          message: "has wrong structure") unless val.to_s =~ /\d+/
      end
    end
  end

  class ProfileAPI < Grape::API
    resource :profiles do
      desc "Return the profile of the current_user"
      get do
        profile = current_user.profile
        data = profile.data || {}
        layout = Rails.configuration.respond_to?(:profile_default) ? (Rails.configuration.profile_default&.layout || {}) : {}

        layout.keys&.each do |ll|
          data[ll.to_s] = layout[ll] if layout[ll].present? && data[ll.to_s].nil?
        end

        if current_user.matrix_check_by_name('genericElement')
          available_elments = ElementKlass.where(is_active: true).pluck(:name)
          new_layout = data['layout'] || {}
          ElementKlass.where(is_active: true).find_each do |el|
            if data['layout'] && data['layout']["#{el.name}"].nil?
              new_layout["#{el.name}"] = new_layout&.values&.min < 0 ? new_layout&.values.min-1 : -1;
            end
          end
          new_layout = new_layout.select { |e| available_elments.include?(e) }
          data[:layout] = new_layout.sort_by { |_k, v| v }.to_h
        end

        {
          data: data,
          show_external_name: profile.show_external_name,
          curation: profile.curation,
        }
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
        end
        optional :show_external_name, type: Boolean
      end

      put do
        declared_params = declared(params, include_missing: false)
        data = current_user.profile.data || {}
        available_ements = API::ELEMENTS + ElementKlass.where(is_active: true).pluck(:name)

        data['layout'] = { 'sample' => 1, 'reaction' => 2, 'wellplate' => 3, 'screen' => 4, 'research_plan' => 5 } if data['layout'].nil?

        layout = data['layout'].select { |e| available_ements.include?(e) }
        data['layout'] = layout.sort_by { |_k, v| v }.to_h

        new_profile = {
          data: data.deep_merge(declared_params[:data] || {}),
          show_external_name: declared_params[:show_external_name]
        }

        current_user.profile.update!(**new_profile) &&
          new_profile || error!('profile update failed', 500)
      end
    end
  end
end

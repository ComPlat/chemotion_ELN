module Chemotion
  class ProfileAPI < Grape::API
    resource :profiles do
      desc "Return the profile of the current_user"
      get do
        profile = current_user.profile
        data = profile.data || {}
        data.merge!(layout: {
          'sample' => 1,
          'reaction' => 2,
          'wellplate' => 3,
          'screen' => 4,
          'research_plan' => 5
        }) if (data['layout'].nil?)
        data.merge!(layout_detail_research_plan: {
          'research_plan' => 1,
          'analyses' => 2,
          'attachments' => 3,
          'literature' => 4
        }) if (data['layout_detail_research_plan'].nil?)
        data.merge!(layout_detail_reaction: {
          'scheme' => 1,
          'properties' => 2,
          'references' => 3,
          'analyses' => 4,
          'green_chemistry' => 5
        }) if (data['layout_detail_reaction'].nil?)
        data.merge!(layout_detail_sample: {
          'properties' => 1,
          'analyses' => 2,
          'literature' => 3,
          'results' => 4,
          'qc_curation' => 5
        }) if (data['layout_detail_sample'].nil?)
        data.merge!(layout_detail_wellplate: {
          'designer' => 1,
          'list' => 2,
          'properties' => 3,
          'analyses' => 4
        }) if (data['layout_detail_wellplate'].nil?)
        data.merge!(layout_detail_screen: {
          'properties' => 1,
          'analyses' => 2
        }) if (data['layout_detail_screen'].nil?)
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
          optional :layout_detail_research_plan, type: Hash
          # optional :layout_detail_research_plan, type: Hash do
          #   optional :research_plan, type: Integer
          #   optional :analyses, type: Integer
          #   optional :attachments, type: Integer
          #   optional :literature, type: Integer
          # end
          optional :layout_detail_reaction, type: Hash
          # optional :layout_detail_reaction, type: Hash do
          #   optional :scheme, type: Integer
          #   optional :properties, type: Integer
          #   optional :references, type: Integer
          #   optional :analyses, type: Integer
          #   optional :green_chemistry, type: Integer
          # end
          optional :layout_detail_sample, type: Hash
          optional :layout_detail_wellplate, type: Hash
          # optional :layout_detail_wellplate, type: Hash do
          #   optional :designer, type: Integer
          #   optional :list, type: Integer
          #   optional :properties, type: Integer
          #   optional :analyses, type: Integer
          # end
          optional :layout_detail_screen, type: Hash
          # optional :layout_detail_screen, type: Hash do
          #   optional :properties, type: Integer
          #   optional :analyses, type: Integer
          # end
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

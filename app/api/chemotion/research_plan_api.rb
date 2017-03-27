module Chemotion
  class ResearchPlanAPI < Grape::API
    include Grape::Kaminari

    namespace :research_plans do
      desc "Return serialized research plans of current user"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
        optional :sync_collection_id, type: Integer, desc: "SyncCollectionsUser id"
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        scope = if params[:collection_id]
          begin
            Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids).
              find(params[:collection_id]).research_plans
          rescue ActiveRecord::RecordNotFound
            ResearchPlan.none
          end
        elsif params[:sync_collection_id]
          begin
            current_user.all_sync_in_collections_users.find(params[:sync_collection_id]).collection.research_plans
          rescue ActiveRecord::RecordNotFound
            ResearchPlan.none
          end
        else
          # All collection of current_user
          ResearchPlan.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        paginate(scope).map{|s| ElementPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Save svg file to filesystem"
      params do
        requires :svg_file, type: String, desc: "SVG raw file"
      end
      post :svg do
        svg = params[:svg_file]
        processor = Ketcherails::SVGProcessor.new svg
        svg = processor.centered_and_scaled_svg

        digest = Digest::SHA256.hexdigest svg
        digest = Digest::SHA256.hexdigest digest
        svg_file_name = "#{digest}.svg"
        svg_file_path = "public/images/research_plans/#{svg_file_name}"

        svg_file = File.new(svg_file_path, 'w+')
        svg_file.write(svg)
        svg_file.close

        {svg_path: svg_file_name}
      end

      desc "Create a research plan"
      params do
        requires :name, type: String, desc: "Research plan name"
        optional :description, type: Hash, desc: "Research plan description"
        requires :sdf_file, type: String, desc: "Research plan SDF file"
        requires :svg_file, type: String, desc: "Research plan SVG file"
        optional :collection_id, type: Integer, desc: "Collection ID"
      end
      post do
        attributes = {
          name: params[:name],
          description: params[:description],
          sdf_file: params[:sdf_file],
          svg_file: params[:svg_file]
        }

        research_plan = ResearchPlan.new attributes
        research_plan.creator = current_user

        research_plan.save!

        if col_id = params[:collection_id]
          research_plan.collections << current_user.collections.find(col_id)
        end

        all_coll = Collection.get_all_collection_for_user(current_user.id)
        research_plan.collections << all_coll

        research_plan
      end

      desc "Return serialized research plan by id"
      params do
        requires :id, type: Integer, desc: "Research plan id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).read?
        end

        get do
          research_plan = ResearchPlan.find(params[:id])
          {research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized}
        end
      end

      desc "Update research plan by id"
      params do
        requires :id, type: Integer, desc: "Research plan id"
        optional :name, type: String, desc: "Research plan name"
        optional :description, type: Hash, desc: "Research plan description"
        optional :svg_file, type: String, desc: "Research plan SVG file"
        optional :sdf_file, type: String, desc: "Research plan SDF file"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).update?
        end

        put do
          attributes = declared(params, include_missing: false)

          if research_plan = ResearchPlan.find(params[:id])
            research_plan.update!(attributes)
          end
          { research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized }
        end
      end

      namespace :ui_state do
        desc "Delete research  plans by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected research plans from the UI" do
            requires :all, type: Boolean
            requires :collection_id
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, ResearchPlan.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          ResearchPlan.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end
      end

    end
  end
end

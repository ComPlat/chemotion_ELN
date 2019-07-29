module Chemotion
  class ResearchPlanAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers CollectionHelpers

    namespace :research_plans do
      desc "Return serialized research plans of current user"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
        optional :sync_collection_id, type: Integer, desc: "SyncCollectionsUser id"
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
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

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        paginate(scope).map{|s| ElementPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Save svg file to filesystem"
      params do
        requires :svg_file, type: String, desc: "SVG raw file"
        requires :is_chemdraw, type: Boolean, desc: "is chemdraw file?"
      end
      post :svg do
        svg = params[:svg_file]
        processor = Ketcherails::SVGProcessor.new svg if !params[:is_chemdraw]
        processor = Chemotion::ChemdrawSvgProcessor.new svg if params[:is_chemdraw]
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

      desc "Save image file to filesystem"
      params do
        requires :file, type: File
        optional :replace, type: String
      end
      post :image do
        file_name = params[:file][:filename]
        file_extname = File.extname(file_name)

        public_name = "#{SecureRandom.uuid}#{file_extname}"
        public_path = "public/images/research_plans/#{public_name}"

        File.open(public_path, 'wb') do |file|
          file.write(params[:file][:tempfile].read)
        end

        if params[:replace]
          File.delete("public/images/research_plans/#{params[:replace]}")
        end

        {
          file_name: file_name,
          public_name: public_name
        }
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
          {research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized,
          attachments: Entities::AttachmentEntity.represent(research_plan.attachments)}
        end
      end

      desc "Update research plan by id"
      params do
        requires :id, type: Integer, desc: "Research plan id"
        optional :name, type: String, desc: "Research plan name"
        optional :body, type: Array, desc: "Research plan body"
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
    end
  end
end

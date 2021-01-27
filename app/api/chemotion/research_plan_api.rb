module Chemotion
  class ResearchPlanAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers ContainerHelpers

    namespace :research_plans do
      desc 'Return serialized research plans of current user'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id, type: Integer, desc: 'SyncCollectionsUser id'
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

      desc 'Create a research plan'
      params do
        requires :name, type: String, desc: 'Research plan name'
        optional :body, type: Array, desc: 'Research plan body'
        optional :collection_id, type: Integer, desc: 'Collection ID'
        requires :container, type: Hash
      end
      post do
        attributes = {
          name: params[:name],
          body: params[:body]
        }

        research_plan = ResearchPlan.new attributes
        research_plan.creator = current_user
        research_plan.container = update_datamodel(params[:container])
        research_plan.save!

        if col_id = params[:collection_id]
          research_plan.collections << current_user.collections.find(col_id)
        end

        all_coll = Collection.get_all_collection_for_user(current_user.id)
        research_plan.collections << all_coll

        research_plan
      end

      namespace :table_schemas do
        desc 'Return serialized table schemas of current user'
        get do
          { table_schemas: ResearchPlanTableSchema.where(creator: current_user) }
        end

        desc 'Save table schema'
        params do
          requires :name, type: String
          requires :value, type: Hash
        end
        post do
          attributes = {
            name: params[:name],
            value: params[:value]
          }

          table_schema = ResearchPlanTableSchema.new attributes
          table_schema.creator = current_user
          table_schema.save!

          table_schema
        end

        desc 'Delete table schema'
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless TableSchemaPolicy.new(current_user, ResearchPlanTableSchema.find(params[:id])).destroy?
          end
          delete do
            ResearchPlanTableSchema.find(params[:id]).destroy
          end
        end
      end

      desc 'Return serialized research plan by id'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).read?
        end
        get do
          research_plan = ResearchPlan.find(params[:id])
          {
            research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized,
            attachments: Entities::AttachmentEntity.represent(research_plan.attachments)
          }
        end
      end

      desc 'Update research plan by id'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        optional :name, type: String, desc: 'Research plan name'
        optional :body, type: Array, desc: 'Research plan body'
        requires :container, type: Hash, desc: 'Research plan analyses'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).update?
        end

        put do
          attributes = declared(params, include_missing: false)
          update_datamodel(attributes[:container])
          attributes.delete(:container)

          if research_plan = ResearchPlan.find(params[:id])
            research_plan.update!(attributes)
          end
          { research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized }
        end
      end

      desc 'Save svg file to filesystem'
      params do
        requires :svg_file, type: String, desc: 'SVG raw file'
        requires :is_chemdraw, type: Boolean, desc: 'is chemdraw file?'
      end
      post :svg do
        svg = params[:svg_file]
        processor = Ketcherails::SVGProcessor.new svg unless params[:is_chemdraw]
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

      desc 'Save image file to filesystem'
      params do
        requires :file, type: File
      end
      post :image do
        file_name = params[:file][:filename]
        file_extname = File.extname(file_name)

        public_name = "#{SecureRandom.uuid}#{file_extname}"
        public_path = "public/images/research_plans/#{public_name}"

        File.open(public_path, 'wb') do |file|
          file.write(params[:file][:tempfile].read)
        end

        {
          file_name: file_name,
          public_name: public_name
        }
      end

      desc 'Export research plan by id'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        optional :export_format, type: Symbol, desc: 'Export format', values: [:docx, :odt, :html, :markdown, :latex]
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).read?
        end

        get :export do
          research_plan = ResearchPlan.find(params[:id])

          # convert researhc plan
          export = Export::ExportResearchPlan.new current_user, research_plan, params[:export_format]

          # return the response "as is"
          env['api.format'] = :binary

          if params[:export_format]
            # return a file
            content_type 'application/octet-stream'

            # init the export object
            if [:html, :markdown, :latex].include? params[:export_format]
              header['Content-Disposition'] = "attachment; filename=\"#{research_plan.name}.zip\""
              present export.to_zip
            else
              header['Content-Disposition'] = "attachment; filename=\"#{research_plan.name}.#{params[:export_format]}\""
              present export.to_file
            end
          else
            # return plain html
            present export.to_html
          end
        end
      end

      desc 'Export research plan table by id and field_id'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        requires :field_id, type: String, desc: 'Field id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).read?
        end

        get 'export_table/:field_id' do
          research_plan = ResearchPlan.find(params[:id])
          field = research_plan.body.find { |f| f['id'] == params[:field_id] }

          # return the response "as is" and set the content type and the filename
          env['api.format'] = :binary
          content_type 'application/vnd.ms-excel'
          header['Content-Disposition'] = 'attachment; filename="Table.xlsx"'

          export = Export::ExportResearchPlanTable.new
          export.generate_sheet(field['value']['columns'], field['value']['rows'])
          export.read
        end
      end
    end
  end
end

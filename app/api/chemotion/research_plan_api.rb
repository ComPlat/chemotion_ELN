module Chemotion
  # rubocop: disable Metrics/ClassLength

  class ResearchPlanAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers ContainerHelpers

    namespace :research_plans do
      desc 'Return serialized research plans of current user'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        scope = begin
                  collection = fetch_collection_of_current_user(params[:collection_id])
                  collection.research_plans
                rescue ActiveRecord::RecordNotFound
                  ResearchPlan.none
                end

        unless scope.present?
          scope = begin
                    collection = fetch_by_collection_acl(params[:collection_id])
                    collection.research_plans
                  rescue ActiveRecord::RecordNotFound
                    ResearchPlan.none
                  end
        end

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.includes_for_list_display
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        research_plans = paginate(scope).map do |research_plan|
          Entities::ResearchPlanEntity.represent(
            research_plan,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: research_plan).detail_levels
          )
        end

        { research_plans: research_plans }
      end

      desc 'Create a research plan'
      params do
        requires :name, type: String, desc: 'Research plan name'
        optional :body, type: Array, desc: 'Research plan body'
        optional :collection_id, type: Integer, desc: 'Collection ID'
        requires :container, type: Hash, desc: 'Containers'
        optional :segments, type: Array, desc: 'Segments'
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
        research_plan.save_segments(segments: params[:segments], current_user_id: current_user.id)

        collection = (
          params[:collection_id].present? && fetch_collection_w_current_user(params[:collection_id], 1) # 1 = write
        ) || nil
        add_element_to_collection_n_all(research_plan, collection)

        present research_plan, with: Entities::ResearchPlanEntity, root: :research_plan
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

          present table_schema, with: Entities::ResearchPlanTableSchemaEntity
        end

        desc 'Delete table schema'
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless TableSchemaPolicy.new(current_user, ResearchPlanTableSchema.find(params[:id])).destroy?
          end
          delete do
            present ResearchPlanTableSchema.find(params[:id]).destroy, with: Entities::ResearchPlanTableSchemaEntity
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

          # TODO: Refactor this massively ugly fallback to be in a more convenient place
          # (i.e. the entity or maybe return a null element from the model)
          research_plan.build_research_plan_metadata(
            title: research_plan.name,
            subject: ''
          ) if research_plan.research_plan_metadata.nil?
          {
            research_plan: Entities::ResearchPlanEntity.represent(
              research_plan,
              detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: research_plan).detail_levels
            ),
            attachments: Entities::AttachmentEntity.represent(research_plan.attachments),
          }
        end
      end

      desc 'Update research plan by id'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        optional :name, type: String, desc: 'Research plan name'
        optional :body, type: Array, desc: 'Research plan body'
        optional :wellplate_ids, type: Array, desc: 'Research plan Wellplates'
        requires :container, type: Hash, desc: 'Research plan analyses'
        optional :segments, type: Array, desc: 'Segments'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).update?
        end

        put do
          attributes = declared(params.except(:segments), include_missing: false)
          update_datamodel(attributes[:container])
          attributes.delete(:container)

          if research_plan = ResearchPlan.find(params[:id])
            research_plan.update!(attributes)
            research_plan.save_segments(segments: params[:segments], current_user_id: current_user.id)
          end

          detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: research_plan).detail_levels
          present research_plan, with: Entities::ResearchPlanEntity, detail_levels: detail_levels, root: :research_plan
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

        { svg_path: svg_file_name }
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
        optional :export_format, type: Symbol, desc: 'Export format', values: %i[docx odt html markdown latex]
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
            if %i[html markdown latex].include? params[:export_format]
              header['Content-Disposition'] = "attachment; filename=\"#{research_plan.name}.zip\""
              present export.to_zip
            else
              header['Content-Disposition'] = "attachment; filename=\"#{research_plan.name}.#{params[:export_format]}\""
              present export.to_file
            end
          else
            send_data export.to_html, filename: "document.docx"
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

      desc 'Import Wellplate as table into a research plan'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        requires :wellplate_id, type: String, desc: 'Wellplate id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).update?
          error!('401 Unauthorized', 401) unless ElementPolicy.new(
            current_user, Wellplate.find(params[:wellplate_id])
          ).read?
        end

        post 'import_wellplate/:wellplate_id' do
          wellplate = Wellplate.find(params[:wellplate_id])
          research_plan = ResearchPlan.find(params[:id])
          exporter = Usecases::ResearchPlans::ImportWellplateAsTable.new(research_plan, wellplate)
          begin
            exporter.execute!

            {
              research_plan: Entities::ResearchPlanEntity.represent(
                research_plan,
                detail_levels: ElementDetailLevelCalculator.new(
                  user: current_user, element: research_plan
                ).detail_levels
              ),
              attachments: Entities::AttachmentEntity.represent(research_plan.attachments),
            }
          rescue StandardError => e
            error!(e, 500)
          end
        end
      end

      desc 'Import table from spreadsheet into a research plan'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        requires :attachment_id, type: String, desc: 'Wellplate id'
      end
      route_param :id do
        before do
          research_plan = ResearchPlan.find(params[:id])
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, research_plan).update?
        end

        post 'import_table/:attachment_id' do
          research_plan = ResearchPlan.find(params[:id])
          attachment = research_plan.attachments.find(params[:attachment_id])
          exporter = Usecases::ResearchPlans::ImportTableFromSpreadsheet.new(research_plan, attachment)
          begin
            exporter.execute!

            {
              research_plan: Entities::ResearchPlanEntity.represent(
                research_plan,
                detail_levels: ElementDetailLevelCalculator.new(
                  user: current_user, element: research_plan
                ).detail_levels
              ),
              attachments: Entities::AttachmentEntity.represent(research_plan.attachments),
            }
          rescue StandardError => e
            error!(e, 500)
          end
        end
      end
    end
  end

  # rubocop: enable Metrics/ClassLength
end

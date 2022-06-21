# frozen_string_literal: true

module Chemotion
  class ResearchPlanAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers ContainerHelpers

    namespace :annotation do
      desc 'Get the latest version of an annotation of an attachment'
      params do        
        requires :imageId, type: String, desc: 'The id of the attachment in uuid format'        
      end
      get do                     
        attachmentId=params[:imageId];
        attachment=Attachment.find_by(key: attachmentId)
        if attachment!=nil
          datafolder=Rails.configuration.storage.stores[attachment.storage.to_sym][:data_folder];
          datafolder=datafolder+"/"+attachment.bucket+"/";          
          files=Dir.glob(datafolder+params[:imageId]+"_annotation*");
        else
          files=Dir.glob("public/images/research_plans/"+attachmentId+"_annotation_*");               
        end

         version=0;
         latestAnnotation="";
         if files.length>0
          files=files.sort_by{ |name| [name[/\d+/].to_i, name] };
          latestAnnotation=files[files.length-1];
          version=latestAnnotation.split(/[.\s]/)[latestAnnotation.split(/[.\s]/).length-2];
          version=version.split("v")[version.split("v").length-1]
         end
       
         f=File.open(latestAnnotation);    
         annotationContent=  f.read;
         {version:version,
          uri_to_annotation:latestAnnotation,
          annotation:annotationContent
        }
      end

      


      desc 'Update annotation of image'
      params do
        requires :annotation, type: String , desc: 'the annotation to the image. the original image is embedded as a link. The string must be a svg string'
        requires :imageId, type: String, desc: 'The id of the original image in uuid format'
        requires :version, type:Integer, desc: 'the current version of the annotation'
      end
      post  do
        annotation=params[:annotation];
        imageid=params[:imageId].split(/[.\s]/)[params[:imageId].split(/[.\s]/).length-2];
       
        public_path_annotation=imageid+"_annotation_v"+((params[:version]+1).to_s) +".svg";                  
        fileName="public/images/research_plans/"+public_path_annotation;        
        File.open(fileName, 'w') { |file| file.write(params[:annotation]) }   
      end
    end

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
                    Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                              .find(params[:collection_id]).research_plans
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
                  ResearchPlan.joins(:collections).where('collections.user_id = ?', current_user.id).distinct
        end.order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        paginate(scope).map { |s| ElementPermissionProxy.new(current_user, s, user_ids).serialized }
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
        if params[:collection_id]
          collection = current_user.collections.where(id: params[:collection_id]).take
          research_plan.collections << collection if collection.present?
        end

        is_shared_collection = false
        unless collection.present?
          sync_collection = current_user.all_sync_in_collections_users.where(id: params[:collection_id]).take
          is_shared_collection = true if sync_collection.present?
          research_plan.collections << Collection.find(sync_collection['collection_id']) if sync_collection.present?
        end

        unless is_shared_collection
          all_coll = Collection.get_all_collection_for_user(current_user.id)
          research_plan.collections << all_coll
        end

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
          if research_plan.research_plan_metadata.nil?
            research_plan.build_research_plan_metadata(
              title: research_plan.name,
              subject: ''
            )
          end
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
        
        { svg_path: svg_file_name }
      end

      desc 'Save image file to filesystem'
      params do
        requires :file, type: File
      end
      post :image do
        file_name = params[:file][:filename]
        file_extname = File.extname(file_name)  
        uuid=SecureRandom.uuid; 
        public_name = "#{uuid}#{file_extname}"
        public_path = "public/images/research_plans/#{public_name}"

        File.open(public_path, 'wb') do |file|
           file.write(params[:file][:tempfile].read)
        end
        
        imageRest="/images/research_plans/#{public_name}";
        initialImageAnnotation="<svg "+
        "  width=\"#{params[:width]}\" "+
        "  height=\"#{params[:height]}\" "+
        "  xmlns=\"http://www.w3.org/2000/svg\" "+
        "  xmlns:svg=\"http://www.w3.org/2000/svg\" "+
        "  xmlns:xlink=\"http://www.w3.org/1999/xlink\"> "+
        "    <g class=\"layer\">"+
        "      <title>Image</title>"+
        "      <image height=\"#{params[:height]}\" "+
        "      id=\"svg_2\" "+
        "      width=\"#{params[:width]}\" "+
        "      xlink:href=\""+imageRest+"\"/>"+
        "    </g>"+
        "</svg>";        
        annotationFile = "public/images/research_plans/#{uuid}_annotation_v0.svg"
      
        File.open(annotationFile, 'w') { |file| file.write(initialImageAnnotation) };
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

      desc 'Import Wellplate as table into a research plan'
      params do
        requires :id, type: Integer, desc: 'Research plan id'
        requires :wellplate_id, type: String, desc: 'Wellplate id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find(params[:id])).update?
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Wellplate.find(params[:wellplate_id])).read?
        end

        post 'import_wellplate/:wellplate_id' do
          wellplate = Wellplate.find(params[:wellplate_id])
          research_plan = ResearchPlan.find(params[:id])
          exporter = Usecases::ResearchPlans::ImportWellplateAsTable.new(research_plan, wellplate)
          begin
            exporter.execute!
            # TODO: Refactor this massively ugly fallback to be in a more convenient place
            # (i.e. the serializer/entity or maybe return a null element from the model)
            research_plan.build_research_plan_metadata(
              title: research_plan.name,
              subject: ''
            ) if research_plan.research_plan_metadata.nil?
            {
              research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized,
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
            # TODO: Refactor this massively ugly fallback to be in a more convenient place
            # (i.e. the serializer/entity or maybe return a null element from the model)
            research_plan.build_research_plan_metadata(
              title: research_plan.name,
              subject: ''
            ) if research_plan.research_plan_metadata.nil?
            {
              research_plan: ElementPermissionProxy.new(current_user, research_plan, user_ids).serialized,
              attachments: Entities::AttachmentEntity.represent(research_plan.attachments),
            }
          rescue StandardError => e
            error!(e, 500)
          end
        end
      end
    end
  end
end

# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength, Lint/UselessAssignment
require 'open-uri'
require 'csv'

module Chemotion
  class SampleAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers LiteratureHelpers
    helpers CollectionHelpers
    helpers SampleHelpers
    helpers ProfileHelpers
    helpers UserLabelHelpers

    resource :samples do
      desc 'Batch refresh multiple sample SVGs'
      params do
        requires :svgs, type: Array, desc: 'Array of {svg_path, molfile} objects'
      end
      post 'batch-refresh-svg' do
        svgs = params[:svgs] || []

        if svgs.empty?
          status 400
          body 'svgs array is required and cannot be empty.'
          return
        end

        results = svgs.map do |svg_params|
          svg_path = svg_params[:svg_path] || svg_params['svg_path']
          molfile = svg_params[:molfile] || svg_params['molfile']
          if svg_path.blank? || molfile.blank?
            { success: false, error: 'svg_path and molfile are required' }
          else
            result = Sample.refresh_smaple_svg(svg_path, molfile)
            { success: result[:success], filename: result[:filename], error: result[:error] }.compact
          end
        rescue StandardError => e
          { success: false, error: e.message }
        end

        status 200
        { results: results }
      end

      # TODO: Refactoring: Use Grape Entities
      namespace :ui_state do
        desc 'Get samples by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected samples from the UI' do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :from_date, type: Date
            optional :to_date, type: Date
            optional :collection_id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
          optional :limit, type: Integer, desc: 'Limit number of samples'
        end

        before do
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id], params[:ui_state][:is_sync_to_me])
          @samples = Sample.by_collection_id(cid).by_ui_state(params[:ui_state]).for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @samples).read?
        end

        # we are using POST because the fetchers don't support GET requests with body data
        post do
          @samples = @samples.limit(params[:limit]) if params[:limit]

          {
            samples: Entities::SampleEntity.represent(
              @samples,
              root: false,
            ),
            literatures: Entities::LiteratureEntity.represent(
              citation_for_elements(@samples.pluck(:id), 'Sample'),
              with_element_and_user_info: true,
            ),
          }
        end
      end

      namespace :subsamples do
        desc 'Split Samples into Subsamples'
        params do
          requires :ui_state, type: Hash, desc: 'Selected samples from the UI'
        end
        post do
          ui_state = params[:ui_state]
          col_id = ui_state[:currentCollectionId]
          sample_ids = Sample.for_user(current_user.id)
                             .for_ui_state_with_collection(ui_state[:sample], CollectionsSample, col_id)
          Sample.where(id: sample_ids).each do |sample|
            subsample = sample.create_subsample(current_user, col_id, true, 'sample')
          end

          {} # JS layer does not use the reply
        end
      end

      namespace :import do
        desc 'Import Samples from a File'

        after_validation do
          error!('401 Unauthorized', 401) unless current_user.collections.find(params[:currentCollectionId])
          if params[:data].present?
            tempfile = Tempfile.new(['validated_data', '.csv'])
            params[:file] = { tempfile: tempfile, filename: 'validated_data.csv' }
            tempfile.binmode
            CSV.open(tempfile, 'wb') do |csv|
              # Add headers - get keys from the first row
              first_row = params[:data].first
              error!('Invalid data format: rows must be objects', 400) unless first_row.is_a?(Hash)

              headers = first_row.keys
              csv << headers
              # Add data rows
              params[:data].each { |row| csv << headers.map { |header| row[header] } }
            end
            tempfile.rewind
          end

          @att = Attachment.create(
            file_path: params[:file][:tempfile].path,
            filename: params[:file][:filename],
            created_by: current_user.id,
            created_for: current_user.id,
            attachable_type: 'Container',
          )
        ensure
          params[:file][:tempfile].close! if params[:file] && params[:file][:tempfile]
        end

        params do
          requires :currentCollectionId, type: Integer, desc: 'Collection id'
          requires :import_type, type: String
          optional :file, type: File, desc: 'File upload'
          optional :data, type: JSON, desc: 'Validated data '
          at_least_one_of :file, :data
        end

        post do
          ## 2-step SDF Import
          if /\.(sdf?|mol)/i.match?(@att.extname)
            sdf_import = Import::ImportSdf.new(
              attachment: @att,
              collection_id: params[:currentCollectionId],
              current_user_id: current_user.id,
            )

            sdf_import.find_or_create_mol_by_batch
            @att.really_destroy!
            return {
              sdf: true, message: sdf_import.message,
              data: sdf_import.processed_mol, status: sdf_import.status,
              custom_data_keys: sdf_import.custom_data_keys.keys,
              mapped_keys: sdf_import.mapped_keys,
              collection_id: sdf_import.collection_id
            }
          end

          ## async CSV/xlx Import
          ImportSamplesJob.perform_later(
            collection_id: params[:currentCollectionId],
            user_id: current_user.id,
            attachment: @att,
            import_type: params[:import_type],
          )
          { status: 'in progress', message: 'Importing samples in the background' }
        end
      end

      namespace :confirm_import do
        desc 'Create Samples from an Array of inchikeys'
        params do
          requires :rows, type: Array, desc: 'Selected Molecule from the UI'
          requires :currentCollectionId, type: Integer
          requires :mapped_keys, type: Hash
        end

        before do
          error!('401 Unauthorized', 401) unless current_user.collections.find(params[:currentCollectionId])
        end

        post do
          rows = params[:rows]
          if rows.length < 25
            sdf_import = Import::ImportSdf.new(
              collection_id: params[:currentCollectionId],
              current_user_id: current_user.id,
              rows: rows,
              mapped_keys: params[:mapped_keys],
            )
            sdf_import.create_samples
            return {
              sdf: true, message: sdf_import.message,
              status: sdf_import.status,
              error_messages: sdf_import.error_messages
            }
          else
            parameters = {
              collection_id: params[:currentCollectionId],
              user_id: current_user.id,
              file_name: 'dummy.sdf',
              sdf_rows: rows,
              mapped_keys: params[:mapped_keys],
            }
            ImportSamplesJob.perform_later(parameters)
            return {
              message: 'importing samples in background',
            }
          end
        end
      end

      desc 'Return serialized molecules_samples_groups of current user'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id,
                 type: Integer,
                 desc: 'SyncCollectionsUser id'
        optional :molecule_sort, type: Integer, desc: 'Sort by parameter'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
        optional :user_label, type: Integer, desc: 'user label'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :product_only, type: Boolean, desc: 'query only reaction products'
      end
      paginate per_page: 7, offset: 0, max_per_page: 100

      get do
        own_collection = false
        sample_scope = Sample.none
        if params[:collection_id]
          begin
            c = Collection.belongs_to_or_shared_by(
              current_user.id, current_user.group_ids
            ).find(params[:collection_id])

            !c.is_shared && (c.shared_by_id != current_user.id) &&
              (own_collection = true)

            sample_scope = Collection.belongs_to_or_shared_by(
              current_user.id, current_user.group_ids
            ).find(params[:collection_id]).samples
          rescue ActiveRecord::RecordNotFound
            Sample.none
          end
        elsif params[:sync_collection_id]
          begin
            own_collection = false
            c = current_user.all_sync_in_collections_users
                            .find(params[:sync_collection_id])

            sample_scope = c.collection.samples
          rescue ActiveRecord::RecordNotFound
            Sample.none
          end
        else
          # All collection
          own_collection = true
          sample_scope = Sample.for_user(current_user.id).distinct
        end
        sample_scope = sample_scope.includes_for_list_display
        prod_only = params[:product_only] || false
        sample_scope = if prod_only
                         sample_scope.product_only
                       else
                         sample_scope.distinct.sample_or_startmat_or_products
                       end
        from = params[:from_date]
        to = params[:to_date]
        user_label = params[:user_label]
        by_created_at = params[:filter_created_at] || false

        sample_scope = sample_scope.created_time_from(Time.zone.at(from)) if from && by_created_at
        sample_scope = sample_scope.created_time_to(Time.zone.at(to) + 1.day) if to && by_created_at
        sample_scope = sample_scope.updated_time_from(Time.zone.at(from)) if from && !by_created_at
        sample_scope = sample_scope.updated_time_to(Time.zone.at(to) + 1.day) if to && !by_created_at
        sample_scope = sample_scope.by_user_label(user_label) if user_label

        sample_list = []

        if params[:molecule_sort] == 1
          molecule_scope = Molecule
                           .where(id: (sample_scope.pluck :molecule_id))
                           .order(Arel.sql("LENGTH(SUBSTRING(sum_formular, 'C\\d+'))"))
                           .order(:sum_formular)
          reset_pagination_page(molecule_scope)
          paginate(molecule_scope).each do |molecule|
            samples_group = sample_scope.select { |v| v.molecule_id == molecule.id }
            samples_group = samples_group.sort { |x, y| y.updated_at <=> x.updated_at }
            samples_group.each do |sample|
              detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
              sample_list.push(
                Entities::SampleEntity.represent(sample, detail_levels: detail_levels, displayed_in_list: true),
              )
            end
          end
        else
          reset_pagination_page(sample_scope)
          sample_scope = sample_scope.order('samples.updated_at DESC')
          paginate(sample_scope).each do |sample|
            detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
            sample_list.push(
              Entities::SampleEntity.represent(sample, detail_levels: detail_levels, displayed_in_list: true),
            )
          end
        end

        return {
          samples: sample_list,
          samples_count: sample_scope.count,
        }
      end

      desc 'Return serialized sample by id'
      params do
        requires :id, type: Integer, desc: 'Sample id'
      end
      route_param :id do
        after_validation do
          @element_policy = ElementPolicy.new(current_user, Sample.find(params[:id]))
          error!('401 Unauthorized', 401) unless @element_policy.read?
        rescue ActiveRecord::RecordNotFound
          error!('404 Not Found', 404)
        end

        get do
          sample = Sample.includes(:molecule, :residues, :elemental_compositions, :container, :reactions_samples)
                         .find(params[:id])
          {
            sample: Entities::SampleEntity.represent(
              sample,
              detail_levels: ElementDetailLevelCalculator
                .new(user: current_user, element: sample)
                .detail_levels,
              policy: @element_policy,
            ),
            literatures: Entities::LiteratureEntity.represent(
              citation_for_elements(params[:id], 'Sample'),
              with_user_info: true,
            ),
          }
        end
      end

      namespace :findByShortLabel do
        desc 'Fetch sample id and collection based on short label'
        params do
          requires :short_label, type: String, desc: 'Unique short label of sample'
        end
        route_param :short_label do
          get do
            finder = Usecases::Samples::FindByShortLabel.new(params[:short_label], current_user)

            finder.result
          end
        end
      end

      desc 'Update sample by id'
      params do
        requires :id, type: Integer, desc: 'Sample id'
        optional :name, type: String, desc: 'Sample name'
        optional :external_label, type: String, desc: 'Sample external label'
        optional :imported_readout, type: String, desc: 'Sample Imported Readout'
        optional :target_amount_value, type: Float, desc: 'Sample target amount_value'
        optional :target_amount_unit, type: String, desc: 'Sample target amount_unit'
        optional :real_amount_value, type: Float, desc: 'Sample real amount_value'
        optional :real_amount_unit, type: String, desc: 'Sample real amount_unit'
        optional :molarity_value, type: Float, desc: 'Sample molarity value'
        optional :molarity_unit, type: String, desc: 'Sample real amount_unit'
        optional :description, type: String, desc: 'Sample description'
        optional :metrics, type: String, desc: 'Sample metric units'
        optional :purity, type: Float, desc: 'Sample purity'
        optional :solvent, type: [Hash], desc: 'Sample solvent'
        optional :location, type: String, desc: 'Sample location'
        optional :molfile, type: String, desc: 'Sample molfile'
        optional :sample_svg_file, type: String, desc: 'Sample SVG file'
        optional :dry_solvent, default: false, type: Boolean, desc: 'Sample dry solvent'
        # optional :molecule, type: Hash, desc: "Sample molecule" do
        #   optional :id, type: Integer
        # end
        optional :molecule_id, type: Integer
        optional :is_top_secret, type: Boolean, desc: 'Sample is marked as top secret?'
        optional :density, type: Float, desc: 'Sample density'
        optional :boiling_point_upperbound, type: Float, desc: 'upper bound of sample boiling point'
        optional :boiling_point_lowerbound, type: Float, desc: 'lower bound of sample boiling point'
        optional :melting_point_upperbound, type: Float, desc: 'upper bound of sample melting point'
        optional :melting_point_lowerbound, type: Float, desc: 'lower bound of sample melting point'
        optional :residues, type: Array
        optional :segments, type: Array
        optional :elemental_compositions, type: Array
        optional :xref, type: Hash
        optional :stereo, type: Hash do
          optional :abs, type: String, values: Sample::STEREO_ABS, default: Sample::STEREO_DEF['abs']
          optional :rel, type: String, values: Sample::STEREO_REL, default: Sample::STEREO_DEF['rel']
        end
        optional :molecule_name_id, type: Integer
        requires :container, type: Hash
        optional :user_labels, type: Array
        optional :decoupled, type: Boolean, desc: 'Sample is decoupled from structure?', default: false
        optional :inventory_sample, type: Boolean, default: false
        optional :molecular_mass, type: Float
        optional :sum_formula, type: String
        optional :collection_id, type: Integer, desc: 'Collection id'
        # use :root_container_params
        optional :sample_type, type: String, default: 'Micromolecule', values: Sample::SAMPLE_TYPES
        optional :sample_details, type: Hash, desc: 'extra params for mixtures or polymers'
        optional :literatures, type: Hash

        # Hierarchical sample params
        optional :state, type: String, desc: 'state of the Hierarchical sample'
        optional :color, type: String, desc: 'color of the Hierarchical sample'
        optional :height, type: String, desc: 'dimension of the Hierarchical sample HXWXL'
        optional :width, type: String, desc: 'dimension of the Hierarchical sample HXWXL'
        optional :length, type: String, desc: 'dimension of the Hierarchical sample HXWXL'
        optional :storage_condition, type: String, desc: 'storage condition of the Hierarchical sample'
      end

      route_param :id do
        before do
          @sample = Sample.find(params[:id])
          @element_policy = ElementPolicy.new(current_user, @sample)
          error!('401 Unauthorized', 401) unless @element_policy.update?
        end
        put do
          attributes = declared(params, include_missing: false)
          # attributes[:solvent] = params[:solvent].to_json
          attributes[:solvent] = params[:solvent]
          attributes.delete(:literatures)

          update_datamodel(attributes[:container])
          attributes.delete(:container)

          update_element_labels(@sample, attributes[:user_labels], current_user.id)
          attributes.delete(:user_labels)
          attributes.delete(:segments)

          # otherwise ActiveRecord::UnknownAttributeError appears
          attributes[:elemental_compositions]&.each do |i|
            i.delete :description
          end

          # set nested attributes
          %i[molecule residues elemental_compositions].each do |prop|
            prop_value = attributes.delete(prop)
            next if prop_value.blank?

            attributes.merge!(
              "#{prop}_attributes": prop_value,
            )
          end

          boiling_point_lowerbound = params['boiling_point_lowerbound'].presence || -Float::INFINITY
          boiling_point_upperbound = params['boiling_point_upperbound'].presence || Float::INFINITY
          melting_point_lowerbound = params['melting_point_lowerbound'].presence || -Float::INFINITY
          melting_point_upperbound = params['melting_point_upperbound'].presence || Float::INFINITY
          attributes['boiling_point'] = Range.new(boiling_point_lowerbound, boiling_point_upperbound)
          attributes['melting_point'] = Range.new(melting_point_lowerbound, melting_point_upperbound)
          attributes.delete(:boiling_point_lowerbound)
          attributes.delete(:boiling_point_upperbound)
          attributes.delete(:melting_point_lowerbound)
          attributes.delete(:melting_point_upperbound)

          inventory_label = params[:xref]&.fetch(:inventory_label, nil)

          if inventory_label
            inventory_label_changed = @sample.xref['inventory_label'] != inventory_label
            collection_id = params[:collection_id]
            condition = inventory_label_changed && !collection_id.nil?
            # update inventory_label only if sample inventory label has a new value
            @sample.update_inventory_label(inventory_label, collection_id) if condition
          end
          # remove collection_id from sample attributes after updating inventory label
          attributes.delete(:collection_id)

          @sample.update!(attributes)
          @sample.save_segments(segments: params[:segments], current_user_id: current_user.id)

          # save to profile
          kinds = @sample.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          present(
            @sample,
            with: Entities::SampleEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: @sample).detail_levels,
            policy: @element_policy,
            root: :sample,
          )
        rescue ActiveRecord::RecordNotUnique => e
          # Extract the column or index name from the error message
          match = e.message.match(/duplicate key value violates unique constraint "(?<index_name>.+)"/)
          index_name = match[:index_name] if match

          error_info = {
            error_type: 'ActiveRecord::RecordNotUnique',
            index_name: index_name,
          }
          error!(error_info, 500)
        end
      end

      desc 'Create a sample'
      params do
        optional :name, type: String, desc: 'Sample name'
        optional :short_label, type: String, desc: 'Sample short label'
        optional :external_label, type: String, desc: 'Sample external label'
        optional :imported_readout, type: String, desc: 'Sample Imported Readout'
        requires :target_amount_value, type: Float, desc: 'Sample target amount_value'
        requires :target_amount_unit, type: String, desc: 'Sample target amount_unit'
        optional :real_amount_value, type: Float, desc: 'Sample real amount_value'
        optional :real_amount_unit, type: String, desc: 'Sample real amount_unit'
        optional :molarity_value, type: Float, desc: 'Sample molarity value'
        optional :molarity_unit, type: String, desc: 'Sample real amount_unit'
        requires :description, type: String, desc: 'Sample description'
        requires :purity, type: Float, desc: 'Sample purity'
        optional :dry_solvent, default: false, type: Boolean, desc: 'Sample dry solvent'
        # requires :solvent, type: String, desc: "Sample solvent"
        optional :solvent, type: [Hash], desc: 'Sample solvent', default: []
        requires :location, type: String, desc: 'Sample location'
        optional :molfile, type: String, desc: 'Sample molfile'
        optional :sample_svg_file, type: String, desc: 'Sample SVG file'
        # optional :molecule, type: Hash, desc: "Sample molecule"
        optional :collection_id, type: Integer, desc: 'Collection id'
        requires :is_top_secret, type: Boolean, desc: 'Sample is marked as top secret?'
        optional :density, type: Float, desc: 'Sample density'
        optional :boiling_point_upperbound, type: Float, desc: 'upper bound of sample boiling point'
        optional :boiling_point_lowerbound, type: Float, desc: 'lower bound of sample boiling point'
        optional :melting_point_upperbound, type: Float, desc: 'upper bound of sample melting point'
        optional :melting_point_lowerbound, type: Float, desc: 'lower bound of sample melting point'
        optional :residues, type: Array
        optional :segments, type: Array
        optional :user_labels, type: Array
        optional :elemental_compositions, type: Array
        optional :xref, type: Hash
        optional :stereo, type: Hash do
          optional :abs, type: String, values: Sample::STEREO_ABS, default: Sample::STEREO_DEF['abs']
          optional :rel, type: String, values: Sample::STEREO_REL, default: Sample::STEREO_DEF['rel']
        end
        optional :molecule_name_id, type: Integer
        optional :molecule_id, type: Integer
        optional :literatures, type: Hash
        requires :container, type: Hash
        optional :decoupled, type: Boolean, desc: 'Sample is decoupled from structure?', default: false
        optional :inventory_sample, type: Boolean, default: false
        optional :molecular_mass, type: Float
        optional :sum_formula, type: String
        optional :sample_type, type: String, default: 'Micromolecule', values: Sample::SAMPLE_TYPES
        optional :sample_details, type: Hash, desc: 'extra params for mixtures or polymers'
      end
      post do
        molecule_id = if params[:decoupled] && params[:molfile].blank?
                        Molecule.find_or_create_dummy&.id
                      else
                        params[:molecule_id]
                      end
        attributes = {
          name: params[:name],
          short_label: params[:short_label],
          external_label: params[:external_label],
          target_amount_value: params[:target_amount_value],
          target_amount_unit: params[:target_amount_unit],
          real_amount_value: params[:real_amount_value],
          real_amount_unit: params[:real_amount_unit],
          molarity_value: params[:molarity_value],
          molarity_unit: params[:molarity_unit],
          description: params[:description],
          purity: params[:purity],
          dry_solvent: params[:dry_solvent],
          solvent: params[:solvent],
          location: params[:location],
          molfile: params[:molfile],
          molecule_id: molecule_id,
          sample_svg_file: params[:sample_svg_file],
          is_top_secret: params[:is_top_secret],
          density: params[:density],
          residues: params[:residues],
          elemental_compositions: params[:elemental_compositions],
          created_by: current_user.id,
          xref: params[:xref],
          stereo: params[:stereo],
          molecule_name_id: params[:molecule_name_id],
          decoupled: params[:decoupled],
          inventory_sample: params[:inventory_sample],
          molecular_mass: params[:molecular_mass],
          sum_formula: params[:sum_formula],
          sample_type: params[:sample_type],
          sample_details: params[:sample_details],
        }

        boiling_point_lowerbound = params['boiling_point_lowerbound'].presence || -Float::INFINITY
        boiling_point_upperbound = params['boiling_point_upperbound'].presence || Float::INFINITY
        melting_point_lowerbound = params['melting_point_lowerbound'].presence || -Float::INFINITY
        melting_point_upperbound = params['melting_point_upperbound'].presence || Float::INFINITY
        attributes['boiling_point'] = Range.new(boiling_point_lowerbound, boiling_point_upperbound)
        attributes['melting_point'] = Range.new(melting_point_lowerbound, melting_point_upperbound)

        # otherwise ActiveRecord::UnknownAttributeError appears
        # TODO should be in params validation
        attributes[:elemental_compositions]&.each do |i|
          i.delete :description
          i.delete :id
        end

        attributes[:residues]&.each do |i|
          i.delete :id
        end

        # set nested attributes
        %i[molecule residues elemental_compositions].each do |prop|
          prop_value = attributes.delete(prop)
          next if prop_value.blank?

          attributes.merge!(
            "#{prop}_attributes": prop_value,
          )
        end
        attributes.delete(:segments)
        attributes.delete(:user_labels)
        literatures = attributes.delete(:literatures)

        sample = Sample.new(attributes)

        if params[:collection_id]
          collection = current_user.collections.find_by(id: params[:collection_id])
          sample.collections << collection if collection.present?
        end

        is_shared_collection = false
        if collection.blank?
          sync_collection = current_user.all_sync_in_collections_users.find_by(id: params[:collection_id])
          if sync_collection.present?
            is_shared_collection = true
            sample.collections << Collection.find(sync_collection['collection_id'])
            sample.collections << Collection.get_all_collection_for_user(sync_collection['shared_by_id'])
          end
        end

        unless is_shared_collection
          all_coll = Collection.get_all_collection_for_user(current_user.id)
          sample.collections << all_coll
        end

        sample.container = update_datamodel(params[:container])
        sample.update_inventory_label(params[:xref][:inventory_label], params[:collection_id])
        sample.save!

        create_literatures_and_literals(sample, literatures)

        update_element_labels(sample, params[:user_labels], current_user.id)
        sample.save_segments(segments: params[:segments], current_user_id: current_user.id)

        # save to profile
        kinds = sample.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
        recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

        present sample, with: Entities::SampleEntity, root: :sample
      end

      desc 'Delete a sample by id'
      params do
        requires :id, type: Integer, desc: 'Sample id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Sample.find(params[:id])).destroy?
        end

        delete do
          sample = Sample.find(params[:id])
          sample.destroy
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength, Lint/UselessAssignment

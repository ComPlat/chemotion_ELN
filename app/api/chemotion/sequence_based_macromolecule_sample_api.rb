# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength
module Chemotion
  class SequenceBasedMacromoleculeSampleAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
    helpers ContainerHelpers
    helpers CollectionHelpers

    rescue_from ::Usecases::Sbmm::Errors::SbmmUpdateNotAllowedError do |conflict|
      error!(
        {
          error: {
            message: conflict.message,
            original_sbmm: Entities::SequenceBasedMacromoleculeEntity.represent(conflict.original_sbmm),
            requested_changes: Entities::SequenceBasedMacromoleculeEntity.represent(conflict.requested_changes)
          }
        },
        403
      )
    end

    rescue_from ::Usecases::Sbmm::Errors::ForbiddenUniprotDerivationChangeError do |error|
      error!(
        {
          error: {
            message: error.message,
            requested_changes: Entities::SequenceBasedMacromoleculeEntity.represent(error.requested_changes)
          }
        },
        400
      )
    end

    rescue_from Grape::Exceptions::ValidationErrors do |exception|
      errors = []
      exception.each do |parameters, error|
        errors << { parameters: parameters, message: error.to_s }
      end
      error!(errors, 422)
    end

    resource :sequence_based_macromolecule_samples do
      desc 'Get a list of SBMM-Samples, filtered by collection'
      params do
        optional :collection_id, type: Integer
        optional :sync_collection_id, type: Integer
        optional :list_order, type: String, values: %w[sbmm sbmm_sequence]
        optional(:filter, type: Hash) do
          optional :timestamp_field, type: String, default: 'created_at', values: %w[created_at updated_at]
          optional :after_timestamp, type: Integer, desc: 'timestamp in ms'
          optional :before_timestamp, type: Integer, desc: 'timestamp in ms'
        end
      end
      paginate per_page: 7, offset: 0, max_per_page: 100
      get do
        sample_scope = Usecases::Sbmm::Samples.new(current_user: current_user).list(params)
        reset_pagination_page(sample_scope) # prevent fetching pages without results

        sbmm_samples = paginate(sample_scope).map do |sbmm_sample|
          Entities::SequenceBasedMacromoleculeSampleEntity.represent(sbmm_sample)
        end

        { sequence_based_macromolecule_samples: sbmm_samples }
      end

      desc 'Fetch a SBMM sample by id'
      get ':id' do
        sbmm_sample = SequenceBasedMacromoleculeSample.find(params[:id])
        policy = ElementPolicy.new(current_user, sbmm_sample)
        error!('401 Unauthorized', 401) unless policy.read?

        present(
          sbmm_sample,
          with: Entities::SequenceBasedMacromoleculeSampleEntity,
          policy: policy,
          root: :sequence_based_macromolecule_sample,
        )
      rescue ActiveRecord::RecordNotFound
        error!('404 Not Found', 404)
      end

      desc 'Create SBMM sample'
      params do
        use :sbmm_sample_params
      end
      post do
        sbmm_sample = Usecases::Sbmm::Sample.new(current_user: current_user).create(declared(params,
                                                                                             evaluate_given: true))

        present sbmm_sample, with: Entities::SequenceBasedMacromoleculeSampleEntity,
                             root: :sequence_based_macromolecule_sample
      end

      desc 'Update SBMM sample by id'
      params do
        use :sbmm_sample_params
      end
      route_param :id do
        before do
          @sbmm_sample = SequenceBasedMacromoleculeSample.find(params[:id])
          @policy = ElementPolicy.new(current_user, @sbmm_sample)
          error!('401 Unauthorized', 401) unless @policy.update?
        end

        put do
          Usecases::Sbmm::Sample.new(current_user: current_user)
                                .update(@sbmm_sample, declared(params, evaluate_given: true))
          present(
            @sbmm_sample,
            with: Entities::SequenceBasedMacromoleculeSampleEntity,
            policy: @policy,
            root: :sequence_based_macromolecule_sample,
          )
        end
      end

      desc 'Delete a SBMM sample by id'
      params do
        requires :id, type: Integer, desc: 'Sample id'
      end
      route_param :id do
        before do
          unless ElementPolicy.new(current_user, SequenceBasedMacromoleculeSample.find(params[:id])).destroy?
            error!('401 Unauthorized', 401)
          end
        end

        delete do
          sample = SequenceBasedMacromoleculeSample.find(params[:id])
          sample.destroy
        end
      end

      namespace :ui_state do
        desc 'Get samples by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected SBMM samples from the UI' do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
            optional :from_date, type: Date
            optional :to_date, type: Date
            optional :collection_id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
          optional :limit, type: Integer, desc: 'Limit number of SBMM samples'
        end

        before do
          cid = fetch_collection_id_w_current_user(params[:ui_state][:collection_id], params[:ui_state][:is_sync_to_me])
          @sbmm_samples = SequenceBasedMacromoleculeSample.by_collection_id(cid).by_ui_state(params[:ui_state])
                                                          .for_user(current_user.id)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @sbmm_samples).read?
        end

        # we are using POST because the fetchers don't support GET requests with body data
        post do
          @sbmm_samples = @sbmm_samples.limit(params[:limit]) if params[:limit]

          present @sbmm_samples, with: Entities::SequenceBasedMacromoleculeSampleEntity,
                                 root: :sequence_based_macromolecule_samples
        end
      end

      namespace :sub_sequence_based_macromolecule_samples do
        desc 'Split SBMM Samples into Subsample'
        params do
          requires :ui_state, type: Hash, desc: 'Selected SBMM samples from the UI' do
            requires :sequence_based_macromolecule_sample, type: Hash do
              optional :all, type: Boolean, default: false
              optional :included_ids, type: Array
              optional :excluded_ids, type: Array
            end
            requires :currentCollectionId, type: Integer
            optional :isSync, type: Boolean, default: false
          end
        end
        post do
          ui_state = params[:ui_state]
          collection_id = ui_state[:currentCollectionId]
          sbmm_sample_ids =
            SequenceBasedMacromoleculeSample.for_user(current_user.id)
                                            .for_ui_state_with_collection(
                                              ui_state[:sequence_based_macromolecule_sample],
                                              CollectionsSequenceBasedMacromoleculeSample,
                                              collection_id,
                                            )
          SequenceBasedMacromoleculeSample.where(id: sbmm_sample_ids).find_each do |sbmm_sample|
            sbmm_sample.create_sub_sequence_based_macromolecule_sample(current_user, collection_id)
          end

          {} # JS layer does not use the reply
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength

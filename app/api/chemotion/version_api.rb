# frozen_string_literal: true

require 'open-uri'

module Chemotion
  class VersionAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers

    helpers do
      # resolve the reverter through the allowlist, never constantize the client supplied name; its scope also
      # finds soft deleted records, which is needed to restore them
      def revert_record(change)
        reverter = Versioning::Reverter::ALLOWED_REVERTERS
                   .index_with { |name| "Versioning::Reverters::#{name}Reverter".constantize }[change['klass_name']]
        error!("Unknown change type: #{change['klass_name']}", 400) unless reverter

        reverter.scope.find(change['db_id'])
      end

      # a literal is not an element itself, reverting it is an edit of the element it is attached to
      def literals_revertible?(changes)
        changes.select { |change| change['klass_name'] == 'Literal' }.all? do |change|
          ElementPolicy.new(current_user, revert_record(change).element).update?
        end
      end
    end

    namespace :versions do
      after_validation do
        resource = namespace.split('/')[2]
        if resource == 'revert'
          result = params[:changes].all? { |change| ElementPolicy.new(current_user, revert_record(change)) }
          error!('401 Unauthorized', 401) unless result && literals_revertible?(params[:changes])
        else
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user,
                                                                   resource.classify.constantize.find(params[:id]))
                                                              .read?
        end
      end
      resource :samples do
        desc 'Return versions of the given sample'

        params do
          requires :id, type: Integer, desc: 'Sample id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            sample = Sample.with_log_data.find(params[:id])
            versions = Versioning::Fetcher.call(sample)

            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :reactions do
        desc 'Return versions of the given reaction'

        params do
          requires :id, type: Integer, desc: 'Reaction id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            reaction = Reaction.with_log_data.find(params[:id])
            versions = Versioning::Fetcher.call(reaction)

            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :research_plans do
        desc 'Return versions of the given research plan'

        params do
          requires :id, type: Integer, desc: 'Research plan id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            research_plan = ResearchPlan.with_log_data.find(params[:id])
            versions = Versioning::Fetcher.call(research_plan)

            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :screens do
        desc 'Return versions of the given screen'

        params do
          requires :id, type: Integer, desc: 'Screen id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            screen = Screen.with_log_data.find(params[:id])
            versions = Versioning::Fetcher.call(screen)

            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :wellplates do
        desc 'Return versions of the given wellplate'

        params do
          requires :id, type: Integer, desc: 'Wellplate id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            wellplate = Wellplate.with_log_data.find(params[:id])
            versions = Versioning::Fetcher.call(wellplate)
            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :device_descriptions do
        desc 'Return versions of the given device description'

        params do
          requires :id, type: Integer, desc: 'Device description id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            device_description = DeviceDescription.with_log_data.find(params[:id])

            versions = Versioning::Fetcher.call(device_description)
            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :revert do
        desc 'Revert selected changes'

        params do
          requires :changes, type: JSON, desc: 'Changes hash'
        end

        post do
          Versioning::Reverter.call(params[:changes])
        end
      end
    end
  end
end

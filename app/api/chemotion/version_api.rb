# frozen_string_literal: true

require 'open-uri'

module Chemotion
  class VersionAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers

    namespace :versions do
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

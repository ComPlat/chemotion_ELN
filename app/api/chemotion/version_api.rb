# frozen_string_literal: true

require 'open-uri'

module Chemotion
  class VersionAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers

    namespace :versions do
      after_validation do
        resource = namespace.split('/')[2]
        if resource == 'revert'
          result = params[:changes].reduce do |res, change|
            res && ElementPolicy.new(current_user, change['klass_name'].constantize.find(change['db_id']))
          end
          error!('401 Unauthorized', 401) unless result
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

      resource :cellline_sample do
        desc 'Return versions of the given cell line sample'

        params do
          requires :id, type: Integer, desc: 'cell line sample id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            cellline_sample = CelllineSample.with_log_data.find(params[:id])

            versions = Versioning::Fetcher.call(cellline_sample)
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

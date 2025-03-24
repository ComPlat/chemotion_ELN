# frozen_string_literal: true

require 'open-uri'

module Chemotion
  class VersionAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers

    helpers do
      def filter_hash(hash1, hash2)
        result = {}
        return result unless hash1.present? && hash2.present?

        hash1.each do |key, value|
          next unless hash2.key?(key)

          result[key] = if value.is_a?(Hash)
                          filter_hash(value, hash2[key])
                        else
                          hash2[key]
                        end
        end

        result
      end
    end

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
            versions.each do |v|
              v[:changes].each do |c|
                next unless c[:fields]['variations']

                old_value = c[:fields]['variations'][:old_value].split("\n").map do |variation|
                  JSON.parse(variation.gsub('=>', ':').gsub('nil', 'null'))
                end
                old_value = [] if old_value.empty?

                new_value = c[:fields]['variations'][:new_value].split("\n").map do |variation|
                  JSON.parse(variation.gsub('=>', ':').gsub('nil', 'null'))
                end
                new_value = [] if new_value.empty?

                c[:fields]['variations'][:old_value] = ActiveRecord::Base.connection.execute(
                  "select jsonb_diff('#{new_value.to_json}', '#{old_value.to_json}');",
                )[0]['jsonb_diff']
                c[:fields]['variations'][:new_value] = ActiveRecord::Base.connection.execute(
                  "select jsonb_diff('#{old_value.to_json}', '#{new_value.to_json}');",
                )[0]['jsonb_diff']

                if c[:fields]['variations'][:current_value].empty?
                  c[:fields]['variations'][:current_value] = []
                else

                  current_value = c[:fields]['variations'][:current_value].split("\n").map do |variation|
                    JSON.parse(variation.gsub('=>', ':').gsub('nil', 'null'))
                  end

                  new_value = JSON.parse(c[:fields]['variations'][:new_value])

                  if new_value.present?
                    current_value = current_value.each_with_index.map do |variation, i|
                      filter_hash(new_value[i], variation)
                    end

                    c[:fields]['variations'][:current_value] = current_value.to_json
                  end
                end
              end
            end

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

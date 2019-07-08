
module Chemotion
    # OLS Terms API
    # rubocop:disable ClassLength
    class OlsTermsAPI < Grape::API
      # rubocop:disable Metrics/BlockLength
      namespace :ols_terms do
        desc 'Get List'
        params do
          requires :name, type: String, desc: "OLS Name", values: %w[chmo rxno]
        end
        get 'list' do
          list = OlsTerm.where(owl_name: params[:name], is_enabled: true).arrange_serializable(:order => :label)
          result = present(list, with: Entities::OlsTermEntity)

          recent_term_ids = current_user.profile && current_user.profile.data && current_user.profile.data[params[:name]]
          unless recent_term_ids.nil?
            ols = OlsTerm.where(owl_name: params[:name], term_id: recent_term_ids)
            .select(
              <<~SQL
              owl_name, ' ' || term_id as term_id, ancestry, label, synonym, synonyms
              SQL
              ).order("label").as_json
            unless ols.nil? || ols.length == 0
              entities = Entities::OlsTermEntity.represent(ols, serializable: true)
              result.unshift({'key': params[:name], 'title': '-- Recently selected --', selectable: false, 'children': entities})
            end
          end
          {ols_terms: result}
        end
      end
    end
end

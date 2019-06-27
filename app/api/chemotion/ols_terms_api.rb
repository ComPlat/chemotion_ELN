
module Chemotion
    # OLS Terms API
    # rubocop:disable ClassLength
    class OlsTermsAPI < Grape::API
      # rubocop:disable Metrics/BlockLength
      namespace :ols_terms do
        desc 'Get List'
        params do
          requires :name, type: String, desc: "OLS Name", values: %w[chmo rxno]
          optional :is_enabled, type: Boolean, default: true, desc: 'Only list is_enabled ols terms'
        end

        get 'list' do
          unless params[:is_enabled]
            list = OlsTerm.where(owl_name: params[:name]).arrange_serializable(:order => :label)
            return { ols_terms: present(list, with: Entities::OlsTermEntity) }
          end

          list = OlsTerm.where(owl_name: params[:name], is_enabled: true)
                        .arrange_serializable(:order => :label)
          result = present(list, with: Entities::OlsTermEntity)
          
          recent_term_ids = current_user.profile&.data&.fetch(params[:name], nil)
          if recent_term_ids.present?
            ols = OlsTerm.where(owl_name: params[:name], term_id: recent_term_ids)
              .select(<<~SQL
                        owl_name, ' ' || term_id as term_id, ancestry, label, synonym, synonyms
                        -- owl_name, term_id, ancestry, label || ' ' as label, synonym, synonyms
                      SQL
              ).order("label").as_json
            if ols.present?
              entities = Entities::OlsTermEntity.represent(ols, serializable: true)
              result.unshift({'key': params[:name], 'title': '-- Recently selected --', selectable: false, 'children': entities})
            end
          end
          { ols_terms: result }
        end

        get 'root' do
          list = OlsTerm.where(owl_name: params[:name], is_enabled: true, ancestry: nil)
          { ols_terms: present(list, with: Entities::OlsTermEntity) }
        end
      end
    end
end

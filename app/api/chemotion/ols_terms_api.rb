
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
          list = OlsTerm.where(ols_name: params[:name], is_enabled: true).arrange_serializable(:order => :label)
          result = present(list, with: Entities::OlsTermEntity)
          #recent_term_ids = current_user.profile && current_user.profile.data && 
          #current_user.profile.data['ols'] && current_user.profile.data['ols'][params[:name]]

          # unless recent_term_ids.nil?
          #   ols = OlsTerm.where(term_id: recent_term_ids).order("label").as_json          
          #   entities = Entities::OlsTermEntity.represent(ols, serializable: true)
          #   result.unshift({'key': params[:name], 'title': 'Recent', selectable: false, 'children': entities})
          # end

          {ols_terms: result}
        end
      end
    end
end

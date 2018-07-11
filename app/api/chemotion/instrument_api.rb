module Chemotion
  class InstrumentAPI < Grape::API

    helpers InstrumentHelpers

    resource :instruments do
      route_param :query, type: String, values: %w[all samples reactions wellplates screens] do
        desc 'Return all instruments by user id for AutoCompleteInstrument'
        get do
          params[:query]
          { instruments: db_exec_query_instruments_sql(current_user.id,params[:query]) }
        end
      end
    end
  end
end

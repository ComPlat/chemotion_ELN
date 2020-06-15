module InstrumentHelpers
  extend Grape::API::Helpers

  def db_exec_query_instruments_sql(user_id,query)
    sql = ActiveRecord::Base.send(:sanitize_sql_array, ["select user_instrument(?, ?) as name", user_id, query.strip])
    return ActiveRecord::Base.connection.exec_query(sql)
  end
end

module InstrumentHelpers
  extend Grape::API::Helpers

  def db_exec_query_instruments_sql(user_id,query)
    sql = "select user_instrument(#{user_id.to_s},'#{query.strip}') as name"
    return ActiveRecord::Base.connection.exec_query(sql)
  end
end

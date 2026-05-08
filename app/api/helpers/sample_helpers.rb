module SampleHelpers
  extend Grape::API::Helpers

  def db_exec_detail_level_for_sample(user_id, sample_id)
    sql = 'SELECT detail_level_sample, detail_level_wellplate FROM detail_level_for_sample($1, $2)'
    ActiveRecord::Base.connection.exec_query(sql, 'detail_level_for_sample', [[nil, user_id], [nil, sample_id]])
  end
end

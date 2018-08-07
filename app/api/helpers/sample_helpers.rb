module SampleHelpers
  extend Grape::API::Helpers

  def db_exec_detail_level_for_sample(user_id, sample_id)
    sql = "select detail_level_sample, detail_level_wellplate from detail_level_for_sample(#{user_id},#{sample_id})"
    ActiveRecord::Base.connection.exec_query(sql)
  end

end

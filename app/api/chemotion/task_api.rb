# frozen_string_literal: true

module Chemotion
  class TaskAPI < Grape::API
    resource :tasks do
      desc 'Create Task'
      params do
        requires :sample_id, type: Integer, desc: 'Sample Id'
      end
      before do
        @sample = Sample.find(params[:sample_id])
        @element_policy = ElementPolicy.new(current_user, @sample)
        error!('401 Unauthorized', 401) unless @element_policy.read?
      end
      post do
        task = Task.create!(
          sample_id: @sample.id,
          created_by: current_user.id
        )
      end
    end
  end
end

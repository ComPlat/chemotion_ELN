# frozen_string_literal: true

module Entities
  class JobEntity < Grape::Entity
    expose :id, :queue
    expose :run_at do |obj|
      return nil unless obj.respond_to? :run_at
      obj.run_at.strftime('%d.%m.%Y, %H:%M') unless obj.run_at.nil?
    end
    expose :failed_at do |obj|
      return nil unless obj.respond_to? :failed_at
      obj.failed_at.strftime('%d.%m.%Y, %H:%M') unless obj.failed_at.nil?
    end
    expose :attempts, :priority, :handler, :last_error
  end
end

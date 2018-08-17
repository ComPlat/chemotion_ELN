# frozen_string_literal: true

# Module for attachable behaviour
module Attachable
  extend ActiveSupport::Concern

  included do
    belongs_to :attachable, polymorphic: true

    scope :where_container, lambda { |c_id|
      where(attachable_id: c_id, attachable_type: 'Container')
    }

    scope :where_report, lambda { |r_id|
      where(attachable_id: r_id, attachable_type: 'Report')
    }
  end

  def for_container?
    attachable_type == 'Container'
  end

  def for_report?
    attachable_type == 'Report'
  end

  def container_id
    for_container? ? attachable_id : nil
  end

  def report_id
    for_report? ? attachable_id : nil
  end

  def container
    for_container? ? attachable : nil
  end

  def report
    for_report? ? attachable : nil
  end

  def update_container!(c_id)
    update!(attachable_id: c_id, attachable_type: 'Container')
  end

  def update_report!(r_id)
    update!(attachable_id: r_id, attachable_type: 'Report')
  end
end

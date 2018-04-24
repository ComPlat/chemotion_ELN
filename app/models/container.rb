class Container < ActiveRecord::Base
  include ElementCodes
  belongs_to :containable, polymorphic: true
  has_many :attachments
  # TODO: dependent destroy for attachments should be implemented when attachment get paranoidized instead of this DJ
  before_destroy :delete_attachment
  has_closure_tree

  def analyses
    if self.children
      analyses = self.children.where(container_type: 'analyses').first

      return analyses.children.where(container_type: 'analysis') if analyses
    end
    Container.none
  end

  def root_element
    self.root.containable
  end

  def self.create_root_container(**args)
    root_con = Container.create(name: 'root', container_type: 'root', **args)
    root_con.children.create(container_type: 'analyses')
    root_con
  end

  private

  def delete_attachment
    if Rails.env.production?
      attachments.each { |attachment|
        attachment.delay(run_at: 96.hours.from_now, queue: 'attachment_deletion').destroy!
      }
    else
      attachments.each(&:destroy!)
    end
  end
end

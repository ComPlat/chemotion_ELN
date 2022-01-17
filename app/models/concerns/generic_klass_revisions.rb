
module GenericKlassRevisions
  extend ActiveSupport::Concern
  included do
    # has_many :element_klasses_revisions, dependent: :destroy
  end

  def create_klasses_revision(user_id=0)
    self.update!({ uuid: properties_template['uuid'], properties_release: properties_template, released_at: DateTime.now })
    reload
    attributes = {
      released_by: user_id,
      uuid: uuid,
      properties_release: properties_template,
      released_at: released_at
    }
    attributes["#{self.class.name.underscore}_id"] = id
    "#{self.class.name}esRevision".constantize.create(attributes)
  end
end
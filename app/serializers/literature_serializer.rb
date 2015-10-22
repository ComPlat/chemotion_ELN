class LiteratureSerializer < ActiveModel::Serializer
  attributes :id, :title, :url, :type, :created_at, :updated_at,

  def type
    'literature'
  end
end

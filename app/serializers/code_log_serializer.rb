class CodeLogSerializer < ActiveModel::Serializer
  attributes :id, :value, :source, :source_id, :root_code

  def root_code
    return {} unless object.source == "container"
    element = Container.find(object.source_id).root.containable
    element && self.class.new(element.code_log).serializable_hash.deep_symbolize_keys || {}
  end

end

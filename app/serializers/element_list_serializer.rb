class ElementListSerializer
end

class ElementListSerializer::Level10 < ElementSerializer::Level10
  include ElementLevelListSerializable
  list_restricted_methods
end

class ElementListSerializer::Level0 < ElementSerializer::Level0
  include ElementLevelListSerializable
  list_restricted_methods
end

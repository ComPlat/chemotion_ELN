class ReactionListSerializer
end

class ReactionListSerializer::Level10 < ReactionSerializer::Level10
  include ReactionLevelListSerializable
  list_restricted_methods
end

class ReactionListSerializer::Level0 < ReactionSerializer::Level0
  include ReactionLevelListSerializable
  list_restricted_methods
end

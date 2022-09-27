# frozen_string_literal: true

RSpec::Matchers.define :define_gql_field do |field_name|
  match do |klass|
    @klass = klass
    [field_is_defined?(field_name),
     field_with_right_type_class?(field_name, @type_class),
     field_is_list?(field_name, @check_for_list),
     field_with_right_resolver_class?(field_name, @resolver_class)].all?
  end

  chain :with_type do |type_class|
    @type_class = type_class
  end

  chain :with_resolver do |resolver_class|
    @resolver_class = resolver_class
  end

  chain :as_list do
    @check_for_list = true
  end

  def field_is_defined?(field_name)
    @klass.fields.key?(field_name.to_s.camelcase(:lower))
  end

  def field_with_right_type_class?(field_name, type_class)
    return true if type_class.blank?

    field = @klass.get_field(field_name.to_s.camelcase(:lower))
    type = field.type

    [type, type.try(:of_type), type.try(:of_type).try(:of_type)].include?(type_class)
  end

  def field_with_right_resolver_class?(field_name, resolver_class)
    return true if resolver_class.blank?

    field = @klass.get_field(field_name.to_s.camelcase(:lower))

    field.resolver == resolver_class
  end

  def field_is_list?(field_name, check_for_list)
    return true if check_for_list.blank?

    @klass.get_field(field_name.to_s.camelcase(:lower)).type.instance_of?(GraphQL::Schema::List)
  end
end

# frozen_string_literal: true

RSpec::Matchers.define :define_gql_argument do |argument_name|
  match do |klass|
    @klass = klass

    @argument_name = argument_name.to_s.camelcase(:lower)
    @argument = @klass.arguments.fetch(@argument_name)

    argument_with_right_type_class?(@type_class) && argument_required?
  end

  chain :with_type do |type_class|
    @type_class = type_class
  end

  chain :required! do
    @required = true
  end

  def argument_with_right_type_class?(type_class)
    return true if type_class.blank?

    type = @argument.type

    [type,
     type.try(:of_type),
     type.try(:of_type).try(:of_type),
     type.try(:of_type).try(:of_type).try(:of_type)].include?([type_class].flatten.first)
  end

  def argument_required?
    return true if @required.blank?

    @argument.instance_variable_get(:@null) == false
  end
end

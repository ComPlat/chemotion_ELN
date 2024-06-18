# frozen_string_literal: true

require 'schmooze'

module Chemotion
  class MetaSchmooze
    attr_reader :schmooze_klass, :root, :env, :schmooze_methods, :schmooze_dependencies

    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, var: {}, root: __dir__, env: {})
      @root = root
      @env = env
      @schmooze_methods = schmooze_methods
      @schmooze_dependencies = schmooze_dependencies
      compose_schmooze_class
      compose_schmooze_methods(var)
    end

    # rubocop:disable Style/OptionalBooleanParameter
    def execute(method, var = {}, recompose_all = false)
      if recompose_all
        compose_schmooze_methods(var)
      elsif var.present?
        var.each { |method_name, v| recompose_schmooze_method(method_name, v) }
      end
      schmooze_klass.new(root, env).send(method)
    end
    # rubocop:enable Style/OptionalBooleanParameter

    def recompose_schmooze_method(method_name, var = nil)
      script = schmooze_methods[method_name]
      compose_schmooze_method(method_name, script, var)
    end

    def respond_to_missing?(method, include_private = false)
      super
    end

    def method_missing(method_name, arg = nil)
      var = {}
      var[method_name] = arg
      execute(method_name, var)
    end

    private

    def compose_schmooze_class
      @schmooze_klass = Class.new(Schmooze::Base) do
        # dependencies schmooze_dependencies
      end
      @schmooze_klass.send(:dependencies, schmooze_dependencies)
    end

    def compose_schmooze_methods(var = {})
      schmooze_methods.each do |method_name, script|
        compose_schmooze_method(method_name, script, var[method_name])
      end
    end

    def compose_schmooze_method(method_name, script, var = nil)
      case script
      when String
        schmooze_klass.send(:method, method_name, script)
      when Proc
        schmooze_klass.send(:method, method_name, script[var])
      end
    end
  end
end

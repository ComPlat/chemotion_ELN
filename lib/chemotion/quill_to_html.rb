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

    def execute(method, var = {}, recompose_all = false)
      if recompose_all
        compose_schmooze_methods(var)
      elsif var.present?
        var.each { |method_name, v| recompose_schmooze_method(method_name, v) }
      end
      schmooze_klass.new(root, env).send(method)
    end

    def recompose_schmooze_method(method_name, var = nil)
      script = schmooze_methods[method_name]
      compose_schmooze_method(method_name, script, var)
    end

    def method_missing(method_name, arg = nil )
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
      if script.is_a?(String)
        schmooze_klass.send('method', method_name, script)
      elsif script.is_a?(Proc)
        schmooze_klass.send('method', method_name, script[var])
      end
    end
  end

  class QuillToHtml < MetaSchmooze
    def initialize(schmooze_methods: {}, schmooze_dependencies: {}, root: Rails.root.to_s, env: {}, var: {})
      @root = root
      @env = env
      @schmooze_dependencies = schmooze_dependencies.merge( delta: 'quill-delta-to-html')
      @schmooze_methods = schmooze_methods.merge(
        convert: lambda_convert = -> (delta_ops = []) {
          delta_ops = JSON.parse delta_ops if delta_ops.is_a?(String)
          delta_ops = case delta_ops.class.name
                      when 'Array'
                        delta_ops.to_json
                      when 'Hash'
                        delta_ops.fetch('ops',[]).to_json
                      else
                        '[]'
                      end
          return "function(){  var converter = new delta(#{delta_ops}, {});  return converter.convert(); } "
        }
      )
      compose_schmooze_class
      compose_schmooze_methods(var)
    end
  end
end

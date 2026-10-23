# frozen_string_literal: true

module InventoryIntegration
  # The decrypted credentials of one connection, from its sealed credentials or the IT credential
  # it references. Every value is registered with the Redactor before an adapter sees it.
  class SecretBag
    def initialize(connection, config: IntegrationConfig.current, box: nil)
      @connection = connection
      @config = config
      @box = box
    end

    def fetch(field)
      values.fetch(field.to_s) { raise Errors::ConfigurationError, "credential '#{field}' is not set" }
    end

    def [](field)
      values[field.to_s]
    end

    def inspect
      "#<#{self.class.name} connection=#{@connection.id}>"
    end
    alias to_s inspect

    private

    def values
      @values ||= read.each_value { |value| Redactor.register(value) }
    end

    def read
      return from_reference if @connection.credentials_ref.present?
      return {} if @connection.credentials_ciphertext.blank?

      (@box || SecretBox.new(SecretBox.key(@config))).open(@connection.credentials_ciphertext)
    end

    def from_reference
      name = @connection.credentials_ref
      references = @config.credential_refs.fetch(name) do
        raise Errors::CredentialsUnreadable, "IT credential '#{name}' is not configured"
      end
      references.transform_values do |env_name|
        ENV.fetch(env_name) { raise Errors::CredentialsUnreadable, "IT credential '#{name}' lacks #{env_name}" }
      end
    end
  end
end

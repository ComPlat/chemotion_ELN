# frozen_string_literal: true

module InventoryIntegration
  module Transport
    # Ways a request carries credentials: #uri may add them to the URL, #sign to the request.
    module Auth
      class None
        def uri(uri)
          uri
        end

        def sign(request)
          request
        end
      end

      class Basic < None
        def initialize(user, password)
          super()
          @user = user
          @password = password
        end

        def sign(request)
          request.tap { |signed| signed.basic_auth(@user, @password) }
        end
      end

      # A header such as "Authorization: Bearer ..." or "X-Api-Key: ...".
      class Header < None
        def initialize(name, value)
          super()
          @name = name
          @value = value
        end

        def sign(request)
          request.tap { |signed| signed[@name] = @value }
        end
      end

      class Query < None
        def initialize(name, value)
          super()
          @name = name
          @value = value
        end

        def uri(uri)
          uri.dup.tap do |with_key|
            with_key.query = [uri.query, URI.encode_www_form(@name => @value)].compact.join('&')
          end
        end
      end
    end
  end
end

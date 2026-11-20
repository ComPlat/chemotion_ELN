# frozen_string_literal: true

module Chemotion
  # Overrides the +/api/v1/converter+ routes that {Labimotion::ConverterAPI}
  # cannot serve, or serves without normalizing. Everything else on that
  # surface (delete profile, options, datasets, datasets_units) falls through to
  # the gem, so this API must stay mounted *before* +Labimotion::LabimotionAPI+
  # in {API}.
  #
  # - +profiles/restore+ and +conversions+ call +Labimotion::Converter.restore+ /
  #   +.test_conversions+, neither of which the gem defines.
  # - +tables+ drops the +ontology+ field that chemotion-converter-client sends
  #   since 0.16.0, which converter-app needs to pick a reader.
  # - +profiles+ GET normalizes and POST/PUT go through {Chemotion::ConverterClient}
  #   rather than the gem. converter-app only runs its profile-schema
  #   migration/validation on write (POST/PUT), so a profile that predates a
  #   schema field (e.g. +tables+) keeps missing it on read forever.
  #   chemotion-converter-client 0.16.0's +ProfileForm+ assumes every array-typed
  #   field is always present and reads several of them unguarded on mount
  #   (+profile.tables.map+ et al.), so a legacy profile crashes the whole admin
  #   page the moment "Edit" is clicked — backfilled here with the same defaults
  #   the client uses for a brand-new profile. On *write*, that same legacy
  #   profile can fail converter-app's validation (HTTP 400 + errors body); the
  #   gem's +*_profile+ helpers return +response.parsed_response if response.code
  #   == 200+ and so collapse that to +nil+, which this proxy would relay as
  #   200/null and the client's error handler would then crash on
  #   +Object.values(errors.data)+. Routing writes through the client keeps the
  #   real status and body so the validation error reaches the user.
  #
  # Delete the +restore+/+conversions+/+tables+ overrides once the gem
  # implements them; delete the +profiles+ overrides once converter-app
  # migrates/validates on read too and the gem stops swallowing write errors.
  class ConverterAPI < Grape::API
    # Array/hash-typed profile fields that chemotion-converter-client 0.16.0
    # always expects present — see AdminApp.js's brand-new-profile defaults.
    PROFILE_ARRAY_KEYS = %w[
      tables identifiers data subjects predicates devices software objects datatypes diff_history
    ].freeze

    # Grape reads error!'s first argument as the body and the second as the
    # status, so a bare error!(401) would answer 500.
    helpers do
      def available?
        @conf = Rails.configuration.try(:converter).try(:url)
        @profile = Rails.configuration.try(:converter).try(:profile)
        error!({ error: 'converter is not configured' }, 406) unless @conf && @profile
      end

      def converter_admin!
        error!({ error: 'unauthorized' }, 401) unless current_user&.converter_admin == true
      end

      # Relays a converter-app failure instead of surfacing it as a 500. The
      # upstream body is forwarded verbatim when it is JSON (e.g. converter-app's
      # +{ Validation:, ValidationMsg: }+ on a legacy profile that no longer
      # validates) so the client can show *why* the write was rejected; a
      # non-JSON body degrades to a generic message.
      def with_converter_errors
        yield
      rescue Chemotion::ConverterClient::RequestError => e
        error!(converter_error_body(e.body), e.code)
      end

      # @return [Hash] converter-app's parsed error body, or a generic fallback
      def converter_error_body(body)
        parsed = JSON.parse(body)
        parsed.is_a?(Hash) ? parsed : { error: 'converter request failed' }
      rescue JSON::ParserError, TypeError
        { error: 'converter request failed' }
      end

      # The upload arrives as a Rack multipart hash with string keys. Older
      # clients posted it as +file[]+, current ones as a single +file+.
      def uploaded_file
        file = params[:file]
        file = file[0] if file.is_a?(Array)
        error!({ error: 'No file provided.' }, 400) if file.blank?

        file
      end

      # Grape picks its formatter from the Content-Type header before falling back
      # to env['api.format'], so a JSON body has to be handed over as a Hash and
      # re-encoded; anything else is emitted verbatim under an unmapped media type.
      def relay_conversion(response)
        status response.code
        disposition = response.headers['content-disposition']
        header['Content-Disposition'] = disposition if disposition

        media_type = response.headers['content-type'].to_s
        return JSON.parse(response.body) if media_type.include?('json')

        content_type media_type
        env['api.format'] = :binary
        response.body
      end

      # Backfills the array/hash fields chemotion-converter-client 0.16.0 reads
      # unguarded, so a legacy profile missing them doesn't crash the admin UI.
      def normalize_profile(profile)
        return profile unless profile.is_a?(Hash)

        PROFILE_ARRAY_KEYS.each { |key| profile[key] ||= [] }
        profile['subjectInstances'] ||= {}
        profile['reactionVariations'] ||= { 'elements' => [], 'identifiers' => [] }
        profile
      end
    end

    resource :converter do
      before { available? }

      resource :profiles do
        desc 'list profiles, backfilling fields legacy profiles may be missing'
        get do
          profiles = Labimotion::Converter.fetch_profiles || []
          { profiles: profiles.map { |p| normalize_profile(p) }, client: @profile }
        end
      end
    end

    resource :converter do
      before do
        available?
        converter_admin!
      end

      resource :profiles do
        desc 'create a profile, relaying converter-app validation errors'
        post do
          with_converter_errors do
            normalize_profile(Chemotion::ConverterClient.create_profile(params))
          end
        end

        desc 'restore a profile to an earlier version'
        params do
          requires :profile_id, type: String, desc: 'profile id'
          # Not named :version — Grape reserves that for the API version segment.
          requires :profile_version, type: String, desc: 'profile version to restore'
          optional :hard, type: Boolean, default: false, desc: 'discard newer versions'
        end
        # Without the requirement Grape reads the version's dot as a format suffix
        # ("1.0" -> version "1", format "0") and the route never matches.
        post 'restore/:profile_id/:profile_version', requirements: { profile_version: /\d+\.\d+/ } do
          with_converter_errors do
            Chemotion::ConverterClient.restore_profile(
              params[:profile_id],
              params[:profile_version],
              hard: params[:hard],
            )
          end
        end

        route_param :id do
          desc 'update a profile, backfilling fields legacy profiles may be missing'
          put do
            # Routed through Chemotion::ConverterClient (not the gem's
            # Labimotion::Converter.update_profile) because the gem returns
            # +response.parsed_response if response.code == 200+, so a legacy
            # profile that fails converter-app's write-time json-schema validation
            # (HTTP 400 + errors body) collapses to nil. This proxy then returned
            # 200/null, and chemotion-converter-client's error handler crashed on
            # +Object.values(errors.data)+ with the real error already discarded.
            with_converter_errors do
              normalize_profile(Chemotion::ConverterClient.update_profile(params[:id], params))
            end
          end
        end
      end

      resource :tables do
        desc 'create tables'
        post do
          file = uploaded_file
          res = with_converter_errors do
            Chemotion::ConverterClient.create_tables(file['tempfile'], params[:ontology].presence)
          end
          # converter-app only ever sees the tempfile's name.
          res['metadata']['file_name'] = file['filename']
          res
        end
      end

      resource :conversions do
        desc 'convert an uploaded file'
        post do
          file = uploaded_file
          response = with_converter_errors do
            Chemotion::ConverterClient.create_conversion(file['tempfile'], params[:format], params[:ontology].presence)
          end

          relay_conversion(response)
        end
      end
    end
  end
end

require 'open-uri'

module Chemotion
  class VersionAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers

    namespace :versions do
      resource :samples do
        desc 'Return versions of the given sample'

        params do
          requires :id, type: Integer, desc: 'Sample id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            # find specific sample and load only required data
            sample = Sample.select(:id, :name, :log_data, :updated_at).find(params[:id])

            analyses = sample.analyses.flat_map { |analysis| analysis.self_and_descendants.select(:id, :name, :updated_at, :log_data) }

            # create cache key for sample
            timestamp = [
              sample.updated_at,
              analyses.map(&:updated_at).max,
              Attachment.where(attachable_id: analyses.map(&:id), attachable_type: 'Container').maximum(:updated_at)
            ].reject(&:nil?).max.to_i
            cache_key = "versions/samples/#{sample.id}/#{timestamp}"

            # cache processed and sorted versions to speed up pagination
            versions = Rails.cache.fetch cache_key do
              all_versions = sample.versions_hash
              all_versions += sample.residues.select(:sample_id, :log_data).flat_map do |residue|
                residue.versions_hash(sample.name)
              end
              all_versions += sample.elemental_compositions.select(:sample_id, :log_data).flat_map do |elemental_composition|
                elemental_composition.versions_hash(sample.name)
              end

              analyses.each do |analysis|
                all_versions += analysis.versions_hash
                all_versions += analysis.attachments.select(:attachable_id, :attachable_type, :filename, :log_data).flat_map do |attachment|
                  attachment.versions_hash(attachment.filename)
                end
              end

              all_versions.sort_by! { |version| -version['t'].to_i } # sort versions with the latest changes in the first place
                          .each_with_index { |record, index| record['v'] = all_versions.length - index } # adjust v to be uniq and in right order
            end

            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end

      resource :reactions do
        desc 'Return versions of the given reaction'

        params do
          requires :id, type: Integer, desc: 'Reaction id'
        end

        paginate per_page: 10, offset: 0, max_per_page: 100

        route_param :id do
          get do
            # find specific sample and load only required data
            reaction = Reaction.select(:id, :name, :log_data, :updated_at).find(params[:id])

            analyses = (
              reaction.analyses +
              reaction.samples.includes(:container).pluck('containers.id').flat_map { |container_id| Container.analyses_for_root(container_id) }
            ).flat_map { |analysis| analysis.self_and_descendants.select(:id, :name, :updated_at, :log_data) }

            # create cache key for reaction
            timestamp = [
              reaction.updated_at,
              reaction.samples.with_deleted.maximum(:updated_at),
              reaction.reactions_samples.with_deleted.maximum(:updated_at),
              analyses.map(&:updated_at).max,
              Attachment.where(attachable_id: analyses.map(&:id), attachable_type: 'Container').maximum(:updated_at)
            ].reject(&:nil?).max.to_i
            cache_key = "versions/reactions/#{reaction.id}/#{timestamp}"

            # cache processed and sorted versions of all reaction dependent records and merge them into one list to speed up pagination
            versions = Rails.cache.fetch cache_key do
              all_versions = reaction.versions_hash

              analyses.each do |analysis|
                all_versions += analysis.versions_hash
                all_versions += analysis.attachments.select(:attachable_id, :attachable_type, :filename, :log_data).flat_map do |attachment|
                  attachment.versions_hash(attachment.filename)
                end
              end

              samples = reaction.samples.with_deleted.select('samples.id, samples.name, samples.log_data')
              samples.each do |sample|
                all_versions += sample.versions_hash
                all_versions += sample.residues.select(:sample_id, :log_data).flat_map do |residue|
                  residue.versions_hash(sample.name)
                end
                all_versions += sample.elemental_compositions.select(:sample_id, :log_data).flat_map do |elemental_composition|
                  elemental_composition.versions_hash(sample.name)
                end
              end

              reactions_samples = reaction.reactions_samples.with_deleted.select(:sample_id, :log_data, :type)
              all_versions += reactions_samples.flat_map do |reactions_sample|
                sample = samples.detect { |s| s.id == reactions_sample.sample_id }
                reactions_sample.versions_hash(sample.name)
              end

              all_versions.sort_by! { |version| -version['t'].to_i } # sort versions with the latest changes in the first place
                          .each_with_index { |record, index| record['v'] = all_versions.length - index } # adjust v to be uniq and in right order
            end

            { versions: paginate(Kaminari.paginate_array(versions)) }
          end
        end
      end
    end
  end
end

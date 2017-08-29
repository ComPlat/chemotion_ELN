class API < Grape::API
  prefix 'api'
  version 'v1'
  format :json
  formatter :json, Grape::Formatter::ActiveModelSerializers

  # TODO needs to be tested,
  # source: http://funonrails.com/2014/03/api-authentication-using-devise-token/
  helpers do

    def current_user
      @current_user = WardenAuthentication.new(env).current_user
    end

    def user_ids
      @user_ids ||= current_user.group_ids + [current_user.id]
    end

    def authenticate!
      error!('401 Unauthorized', 401) unless current_user
    end

    def is_public_request?
      request.path.include?('/api/v1/public/')
    end

    def cache_key search_method, arg, molfile, collection_id, molecule_sort, opt
      molecule_sort = molecule_sort == 1 ? true : false
      inchikey = Chemotion::OpenBabelService.inchikey_from_molfile molfile

      cache_key = [
        latest_updated,
        search_method,
        arg,
        inchikey,
        collection_id,
        molecule_sort,
        opt
      ]

      return cache_key
    end

    def group_by_molecule(samples, own_collection = false)
      groups = Hash.new
      sample_serializer_selector =
        if own_collection
          lambda { |s| SampleListSerializer::Level10.new(s, 10).serializable_hash }
        else
          lambda { |s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized }
        end

      samples.each do |sample|
        next if sample == nil
        moleculeName = get_molecule_name(sample)
        serialized_sample = sample_serializer_selector.call(sample)
        groups[moleculeName] = (groups[moleculeName] || []).push(serialized_sample)
      end
      return to_molecule_array(groups)
    end

    def group_by_order(samples)
      groups = Array.new

      samples.each do |sample|
        next if sample == nil
        moleculeName = get_molecule_name(sample)
        serialized_sample = ElementListPermissionProxy.new(current_user, sample, user_ids).serialized
        recent_group = groups.last
        if recent_group && recent_group[:moleculeName] == moleculeName
          recent_group[:samples].push(serialized_sample)
        else
          groups.push(
            moleculeName: moleculeName,
            samples: Array.new.push(serialized_sample)
          )
        end
      end

      return groups
    end


    def create_group_molecule(molecules, samples, own_collection = false)
      groups = Hash.new
      sample_serializer_selector =
        if own_collection
          lambda { |s| SampleListSerializer::Level10.new(s, 10).serializable_hash }
        else
          lambda { |s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized }
        end

      molecules.each do |molecule|
        next if molecule == nil
        moleculeName = molecule.iupac_name || molecule.inchistring

        samplesGroup = samples.select {|v| v.molecule_id == molecule.id}
        samplesGroup = samplesGroup.sort { |x, y| y.updated_at <=> x.updated_at }

        samplesGroup.each do |sample|
          name = moleculeName
          serialized_sample = sample_serializer_selector.call(sample)

          if sample.residues.present?
            name = name + 'part_' + sample.residues[0].residue_type.to_s
          end

          groups[name] = (groups[name] || []).push(serialized_sample)
        end
      end

      return to_molecule_array(groups)
    end

    def get_molecule_name(sample)
      name = sample.molecule.iupac_name || sample.molecule.inchistring
      if sample.residues.present?
        name += 'part_' # group polymers to different array
        name += sample.residues[0].residue_type.to_s
      end
      return name
    end

    def to_molecule_array(hash_groups)
      target = Array.new
      hash_groups.each do |key, value|
        target.push(moleculeName: key, samples: value)
      end
      return target
    end
  end

  before do
    authenticate! unless is_public_request?
  end

  WL_TABLES = {
    'samples' => %w(name short_label external_label)
  }

  mount Chemotion::ContainerAPI
  mount Chemotion::MoleculeAPI
  mount Chemotion::CollectionAPI
  mount Chemotion::SyncCollectionAPI
  mount Chemotion::SampleAPI
  mount Chemotion::ReactionAPI
  mount Chemotion::WellplateAPI
  mount Chemotion::ResearchPlanAPI
  mount Chemotion::ScreenAPI
  mount Chemotion::UserAPI
  mount Chemotion::ReactionSvgAPI
  mount Chemotion::PermissionAPI
  mount Chemotion::SuggestionAPI
  mount Chemotion::SearchAPI
  mount Chemotion::ReportAPI
  mount Chemotion::AttachmentAPI
  mount Chemotion::PublicAPI
  mount Chemotion::ProfileAPI
  mount Chemotion::CodeLogAPI
  mount Chemotion::DeviceAPI
  mount Chemotion::IconNmrAPI
  mount Chemotion::DevicesAnalysisAPI
  mount Chemotion::GeneralAPI
  mount Chemotion::V1PublicAPI
end

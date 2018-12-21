# frozen_string_literal: true

class Import::ImportJson
  attr_accessor :data,  :force_uuid
  attr_reader :user_id, :collection_id, :collection, :all_collection, :user,
    :new_data, :log, :new_attachments

#Dir["public/images/reactions/*"].each{|f| if !(Reaction.find_by(reaction_svg_file: File.basename(f))) then  File.delete(f) end}


  # def dummy_data
  #   {
  #     'reactions' => [
  #       {
  #         # 'id' => nil,
  #         'name' => nil,
  #         'created_at' => nil,
  #         'updated_at' => nil,
  #         'description' => nil,
  #         'timestamp_start' => nil,
  #         'timestamp_stop' => nil,
  #         'observation' => nil,
  #         'purification' => nil,
  #         'dangerous_products' => nil,
  #         'tlc_solvents' => nil,
  #         'tlc_description' => nil,
  #         'rf_value' => nil,
  #         'temperature' => nil,
  #         'status' => nil,
  #         # 'reaction_svg_file' => nil, # to process
  #         'solvent' => nil,
  #         'deleted_at' => nil,
  #         'short_label' => nil,
  #         # 'created_by' => nil, # reprocessed
  #         'role' => nil,
  #         'origin' => nil,
  #         ##### CodeLog
  #         'uuid' => nil # from reaction.code_log.id
  #       }
  #     ],
  #     'samples' => [
  #       # 'id' => nil,
  #       # 'ancestry' => nil,
  #         # IDEA pass uuid of ancestors if present in acestry_uuids?
  #       # 'created_by' => nil,
  #        # IDEA reprocessed with user_id? use  ORCID in created_by_orcid
  #       # 'user_id' => nil, # NB this column is not used
  #       'name' => nil,
  #       'target_amount_value' => nil,
  #       'target_amount_unit' => nil,
  #       'created_at' => nil,
  #       'updated_at' => nil,
  #       'description' => nil,
  #       'molecule_id' => nil,
  #       'molfile' => nil,
  #       'purity' => nil,
  #       'solvent' => nil,
  #       'impurities' => nil,
  #       'location' => nil,
  #       'is_top_secret' => nil,
  #       'external_label' => nil,
  #       'short_label' => nil,
  #       'real_amount_value' => nil,
  #       'real_amount_unit' => nil,
  #       'imported_readout' => nil,
  #       'deleted_at' => nil,
  #       'sample_svg_file' => nil,
  #       'identifier' => nil,
  #       'density' => nil,
  #       'melting_point' => nil,
  #       'boiling_point' => nil,
  #       'fingerprint_id' => nil,
  #       'xref' => nil,
  #       'molarity_value' => nil,
  #       'molarity_unit' => nil,
  #       ##### CodeLog
  #       'uuid' => nil, # from sample.code_log.id
  #       ##### ReactionsStartingMaterialSample, ReactionsSolventSample,
  #       ##### ReactionsReactantSample, ReactionsProductSample
  #       'reaction_sample' => [nil,nil,nil,nil]
  #       'r_uuid' => nil,
  #       'r_reference' => nil,
  #       'r_equivalent' => nil,
  #     ]
  #   }
  # end

  def initialize(**arg)
    d = arg[:data]
    @data = d.is_a?(String) && JSON.parse(d, allow_nan: true) || d
    @user_id = arg[:user_id]
    @collection_id = arg[:collection_id]
    @new_data = { }
    @new_attachments = { }
    @log = { 'reactions' => {}, 'samples' => {} }
    @force_uuid = arg[:force_uuid]
    find_collection
    find_collection_all
  end

  def import
    map_data_uuids(@log)
    unless collections?
      @log['collections'] = 'could not find collection or user'
      return @log
    end
    import_reactions
    import_samples
    #File.write("log_#{Time.now.to_i}.json", JSON.pretty_generate(@log))
  end

  def collection_id= id
    @collection_id = id
    find_collection
    id
  end

  def user_id= id
    @user_id = id
    find_collection_all
    id
  end

  private

  def import_reactions
    return unless collections?
    attribute_names = filter_attributes(Reaction)
    reactions.each_value do |el|
      attribs = el.slice(*attribute_names).merge(
        created_by: user_id,
        collections_reactions_attributes: [
          {collection_id: collection.id},
          {collection_id: all_collection.id}
        ]
      )
      create_element(el['uuid'], attribs, Reaction, 'reaction')
    end
  end

  def import_samples
    return unless collections?
    attribute_names = filter_attributes(Sample)
    samples.each_value do |el|
      attribs = el.slice(*attribute_names).merge(
        created_by: user_id,
        collections_samples_attributes: [
          { collection_id: collection.id },
          { collection_id: all_collection.id }
        ]
      )
      if attribs['molecule_name_attributes']
        attribs['molecule_name_attributes'].slice!('name','description','user_id')
        attribs['molecule_name_attributes']['user_id'] = user_id if attribs['molecule_name_attributes']['user_id']
      end
      attribs['residues_attributes'] ||=  []
      new_el = create_element(el['uuid'], attribs, Sample, 'sample')
      next unless new_el
      klass = el['reaction_sample']&.constantize
      add_to_reaction(klass, el, new_el) if klass
    end
  end

  def map_data_uuids(h)
    %w(reactions samples).each do |method|
      send(method).each_key do |uuid|
        h[method][uuid] = {}
      end
    end
  end

  def create_element(uuid, element, klass, source)
    #ActiveRecord::Base.transaction do
      if force_uuid && CodeLog.find_by(id: uuid)
        @log[source + 's'][uuid]['uuid'] = 'already attributed'
        return
      end
      new_el = klass.new(element)
      if new_el.save!
        if force_uuid
          new_el.code_log.really_destroy!
          CodeLog.create(id: uuid, source: source, source_id: new_el.id)
        end
        @new_data[uuid] = {'id' => new_el.id, 'type' => source}
        @log[source + 's'][uuid]['created_at'] = new_el.created_at
        if !(new_el.container)
          c = Container.create_root_container(
            containable_id: new_el.id,
            containable_type: klass.name,
          )
        end
        create_analyses(uuid, new_el)
        new_el
      else
        @log[source + 's'][uuid]['created_at'] = 'not created'
        nil
      end
    #end
  end

  def create_analyses(uuid, el)
    analyses[uuid]&.each do |a|
      new_a = el.container.children.where(container_type: 'analyses')
        .first.children.create(
        container_type: 'analysis',
        extended_metadata: a['extended_metadata'],
        description: a['description'],
        name: a['name']
      )
      @log['analyses'] ||= {}
      remote_id = a['id']
      @log['analyses'][remote_id] = new_a.id

      create_datasets(a.fetch('datasets',[]), new_a)
    end
  end

  def create_datasets(datasets, analysis)
    datasets.each do |a|
      # next unless (remote_id = a['analysis_id'])
      # next unless (analysis_id = @log['analyses'][remote_id])
      # new_a = Container.find_by(id: analysis_id).children.create(
      new_a = analysis.children.create(
        container_type: 'dataset',
        extended_metadata: a['extended_metadata'],
        description: a['description'],
        name: a['name']
      )
      a['attachments']&.each do |att|
        @new_attachments[att['identifier']] = Attachment.new(
          filename: att['filename'],
          identifier: att['identifier'],
          checksum: att['checksum'],
          attachable_id: new_a.id,
          attachable_type: 'Container'
        )
      end
    end
  end

  def filter_attributes(klass)
    attributes = klass.attribute_names - %w(id user_id created_by deleted_at )
    case klass.name
    when 'Sample'
      attributes -= [
        'ancestry', 'molecule_id', 'xref', 'fingerprint_id', 'molecule_name_id',
        'is_top_secret', 'molecule_svg_file'
       ]
      attributes += ['residues_attributes', 'elemental_compositions_attributes', 'molecule_name_attributes']
    # when 'Reaction'
    #   attributes -= ['reaction_svg_file']
    end
    attributes
  end

  def add_to_reaction(klass, el, new_el)
    el_uuid = el['uuid']
    r_uuid = el['r_uuid']
    ref = (el['r_reference'] == 't') || el['r_reference'] == 'f'
    eq = el['r_equivalent']
    if new_data &&  new_data[r_uuid] && new_data[r_uuid]['id']
      @log['samples'][el_uuid][klass.name] = klass.create(
        sample_id: new_el.id, reaction_id: new_data[r_uuid]['id'],
        reference: ref, equivalent: eq, position: el['r_position']
      ) && '201' || '500'
    else
      @log['samples'][el_uuid][klass.name] = '404'
    end
  end

  def reactions
    data && data['reactions'] || {}
  end

  def samples
    data && data['samples'] || {}
  end

  def analyses
    data && data['analyses'] || {}
  end

  def datasets
    data && data['datasets'] || {}
  end

  def collections?
    @collection && @all_collection
  end

  def find_collection(c_id = collection_id)
    @collection = Collection.find_by(id: c_id) if c_id.is_a?(Integer)
  end

  def find_collection_all(id = user_id)
    return unless id.is_a?(Integer)
    @all_collection = Collection.get_all_collection_for_user(id)
  end
end

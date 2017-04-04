module ContainerTreeHelper

  def self.get_tree(user_id, group_ids, collection_id, type)
    case type
    when "sample"
      c = Collection.belongs_to_or_shared_by(user_id,group_ids)
              .find(collection_id)
              .samples
              .includes(:container)
    when "reaction"
      c = Collection.belongs_to_or_shared_by(user_id,group_ids)
                .find(collection_id)
                .reactions
                .includes(:container)
    when "wellplate"
      c = Collection.belongs_to_or_shared_by(user_id,group_ids)
                .find(collection_id)
                .wellplates
                .includes(:container)
    when "screens"
      c = Collection.belongs_to_or_shared_by(user_id,group_ids)
                .find(collection_id)
                .screens
                .includes(:container)
    else
      c = []
    end

    elements = c.map do |element|
      {id: element.id,
        title: element.short_label,
        subtitle: nil,
        children: get_children(element.container)
      }
    end

    attachments = Attachment.where(:container_id => nil, :created_for => user_id)
    data_tree = attachments.map do |attachment|
      {id: attachment.id, title: attachment.filename, subtitle: "(attachment)", children: []}
    end
    tree = [{id: nil, title: 'New data', subtitle: nil, children: data_tree}]

    tree.concat(elements)
  end

  def self.get_children(container)
    container.children.map do |subcontainer|
      case subcontainer.container_type
      when "analyses"
        {id: nil,
          title: "Analyses",
          subtitle: nil,
          children: get_children(subcontainer)}
      when "dataset"
        {id: subcontainer.id, title: subcontainer.name,
          subtitle: "(" + subcontainer.container_type + ")",
          children: get_attachments(subcontainer)}
      else
        {id: subcontainer.id, title: subcontainer.name,
          subtitle: "(" + subcontainer.container_type + ")",
          children: get_children(subcontainer)}
      end
    end
  end

  def self.get_attachments(container)
    container.attachments.map do |attachment|
      {id: attachment.id, title: attachment.filename, subtitle: "(attachment)", children: []}
    end
  end

  def self.update_tree(user_id, group_ids, collection_id, type, new_tree)
    diff = HashDiff.best_diff(get_tree(user_id, group_ids, collection_id, type),
      convert(new_tree))
    if check_differences(diff)
      update_db(new_tree)
      new_tree
    else
      orig
    end
  end

private
  def self.update_db(objects)
    objects.each do |object|
      if object.subtitle && object.subtitle.end_with?("(dataset)")
        parentid = object.id
        object.children.each do |child|
          if child.subtitle && child.subtitle.end_with?("(attachment)")
            attachment = Attachment.find_by id: child.id
            if attachment
              attachment.container_id = parentid
              attachment.save!
            end
          end
        end
      else
        update_db(object.children)
      end
    end
  end

  def self.convert(objects)
    objects.map do |object|
      {id: object.id,
        title: object.title,
        subtitle: object.subtitle,
        children: convert(object.children)}
    end
  end

  def self.check_differences(diff)
    valid = true
    i = 0
    while i < diff.length
      result = diff.map do |entry|
        if entry[2] == diff[i][2]
          entry
        end
      end
      if !(result.length == 2 &&
        ((result[0][0] == "-" && result[1][0] == "+") ||
        (result[0][0] == "+" && result[1][0] == "-")))
        valid = false
        break
      end
      i = i + 1
    end
    return valid
  end

end

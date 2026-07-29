# frozen_string_literal: true

# Collection-sharing demo data: permission-level ladder, group vs. user shares
# (including a mixed group+user case exercising MAX-resolution), a fully-shared
# collection tree, and a truncated tree (root + grandchild shared, middle
# child deliberately left unshared). Assumes 00_persons.seed.rb already ran
# (numeric prefix guarantees load order); soft-skips otherwise.

required_emails = (1..4).map { |n| "complat.user#{n}@eln.edu" }
missing = required_emails.reject { |email| Person.exists?(email: email) }

if missing.any?
  puts "*** Skipping collection-sharing demo seed — missing users: #{missing.join(', ')}"
else
  cu1, cu2, cu3, cu4 = required_emails.map { |email| Person.find_by!(email: email) }

  group = Group.find_by(email: 'sharing-demo-group@eln.edu') || Group.create!(
    email: 'sharing-demo-group@eln.edu',
    password: '@complat',
    first_name: 'Sharing',
    last_name: 'Demo Group',
    name_abbreviation: 'SDG',
    confirmed_at: Time.now,
  )
  [cu3, cu4].each { |member| group.users << member unless group.users.exists?(id: member.id) }
  group.admins << cu1 unless group.admins.exists?(id: cu1.id)

  detail_keys = Collection::DETAIL_LEVEL_KEYS - [:permission_level]

  find_or_create_collection = lambda do |owner, label, parent: nil|
    Collection.find_by(user: owner, label: label) ||
      Collection.create!(user: owner, label: label, parent: parent)
  end

  share = lambda do |collection, shared_with, permission, detail: 0|
    row = CollectionShare.find_or_initialize_by(collection: collection, shared_with: shared_with)
    row.assign_attributes(detail_keys.index_with { detail })
    row.permission_level = CollectionShare.permission_level(permission)
    row.save!
  end

  root = find_or_create_collection.call(cu1, 'Sharing Demo')

  # Permission-level ladder
  pl_root = find_or_create_collection.call(cu1, 'Permission Levels', parent: root)
  CollectionShare::PERMISSION_LEVELS.each_key do |level|
    col = find_or_create_collection.call(cu1, level.to_s, parent: pl_root)
    share.call(col, cu2, level, detail: 5)
  end

  # Group only
  group_only = find_or_create_collection.call(cu1, 'Group Only', parent: root)
  share.call(group_only, group, :edit_elements, detail: 5)

  # User only
  user_only = find_or_create_collection.call(cu1, 'User Only', parent: root)
  share.call(user_only, cu3, :add_elements, detail: 5)

  # Group + user mixed, different permission levels (MAX-resolution demo)
  mixed = find_or_create_collection.call(cu1, 'Group + User Mixed', parent: root)
  share.call(mixed, group, :read_elements, detail: 3)
  share.call(mixed, cu3, :manage_shares, detail: 8)

  # Fully-shared tree A -> B -> C
  tree_a = find_or_create_collection.call(cu1, 'Tree A', parent: root)
  tree_b = find_or_create_collection.call(cu1, 'Tree B', parent: tree_a)
  tree_c = find_or_create_collection.call(cu1, 'Tree C', parent: tree_b)
  [tree_a, tree_b, tree_c].each { |col| share.call(col, cu2, :edit_elements, detail: 5) }

  # Truncated tree: A and C shared, B deliberately skipped
  trunc_a = find_or_create_collection.call(cu1, 'Truncated Tree A', parent: root)
  trunc_b = find_or_create_collection.call(cu1, 'Truncated Tree B', parent: trunc_a)
  trunc_c = find_or_create_collection.call(cu1, 'Truncated Tree C', parent: trunc_b)
  share.call(trunc_a, cu2, :edit_elements, detail: 5)
  share.call(trunc_c, cu2, :edit_elements, detail: 5)

  puts '*** Seeded collection-sharing demo data under CU1 / "Sharing Demo"'
end

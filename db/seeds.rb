# create initial test user
u = User.create!(email: 'test@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept')

# create some collections
all_collection = Collection.create!(label: 'All', user_id: u.id)
collection_1 = Collection.create!(label: 'Collection #1', user_id: u.id)
subcollection_1 = Collection.create!(label: 'Subcollection of #1', user_id: u.id, parent: collection_1)
grand_child = Collection.create!(label: 'Grandchild', user_id: u.id, parent: subcollection_1)

# create some reactions
reaction_1 = Reaction.create(name: 'Reaction 1')
reaction_2 = Reaction.create(name: 'Reaction 2')
reaction_3 = Reaction.create(name: 'Reaction 3')
reaction_4 = Reaction.create(name: 'Reaction 4')
reaction_5 = Reaction.create(name: 'Reaction 5')
reaction_6 = Reaction.create(name: 'Reaction 6')

# create some samples
sample_1 = Sample.create!(name: 'Sample 1')
sample_2 = Sample.create!(name: 'Sample 2')
sample_3 = Sample.create!(name: 'Sample 3')
sample_4 = Sample.create!(name: 'Sample 4')
sample_5 = Sample.create!(name: 'Sample 5')
sample_6 = Sample.create!(name: 'Sample 6')
sample_7 = Sample.create!(name: 'Sample 7')
sample_8 = Sample.create!(name: 'Sample 8')

# associate samples with reactions
ReactionsStartingMaterialSample.create!(reaction: reaction_1, sample: sample_1)
ReactionsReactantSample.create!(reaction: reaction_1, sample: sample_2)
ReactionsProductSample.create!(reaction: reaction_1, sample: sample_3)

ReactionsStartingMaterialSample.create!(reaction: reaction_2, sample: sample_3)
ReactionsReactantSample.create!(reaction: reaction_2, sample: sample_2)
ReactionsProductSample.create!(reaction: reaction_2, sample: sample_1)

# associate samples with collections
CollectionsSample.create!(sample: sample_1, collection: collection_1)
CollectionsSample.create!(sample: sample_2, collection: collection_1)
CollectionsSample.create!(sample: sample_3, collection: collection_1)
CollectionsSample.create!(sample: sample_4, collection: collection_1)
CollectionsSample.create!(sample: sample_2, collection: subcollection_1)
CollectionsSample.create!(sample: sample_5, collection: subcollection_1)
CollectionsSample.create!(sample: sample_6, collection: subcollection_1)
CollectionsSample.create!(sample: sample_1, collection: grand_child)
CollectionsSample.create!(sample: sample_7, collection: grand_child)
CollectionsSample.create!(sample: sample_8, collection: grand_child)

# associate samples with reactions
CollectionsReaction.create!(reaction: reaction_1, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_2, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_3, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_4, collection: grand_child)
CollectionsReaction.create!(reaction: reaction_5, collection: subcollection_1)
CollectionsReaction.create!(reaction: reaction_6, collection: subcollection_1)

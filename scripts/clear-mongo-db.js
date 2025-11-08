const collections = ["ModVersions", "Mods", "Users", "Actions"];

collections.forEach((name) => {
	const collection = db.getCollection(name);

	if (collection) {
		print(`Clearing ${name}...`);
		collection.deleteMany({});
	}
});

print("✅ Database cleared but collections retained.");

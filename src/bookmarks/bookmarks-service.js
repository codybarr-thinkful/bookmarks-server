const BookmarksService = {
	getAllBookmarks(knex) {
		return knex
			.select('*')
			.from('bookmarks')
			.orderBy('id', 'asc')
	},
	getById(knex, id) {
		return knex
			.from('bookmarks')
			.select('*')
			.where('id', id)
			.first()
	},
	insertBookmark(knex, newBookmark) {
		return knex
			.insert(newBookmark)
			.into('bookmarks')
			.returning('*')
			.then(rows => rows[0])
	},
	updateBookmark(knex, id, newBookmarkFields) {
		return knex('bookmarks')
			.where({ id })
			.update(newBookmarkFields)
	},
	deleteBookmark(knex, id) {
		return knex('bookmarks')
			.where({ id })
			.delete()
	}
}

module.exports = BookmarksService

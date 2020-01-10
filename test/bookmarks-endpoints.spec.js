const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const {
	testBookmarks,
	maliciousBookmark,
	sanitizedBookmark
} = require('./bookmarks.fixture')

describe('Bookmarks Endpoints', () => {
	let db

	before('make knex instance', () => {
		db = knex({
			client: 'pg',
			connection: process.env.TEST_DATABASE_URL
		})

		app.set('db', db)
	})

	after('disconnect from db', () => db.destroy())

	beforeEach('clean the table', () => db('bookmarks').truncate())

	describe(`GET /bookmarks`, () => {
		context(`Given no bookmarks`, () => {
			it(`responds with 200 and an empty list`, () => {
				return supertest(app)
					.get('/api/bookmarks')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, [])
			})
		})

		context('Given there are bookmarks in the database', () => {
			beforeEach('insert bookmarks', () => {
				return db.into('bookmarks').insert(testBookmarks)
			})

			it('GET /bookmarks responds with 200 containing our bookmarks', () => {
				return supertest(app)
					.get('/api/bookmarks')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, testBookmarks)
			})
		})
	})

	describe(`GET /bookmarks/:bookmark_id`, () => {
		context(`Given no bookmarks`, () => {
			it(`responds with 404`, () => {
				const bookmarkId = 123456
				return supertest(app)
					.get(`/api/bookmarks/${bookmarkId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Bookmark doesn't exist` }
					})
			})
		})

		context('Given there are bookmarks in the database', () => {
			beforeEach('insert bookmarks', () => {
				return db.into('bookmarks').insert(testBookmarks)
			})

			it('GET /bookmark/:bookmark_id responds with 200 and the specified bookmark', () => {
				const bookmarkId = 2
				const expectedBookmark = testBookmarks[bookmarkId - 1]
				return supertest(app)
					.get(`/api/bookmarks/${bookmarkId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(200, expectedBookmark)
			})
		})
	})

	describe(`POST /bookmarks`, () => {
		it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
			const newBookmark = {
				title: 'Henry Quinn',
				url: 'https://henryneeds.coffee',
				description: 'President of New Haven IO',
				rating: 3
			}

			return supertest(app)
				.post('/api/bookmarks')
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.send(newBookmark)
				.expect(201)
				.expect(res => {
					expect(res.body.title).to.eql(newBookmark.title)
					expect(res.body.url).to.eql(newBookmark.url)
					expect(res.body.description).to.eql(newBookmark.description)
					expect(res.body.rating).to.eql(newBookmark.rating)
					expect(res.body).to.have.property('id')
					expect(res.headers.location).to.eql(
						`/bookmarks/${res.body.id}`
					)
				})
		})

		// tests that title, url, description, and rating are all required fields
		const requiredFields = ['title', 'url', 'description', 'rating']
		requiredFields.forEach(field => {
			const newBookmark = {
				title: 'Henry Quinn',
				url: 'https://henryneeds.coffee',
				description: 'President of New Haven IO',
				rating: 9
			}

			it(`responds with 400 and an error message when the '${field}' is missing`, () => {
				delete newBookmark[field]

				return supertest(app)
					.post('/api/bookmarks')
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send(newBookmark)
					.expect(400, {
						error: { message: `Missing '${field}' in request body` }
					})
			})
		})

		it(`should respond with a 400 and an error message when the URL field is invalid`, () => {
			const newBookmark = {
				title: 'Henry Quinn',
				url: 'onomatopoeia',
				description: 'President of New Haven IO',
				rating: 9
			}

			return supertest(app)
				.post('/api/bookmarks')
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.send(newBookmark)
				.expect(400, {
					error: { message: `URL is invalid` }
				})
		})

		it(`should respond with a 400 and an error message when the rating isn't 1-5`, () => {
			const newBookmark = {
				title: 'Henry Quinn',
				url: 'https://onomatopoeia.com',
				description: 'President of New Haven IO',
				rating: 17
			}

			return supertest(app)
				.post('/api/bookmarks')
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.send(newBookmark)
				.expect(400, {
					error: { message: `Rating must be 1-5` }
				})
		})

		it('removes XSS attack content', () => {
			return supertest(app)
				.post(`/api/bookmarks`)
				.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
				.send(maliciousBookmark)
				.expect(201)
				.expect(res => {
					expect(res.body.title).to.eql(sanitizedBookmark.title)
					expect(res.body.content).to.eql(sanitizedBookmark.content)
				})
		})
	})

	describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
		context(`Given no bookmarks`, () => {
			it(`responds with 404`, () => {
				const bookmarkId = 123456
				return supertest(app)
					.patch(`/api/bookmarks/${bookmarkId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Bookmark doesn't exist` }
					})
			})
		})

		context('Given there are articles in the database', () => {
			beforeEach('insert bookmarks', () => {
				return db.into('bookmarks').insert(testBookmarks)
			})

			it('responds with 204 and updates the bookmark', () => {
				const idToUpdate = 2
				const updateBookmark = {
					title: 'updated bookmark title',
					url: 'https://cnet.com',
					description: 'Uh...CNET I guess',
					rating: 3
				}

				const expectedBookmark = {
					...testBookmarks[idToUpdate - 1],
					...updateBookmark
				}

				return supertest(app)
					.patch(`/api/bookmarks/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send(updateBookmark)
					.expect(204)
					.then(res =>
						supertest(app)
							.get(`/api/bookmarks/${idToUpdate}`)
							.set(
								'Authorization',
								`Bearer ${process.env.API_TOKEN}`
							)
							.expect(expectedBookmark)
					)
			})

			it(`responds with 400 when no required fields supplied`, () => {
				const idToUpdate = 2
				return supertest(app)
					.patch(`/api/bookmarks/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send({ irrelevantField: 'foo' })
					.expect(400, {
						error: {
							message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
						}
					})
			})

			it(`responds with 204 when updating only a subset of fields`, () => {
				const idToUpdate = 2
				const updateBookmark = {
					title: 'updated bookmark title'
				}
				const expectedBookmark = {
					...testBookmarks[idToUpdate - 1],
					...updateBookmark
				}

				return supertest(app)
					.patch(`/api/bookmarks/${idToUpdate}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.send({
						...updateBookmark,
						fieldToIgnore: 'should not be in GET response'
					})
					.expect(204)
					.then(res =>
						supertest(app)
							.get(`/api/bookmarks/${idToUpdate}`)
							.set(
								'Authorization',
								`Bearer ${process.env.API_TOKEN}`
							)
							.expect(expectedBookmark)
					)
			})
		})
	})

	describe(`DELETE /bookmarks/:bookmark_id`, () => {
		context('Given there are bookmarks in the database', () => {
			beforeEach('insert bookmarks', () => {
				return db.into('bookmarks').insert(testBookmarks)
			})

			it('responds with 204 and removes the bookmark', () => {
				const idToRemove = 2
				const expectedBookmarks = testBookmarks.filter(
					bookmark => bookmark.id !== idToRemove
				)
				return supertest(app)
					.delete(`/api/bookmarks/${idToRemove}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(204)
					.then(res =>
						supertest(app)
							.get(`/api/bookmarks`)
							.set(
								'Authorization',
								`Bearer ${process.env.API_TOKEN}`
							)
							.expect(expectedBookmarks)
					)
			})
		})

		context(`Given no bookmarks`, () => {
			it(`responds with 404`, () => {
				const bookmarkId = 123456
				return supertest(app)
					.delete(`/api/bookmarks/${bookmarkId}`)
					.set('Authorization', `Bearer ${process.env.API_TOKEN}`)
					.expect(404, {
						error: { message: `Bookmark doesn't exist` }
					})
			})
		})
	})
})

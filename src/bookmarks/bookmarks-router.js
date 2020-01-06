const express = require('express')
const xss = require('xss')
const { isWebUri } = require('valid-url')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const jsonParser = express.json()
const logger = require('../logger')

const sanitizeBookmark = bookmark => ({
	...bookmark,
	title: xss(bookmark.title),
	url: bookmark.url,
	description: xss(bookmark.description),
	rating: Number(bookmark.rating)
})

bookmarksRouter
	.route('/')
	.get((req, res, next) => {
		const knexInstance = req.app.get('db')

		BookmarksService.getAllBookmarks(knexInstance)
			.then(bookmarks => {
				res.json(bookmarks)
			})
			.catch(next)
	})
	.post(jsonParser, (req, res, next) => {
		const { title, url, description, rating } = req.body
		const newBookmark = { title, url, description, rating }

		// check for missing fields
		for (const [key, value] of Object.entries(newBookmark)) {
			if (value == null) {
				return res.status(400).json({
					error: { message: `Missing '${key}' in request body` }
				})
			}
		}

		// check for valid url
		if (!isWebUri(newBookmark.url)) {
			return res.status(400).json({
				error: { message: `URL is invalid` }
			})
		}

		// check for valid rating
		const validRatings = [1, 2, 3, 4, 5]
		if (!validRatings.includes(newBookmark.rating)) {
			return res.status(400).json({
				error: { message: `Rating must be 1-5` }
			})
		}

		BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
			.then(bookmark => {
				res.status(201)
					.location(`/bookmarks/${bookmark.id}`)
					.json(sanitizeBookmark(bookmark))
			})
			.catch(next)
	})

bookmarksRouter
	.route('/:bookmark_id')
	.all((req, res, next) => {
		BookmarksService.getById(req.app.get('db'), req.params.bookmark_id)
			.then(bookmark => {
				if (!bookmark) {
					return res.status(404).json({
						error: { message: `Bookmark doesn't exist` }
					})
				}
				res.bookmark = bookmark // save the bookmark for the next middleware
				next() // don't forget to call next so the next middleware happens!
			})
			.catch(next)
	})
	.get((req, res, next) => {
		res.json(sanitizeBookmark(res.bookmark))
	})
	.patch(jsonParser, (req, res, next) => {
		const { title, url, description, rating } = req.body
		const updatedBookmarkFields = { title, url, description, rating }

		if (!title && !url && !description && !rating) {
			return res.status(400).json({
				error: {
					message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
				}
			})
		}

		BookmarksService.updateBookmark(
			req.app.get('db'),
			req.params.bookmark_id,
			updatedBookmarkFields
		)
			.then(() => {
				res.status(204).end()
			})
			.catch(next)
	})
	.delete((req, res, next) => {
		const { bookmark_id } = req.params
		BookmarksService.deleteBookmark(req.app.get('db'), bookmark_id)
			.then(() => {
				logger.info(`Bookmark with id ${bookmark_id} deleted.`)
				res.status(204).end()
			})
			.catch(next)
	})

module.exports = bookmarksRouter

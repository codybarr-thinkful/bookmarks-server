const testBookmarks = [
	{
		id: 1,
		title: 'Thinkful',
		url: 'https://www.thinkful.com',
		description: 'Think outside the classroom',
		rating: 5
	},
	{
		id: 2,
		title: 'Google',
		url: 'https://www.google.com',
		description: 'Where we find everything else',
		rating: 4
	},
	{
		id: 3,
		title: 'MDN',
		url: 'https://developer.mozilla.org',
		description: 'The only place to find web documentation',
		rating: 5
	}
]

const maliciousBookmark = {
	title: 'Naughty naughty very naughty <script>alert("xss");</script>',
	url: 'https://someurl.com',
	description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
	rating: 3
}

const sanitizedBookmark = {
	...maliciousBookmark,
	title:
		'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
	description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
}

module.exports = { testBookmarks, maliciousBookmark, sanitizedBookmark }

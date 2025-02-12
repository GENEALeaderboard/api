import { responseError, responseFailed, responseSuccess } from "../response"

import { z } from "zod"

const studySchema = z.object({
	prolificid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	studyid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	sessionid: z.string().regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function fetchStudy(request, db, corsHeaders) {
	try {
		// const prolificid = url.searchParams.get("prolificid") || ""
		// const studyid = url.searchParams.get("studyid") || ""
		// const sessionid = url.searchParams.get("sessionid") || ""

		// const parseResult = studySchema.safeParse({ prolificid, studyid, sessionid })
		// if (!parseResult.success) {
		// 	return responseFailed(null, "Failed to parse proflificid, studyid, sessionid", 400, corsHeaders)
		// }
		const studyid = 33
		const { results: study } = await db.prepare("SELECT * FROM studies WHERE id = ?").bind(studyid).run()
		if (study.length === 0) {
			console.log("results", results)
			return responseFailed(null, "No studies found", 404, corsHeaders)
		}

		const pages = fetchPagesForStudy(db, studyid)
		const pagesWithVideos = fetchVideosForPages(db, pages)

		return responseSuccess(
			{
				...study,
				pages: pagesWithVideos,
			},
			"Fetch studies success",
			corsHeaders
		)
	} catch (err) {
		const errorMessage = err.message || "An unknown error occurred"
		console.log("Exception", err)
		return responseError(err, errorMessage, 401, corsHeaders)
	}
}

async function fetchPagesForStudy(db, studyid) {
	const { results: pages } = db.prepare(`SELECT * FROM pages WHERE studyid = ?`).bind(studyid).run()

	if (pages.length === 0) {
		console.log("results", results)
		throw new Error("No pages found")
	}

	return pages
}

async function fetchVideosForPages(db, pages) {
	// const idDict = {}
	// Array.from(pages).forEach((page) => {
	// 	if (!idDict[page.id]) {
	// 		idDict[page.id] = []
	// 	}
	// 	idDict[page.id].push(page.video1)
	// 	idDict[page.id].push(page.video2)
	// })
	// const videoIds = Object.values(idDict).flat()
	// console.log("videoIds", videoIds)
	// const stmt = db.prepare(`SELECT * FROM videos WHERE id = ?`)
	// const batch = videoIds.map((videoId) => {
	// 	stmt.bind(videoId)
	// })
	// const batchResults = await db.batch(batch)

	// if (batchResults.length !== videoIds.length) {
	// 	throw new Error("Not all videos found")
	// }

	// if (!batchResults) {
	// 	throw new Error("No videos found")
	// }
	const { results: videoResults } = await db.prepare(`SELECT * FROM videos`).all()

	if (!videoResults) {
		throw new Error("No videos found")
	}

	const videoDict = Array.from(videoResults).map((video) => {
		return {
			[video.id]: video,
		}
	})

	const pagesWithVideos = Array.from(pages).map((page) => {
		const video1 = videoDict[page.video1]
		const video2 = videoDict[page.video2]
		const options = JSON.parse(page.options)
		return {
			...page,
			options: options,
			video1: video1,
			video2: video2,
		}
	})

	return pagesWithVideos
}

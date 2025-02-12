import { responseError, responseFailed, responseSuccess } from "../response"
import { z } from "zod"

const studySchema = z.object({
	prolific_userid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	prolific_studyid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	prolific_sessionid: z.string().regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function startStudy(request, db, corsHeaders) {
	try {
		const { prolificid: prolific_userid, studyid: prolific_studyid, sessionid: prolific_sessionid } = await request.json()
		const parseResult = studySchema.safeParse({ prolific_userid, prolific_studyid, prolific_sessionid })
		if (!parseResult.success) {
			return responseFailed({}, "Failed to parse prolificid, studyid, sessionid", 400, corsHeaders)
		}

		const study = await db.prepare("SELECT * FROM studies WHERE status = 'new' OR status = 'uncomplete'").first()

		if (!study || study.length === 0) {
			return responseFailed({}, "No studies found", 404, corsHeaders)
		}

		if (study.length === 0) {
			return responseSuccess({ state: "full" }, "All study is complete", 404, corsHeaders)
		}

		const res = await db
			.prepare(
				`UPDATE studies
			SET status = 'started', time_start = CURRENT_TIMESTAMP, prolific_userid = ?, prolific_studyid = ?, prolific_sessionid = ?
			WHERE id = ?`
			)
			.bind(prolific_userid, prolific_studyid, prolific_sessionid, study.id)
			.run()
		if (!res) {
			console.log("Response", res)
			return responseFailed({}, "Failed to update study", 404, corsHeaders)
		}

		// const pages = await fetchPagesForStudy(db, study.id)
		// if (!pages) {
		// 	return responseFailed(null, "Failed to fetch pages", 404, corsHeaders)
		// }

		// const pagesWithVideos = await fetchVideosForPages(db, pages)
		// if (!pagesWithVideos) {
		// 	return responseFailed(null, "Failed to fetch videos", 404, corsHeaders)
		// }

		// return responseSuccess(
		// 	{
		// 		...study,
		// 		pages: pagesWithVideos,
		// 	},
		// 	"Fetch studies success",
		// 	corsHeaders
		// )
		return responseSuccess({ state: "success", code: study.id }, "Start study success", corsHeaders)
	} catch (err) {
		console.error("Exception:", err)
		return responseError(err, err.message || "An unknown error occurred", 500, corsHeaders)
	}
}

async function fetchPagesForStudy(db, studyid) {
	const { results: pages } = await db.prepare("SELECT * FROM pages WHERE studyid = ?").bind(studyid).run()

	if (!pages || pages.length === 0) {
		throw new Error("No pages found")
	}

	return pages
}

async function fetchVideosForPages(db, pages) {
	// Extract unique video IDs from pages
	const videoIds = [...new Set(pages.flatMap((page) => [page.video1, page.video2]))]

	if (videoIds.length === 0) {
		throw new Error("No video IDs found in pages")
	}

	// Fetch all videos in a single query
	const { results: videoResults } = await db
		.prepare(`SELECT * FROM videos WHERE id IN (${videoIds.map(() => "?").join(",")})`)
		.bind(...videoIds)
		.run()

	if (!videoResults || videoResults.length === 0) {
		throw new Error("No videos found")
	}

	// Create a video dictionary for quick lookup
	const videoDict = videoResults.reduce((acc, video) => {
		acc[video.id] = video
		return acc
	}, {})

	// Map pages with their corresponding videos
	const pagesWithVideos = pages.map((page) => ({
		...page,
		options: JSON.parse(JSON.parse(page.options)),
		video1: videoDict[page.video1],
		video2: videoDict[page.video2],
	}))

	return pagesWithVideos
}

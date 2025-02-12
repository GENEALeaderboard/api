import { firstPage, lastPage } from "@/config/constant"
import { responseError, responseFailed, responseSuccess } from "../response"
import { z } from "zod"

const studySchema = z.object({
	prolific_userid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid PROLIFIC_PID format" }),
	prolific_studyid: z.string().regex(/^[a-f0-9]{24}$/, { message: "Invalid STUDY_ID format" }),
	prolific_sessionid: z.string().regex(/^[a-zA-Z0-9]+$/, { message: "Invalid SESSION_ID format" }),
})

export async function fetchStudy(request, db, corsHeaders) {
	try {
		const url = new URL(request.url)
		console.log("url", JSON.stringify(url))
		const prolific_userid = url.searchParams.get("prolificid") || ""
		const prolific_studyid = url.searchParams.get("studyid") || ""
		const prolific_sessionid = url.searchParams.get("sessionid") || ""
		const studyid = url.searchParams.get("code") || ""
		const parseResult = studySchema.safeParse({ prolific_userid, prolific_studyid, prolific_sessionid })
		if (!parseResult.success) {
			console.log("prolific_userid", prolific_userid, "prolific_studyid", prolific_studyid, "prolific_sessionid", prolific_sessionid)
			return responseFailed(null, "Failed to parse prolificid, studyid, sessionid", 400, corsHeaders)
		}

		const { results } = await db.prepare("SELECT * FROM studies WHERE status = 'started' AND id =? ").bind(studyid).run()

		if (!results || results.length === 0) {
			return responseFailed(null, "No studies found", 404, corsHeaders)
		}
		const study = results[0]

		const pages = await fetchPagesForStudy(db, study.id)
		if (!pages || pages.length === 0) {
			console.log("pages", JSON.stringify(pages))
			return responseFailed(null, "No pages found", 404, corsHeaders)
		}
		const pagesWithVideos = await fetchVideosForPages(db, pages)
		if (!pagesWithVideos || pagesWithVideos.length === 0) {
			console.log("pagesWithVideos", JSON.stringify(pagesWithVideos))
			return responseFailed(null, "No videos found", 404, corsHeaders)
		}

		pagesWithVideos.unshift(firstPage)
		pagesWithVideos.push(lastPage)

		return responseSuccess(
			{
				study: study,
				pages: pagesWithVideos,
			},
			"Fetch studies success",
			corsHeaders
		)
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

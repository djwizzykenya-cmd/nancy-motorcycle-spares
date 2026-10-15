import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const secretHeader = req.headers["x-revalidate-secret"] || req.query.secret || req.body?.secret;
  const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ success: false, message: "Invalid revalidate secret" });
  }

  const paths = req.body?.paths;
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ success: false, message: "Request must include `paths` array in the body" });
  }

  try {
    for (const p of paths) {
      // `res.revalidate` is available in Next.js pages API routes for on-demand revalidation
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await res.revalidate(p);
    }

    return res.json({ success: true, revalidated: paths });
  } catch (error) {
    console.error("Failed to revalidate paths:", error);
    return res.status(500).json({ success: false, message: "Revalidation failed" });
  }
}

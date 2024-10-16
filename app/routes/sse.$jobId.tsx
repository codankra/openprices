import type { LoaderFunction } from "@remix-run/node";
import { auth } from "~/services/auth.server";
import { getJobMetadata, jobEventEmitter } from "~/services/job.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await auth.isAuthenticated(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const { jobId } = params;
  const jobMetadata = getJobMetadata(jobId || "");

  if (!jobMetadata || jobMetadata.userId !== user.id) {
    throw new Response("Forbidden", { status: 403 });
  }

  return new Response(
    new ReadableStream({
      start(controller) {
        const listener = (event: string) => {
          if (event.startsWith(`job-${jobId}`)) {
            controller.enqueue(
              `data: ${event.split(":").slice(1).join(":")}\n\n`
            );
          }
        };

        jobEventEmitter.on("job-update", listener);

        return () => {
          jobEventEmitter.off("job-update", listener);
        };
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
};

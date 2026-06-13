import type { GithubClient } from "../client.js";
import { repoApiBase } from "../client.js";
import type { WorkflowRun } from "./workflow-run.js";

type WorkflowRunsResponse = {
  total_count: number;
  workflow_runs: WorkflowRun[];
};

type WorkflowListResponse = {
  total_count: number;
  workflows: Array<{ id: number; name: string; path: string }>;
};

export type GetLatestRunOptions = {
  workflow: string;
  branch?: string | undefined;
};

async function resolveWorkflowId(
  client: GithubClient,
  workflowFile: string,
): Promise<number> {
  const response = await client.getJson<WorkflowListResponse>(
    `${repoApiBase(client)}/actions/workflows`,
  );
  const normalized = workflowFile.replace(/^\.\//, "");
  const match = response.workflows.find(
    (workflow) =>
      workflow.path === normalized ||
      workflow.path.endsWith(`/${normalized}`) ||
      workflow.path === `.github/workflows/${normalized}`,
  );
  if (match === undefined) {
    throw new Error(
      `workflow "${workflowFile}" not found in ${client.org}/${client.repo}`,
    );
  }
  return match.id;
}

/** Fetch the most recent successful workflow run for a workflow file. */
export async function getLatestRun(
  client: GithubClient,
  options: GetLatestRunOptions,
): Promise<WorkflowRun> {
  const workflowId = await resolveWorkflowId(client, options.workflow);
  const params = new URLSearchParams({
    per_page: "20",
    status: "completed",
    conclusion: "success",
  });
  if (options.branch !== undefined && options.branch.length > 0) {
    params.set("branch", options.branch);
  }
  const response = await client.getJson<WorkflowRunsResponse>(
    `${repoApiBase(client)}/actions/workflows/${workflowId}/runs?${params}`,
  );
  const [run] = response.workflow_runs;
  if (run === undefined) {
    const branchHint =
      options.branch !== undefined ? ` on branch ${options.branch}` : "";
    throw new Error(
      `no successful runs found for workflow ${options.workflow}${branchHint}`,
    );
  }
  return run;
}

/** Fetch a workflow run by database id. */
export async function getRunById(
  client: GithubClient,
  runId: string,
): Promise<WorkflowRun> {
  return client.getJson<WorkflowRun>(
    `${repoApiBase(client)}/actions/runs/${runId}`,
  );
}

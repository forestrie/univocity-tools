export type WorkflowRun = {
  id: number;
  name: string;
  head_branch: string | null;
  conclusion: string | null;
  status: string;
  workflow_id: number;
};
